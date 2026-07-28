/**
 * Subscription read + action API.
 *
 * Reads go through `get_my_subscription_overview` (one round trip for plan
 * state, credits, and prices). Writes go through the Stripe edge functions,
 * which re-validate the requested action against the stored state.
 */
import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionErrorMessage } from "@/lib/supabase/edgeFunctionErrors";
import { callRpc } from "@/lib/supabase/rpc";
import {
  loadSubscriptionEntitlement,
  resolveCurrentTier,
} from "@/lib/settings/subscriptionEntitlementApi";
import { TIER } from "@/lib/enums/tier";
import {
  CREDITS_PER_ONE_ON_ONE_SESSION,
  FREE_SUBSCRIPTION_RECORD,
  normalizeStatus,
  normalizeTier,
  type BillingInterval,
  type PaidTier,
  type PlanPrice,
  type SubscriptionOverview,
  type SubscriptionRecord,
} from "@/lib/subscription/subscriptionState";

export const SUBSCRIPTION_ERROR_MESSAGES = {
  generic: "We couldn't update your subscription. Please try again.",
  payment: "We couldn't process your payment. Please check your payment method and try again.",
  cancel: "We couldn't cancel your subscription. Your current plan is still active. Please try again.",
  downgrade: "We couldn't schedule your downgrade. Your Premium subscription has not been changed.",
  checkout: "We couldn't start checkout. Please try again.",
  portal: "We couldn't open your billing portal. Please try again.",
} as const;

export function resumeErrorMessage(expiresAtLabel: string | null): string {
  return expiresAtLabel
    ? `We couldn't resume your subscription. Please try again before your subscription expires on ${expiresAtLabel}.`
    : "We couldn't resume your subscription. Please try again before your subscription expires.";
}

function parseBoolean(value: unknown): boolean {
  return value === true;
}

/** Until overview RPC exposes `hasStripeSubscription`, infer Stripe-managed paid rows. */
function resolveHasStripeSubscription(row: Record<string, unknown>): boolean {
  if (row.hasStripeSubscription !== undefined) {
    return parseBoolean(row.hasStripeSubscription);
  }

  const planTier = normalizeTier(parseString(row.planTier));
  if (planTier !== TIER.PRO && planTier !== TIER.PREMIUM) return false;
  if (!parseBoolean(row.hasPaymentMethodOnFile)) return false;
  if (!parseString(row.currentPeriodEnd)) return false;

  const status = normalizeStatus(parseString(row.status));
  switch (status) {
    case "active":
    case "scheduledToCancel":
    case "scheduledToDowngrade":
    case "pastDue":
      return true;
    case "free":
    case "inactive":
      return false;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function parseString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function parseSubscriptionRecord(raw: unknown): SubscriptionRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  return {
    planTier: normalizeTier(parseString(row.planTier)) ?? TIER.FREE,
    status: normalizeStatus(parseString(row.status)),
    billingInterval:
      row.billingInterval === "month" || row.billingInterval === "year"
        ? row.billingInterval
        : null,
    currentPeriodStart: parseString(row.currentPeriodStart),
    currentPeriodEnd: parseString(row.currentPeriodEnd),
    cancelAtPeriodEnd: parseBoolean(row.cancelAtPeriodEnd),
    scheduledDowngradeTier: normalizeTier(parseString(row.scheduledDowngradeTier)),
    scheduledDowngradeEffectiveAt: parseString(row.scheduledDowngradeEffectiveAt),
    isFoundingMember: parseBoolean(row.isFoundingMember),
    foundingStartedAt: parseString(row.foundingStartedAt),
    foundingDiscountEndsAt: parseString(row.foundingDiscountEndsAt),
    foundingDiscountForfeitedAt: parseString(row.foundingDiscountForfeitedAt),
    gracePeriodEndsAt: parseString(row.gracePeriodEndsAt),
    hasPaymentMethodOnFile: parseBoolean(row.hasPaymentMethodOnFile),
    hasStripeSubscription: resolveHasStripeSubscription(row),
  };
}

function parsePlanPrices(raw: unknown): PlanPrice[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const tierSlug = row.tierSlug;
    const billingInterval = row.billingInterval;
    if (tierSlug !== "pro" && tierSlug !== "premium") return [];
    if (billingInterval !== "month" && billingInterval !== "year") return [];

    return [
      {
        tierSlug: tierSlug as PaidTier,
        billingInterval: billingInterval as BillingInterval,
        amountCents: typeof row.amountCents === "number" ? row.amountCents : null,
        currency: parseString(row.currency) ?? "usd",
        isFoundingRate: parseBoolean(row.isFoundingRate),
        isActive: parseBoolean(row.isActive),
      },
    ];
  });
}

export function parseSubscriptionOverview(raw: unknown): SubscriptionOverview {
  const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const credits = (row.credits ?? {}) as Record<string, unknown>;

  return {
    accountType: row.accountType === "enterprise" ? "enterprise" : "individual",
    enterpriseTier: normalizeTier(parseString(row.enterpriseTier)),
    effectiveTier: normalizeTier(parseString(row.effectiveTier)) ?? TIER.FREE,
    subscription: parseSubscriptionRecord(row.subscription),
    credits: {
      balance: typeof credits.balance === "number" ? credits.balance : 0,
      requiredPerSession:
        typeof credits.requiredPerSession === "number" ? credits.requiredPerSession : 2,
    },
    prices: parsePlanPrices(row.prices),
    foundingSlotsRemaining:
      typeof row.foundingSlotsRemaining === "number" ? row.foundingSlotsRemaining : 0,
  };
}

function isSubscriptionOverviewRpcUnavailable(
  error: { code?: string; message?: string } | null,
): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = error.message?.toLowerCase() ?? "";
  return (
    code === "PGRST202" ||
    code === "42883" ||
    message.includes("could not find the function") ||
    message.includes("function public.get_my_subscription_overview") ||
    (message.includes("not found") && message.includes("get_my_subscription_overview"))
  );
}

/**
 * When billing migrations are not applied yet, build a read-only overview from
 * `profiles` so Settings → Subscription and upsell surfaces still render.
 */
async function loadSubscriptionOverviewFromProfile(): Promise<SubscriptionOverview> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Couldn't load your subscription details.");

  const entitlement = await loadSubscriptionEntitlement(user.id);
  const effectiveTier = resolveCurrentTier(entitlement);

  return {
    accountType: entitlement.accountType ?? "individual",
    enterpriseTier: normalizeTier(entitlement.enterpriseTier),
    effectiveTier,
    subscription: null,
    credits: {
      balance: 0,
      requiredPerSession: CREDITS_PER_ONE_ON_ONE_SESSION,
    },
    prices: [],
    foundingSlotsRemaining: 0,
  };
}

export async function loadSubscriptionOverview(): Promise<SubscriptionOverview> {
  const { data, error } = await callRpc("get_my_subscription_overview");
  if (!error) return parseSubscriptionOverview(data);
  if (isSubscriptionOverviewRpcUnavailable(error)) {
    return loadSubscriptionOverviewFromProfile();
  }
  throw new Error("Couldn't load your subscription details.");
}

/** The record to render — falls back to a Free record for never-subscribed users. */
export function subscriptionRecordOf(overview: SubscriptionOverview): SubscriptionRecord {
  return overview.subscription ?? FREE_SUBSCRIPTION_RECORD;
}

export type CheckoutResult =
  | { status: "redirect"; url: string }
  | {
      status: "already_subscribed";
      message: string;
      overview: SubscriptionOverview | null;
    }
  | { status: "blocked"; message: string };

export async function syncBillingFromStripe(): Promise<SubscriptionOverview> {
  const { data, error } = await supabase.functions.invoke("stripe-subscription", {
    body: { action: "sync" },
  });
  const payload = data as { status?: string; overview?: unknown } | null;
  if (payload?.status === "ok" && payload.overview) {
    return parseSubscriptionOverview(payload.overview);
  }
  throw new Error(getEdgeFunctionErrorMessage(data, error, SUBSCRIPTION_ERROR_MESSAGES.generic));
}

const CHECKOUT_RECONCILE_DELAYS_MS = [0, 1200, 2500, 4000] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * After Stripe Checkout redirect, pull subscription state from Stripe when a
 * webhook hasn't reached the project yet (typical on localhost).
 * For Premium, also wait for the first credit when sync can grant it.
 */
export async function reconcileCheckoutReturn(
  expectedTier: PaidTier | null,
): Promise<SubscriptionOverview> {
  let overview = await loadSubscriptionOverview();

  for (const delayMs of CHECKOUT_RECONCILE_DELAYS_MS) {
    if (delayMs > 0) await sleep(delayMs);

    try {
      overview = await syncBillingFromStripe();
    } catch {
      // Customer/subscription may not be visible to Stripe for a moment after redirect.
    }

    if (overview.effectiveTier === TIER.FREE) continue;
    if (expectedTier && overview.effectiveTier !== expectedTier) continue;

    if (overview.effectiveTier === TIER.PREMIUM && overview.credits.balance < 1) {
      continue;
    }

    return overview;
  }

  return overview;
}

export async function startCheckout(
  tier: PaidTier,
  interval: BillingInterval,
): Promise<CheckoutResult> {
  const { data, error } = await supabase.functions.invoke("stripe-checkout", {
    body: { tier, interval },
  });

  const payload = data as {
    status?: string;
    url?: string;
    message?: string;
    overview?: unknown;
  } | null;
  if (payload?.status === "ok" && payload.url) {
    return { status: "redirect", url: payload.url };
  }

  if (payload?.status === "already_subscribed") {
    return {
      status: "already_subscribed",
      message: getEdgeFunctionErrorMessage(data, error, SUBSCRIPTION_ERROR_MESSAGES.checkout),
      overview: payload.overview ? parseSubscriptionOverview(payload.overview) : null,
    };
  }

  return {
    status: "blocked",
    message: getEdgeFunctionErrorMessage(data, error, SUBSCRIPTION_ERROR_MESSAGES.checkout),
  };
}

export async function openBillingPortal(): Promise<string> {
  const { data, error } = await supabase.functions.invoke("stripe-portal", { body: {} });
  const payload = data as { status?: string; url?: string } | null;

  if (payload?.status !== "ok" || !payload.url) {
    throw new Error(getEdgeFunctionErrorMessage(data, error, SUBSCRIPTION_ERROR_MESSAGES.portal));
  }
  return payload.url;
}

export type SubscriptionActionName =
  | "cancel"
  | "resume"
  | "scheduleDowngrade"
  | "cancelDowngrade"
  | "confirmUpgrade";

export type SubscriptionActionResult = {
  activeUntil?: string | null;
  effectiveAt?: string | null;
  nextRenewalAt?: string | null;
  alreadyPremium?: boolean;
  overview: SubscriptionOverview | null;
};

async function invokeSubscriptionAction(
  action: SubscriptionActionName | "previewUpgrade",
  fallbackMessage: string,
): Promise<{ payload: Record<string, unknown>; }> {
  const { data, error } = await supabase.functions.invoke("stripe-subscription", {
    body: { action },
  });

  const payload = (data ?? {}) as Record<string, unknown>;
  if (payload.status !== "ok") {
    throw new Error(getEdgeFunctionErrorMessage(data, error, fallbackMessage));
  }
  return { payload };
}

export async function runSubscriptionAction(
  action: SubscriptionActionName,
  fallbackMessage = SUBSCRIPTION_ERROR_MESSAGES.generic,
): Promise<SubscriptionActionResult> {
  const { payload } = await invokeSubscriptionAction(action, fallbackMessage);

  return {
    activeUntil: parseString(payload.activeUntil),
    effectiveAt: parseString(payload.effectiveAt),
    nextRenewalAt: parseString(payload.nextRenewalAt),
    alreadyPremium: parseBoolean(payload.alreadyPremium),
    overview: payload.overview ? parseSubscriptionOverview(payload.overview) : null,
  };
}

export type UpgradePreview = {
  currency: string;
  amountDueCents: number;
  taxCents: number;
  remainingBalanceCents: number;
  premiumAmountCents: number | null;
  billingInterval: BillingInterval;
  nextRenewalAt: string | null;
};

/** Proration figures for the Pro → Premium confirmation, straight from Stripe. */
export async function previewPremiumUpgrade(): Promise<UpgradePreview> {
  const { payload } = await invokeSubscriptionAction(
    "previewUpgrade",
    SUBSCRIPTION_ERROR_MESSAGES.generic,
  );

  return {
    currency: parseString(payload.currency) ?? "usd",
    amountDueCents: typeof payload.amountDueCents === "number" ? payload.amountDueCents : 0,
    taxCents: typeof payload.taxCents === "number" ? payload.taxCents : 0,
    remainingBalanceCents:
      typeof payload.remainingBalanceCents === "number" ? payload.remainingBalanceCents : 0,
    premiumAmountCents:
      typeof payload.premiumAmountCents === "number" ? payload.premiumAmountCents : null,
    billingInterval: payload.billingInterval === "year" ? "year" : "month",
    nextRenewalAt: parseString(payload.nextRenewalAt),
  };
}

export type CreditLedgerEntry = {
  id: string;
  delta: number;
  reason: string;
  note: string | null;
  createdAt: string;
};

export async function loadPremiumCreditHistory(limit = 20): Promise<CreditLedgerEntry[]> {
  const { data, error } = await callRpc("list_my_premium_credit_history", {
    p_limit: limit,
  });
  if (error) throw new Error("Couldn't load your credit history.");
  if (!Array.isArray(data)) return [];

  return data.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    return [
      {
        id: parseString(row.id) ?? "",
        delta: typeof row.delta === "number" ? row.delta : 0,
        reason: parseString(row.reason) ?? "",
        note: parseString(row.note),
        createdAt: parseString(row.createdAt) ?? "",
      },
    ];
  });
}
