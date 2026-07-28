/**
 * Which subscription actions are valid for a given state, and what each plan
 * card should offer.
 *
 * Kept in parity with `supabase/functions/_shared/subscriptionActions.ts`: the
 * UI enables only valid buttons and the edge function re-validates, so a stale
 * tab cannot cancel twice or stack a downgrade on a scheduled cancellation.
 */
import { TIER, type TierSlug } from "@/lib/enums/tier";
import { formatSubscriptionDate } from "@/lib/subscription/subscriptionFormat";
import { proPlanBeginsMessage } from "@/lib/subscription/subscriptionCopy";
import {
  normalizeStatus,
  normalizeTier,
  resolveEffectiveTier,
  type SubscriptionRecord,
} from "@/lib/subscription/subscriptionState";

export type SubscriptionAction =
  | "cancel"
  | "resume"
  | "scheduleDowngrade"
  | "cancelDowngrade"
  | "upgradeToPremium"
  | "startCheckout"
  | "updatePaymentMethod";

export type SubscriptionActionContext = {
  record: SubscriptionRecord | null;
  accountType?: string | null;
};

export function resolveAllowedActions(
  ctx: SubscriptionActionContext,
  nowMs = Date.now(),
): SubscriptionAction[] {
  // Enterprise entitlement is contract-based: no self-serve billing actions.
  if ((ctx.accountType ?? "").toLowerCase() === "enterprise") return [];

  const record = ctx.record;
  if (!record) return ["startCheckout"];

  const status = normalizeStatus(record.status);
  const effectiveTier = resolveEffectiveTier(record, nowMs);
  const planTier = normalizeTier(record.planTier) ?? TIER.FREE;
  const actions: SubscriptionAction[] = [];

  if (effectiveTier === TIER.FREE) {
    actions.push("startCheckout");
    if (record.hasPaymentMethodOnFile) actions.push("updatePaymentMethod");
    return actions;
  }

  if (record.hasPaymentMethodOnFile) actions.push("updatePaymentMethod");

  switch (status) {
    case "active":
      actions.push("cancel");
      if (planTier === TIER.PREMIUM) actions.push("scheduleDowngrade");
      else if (record.hasStripeSubscription) actions.push("upgradeToPremium");
      else actions.push("startCheckout");
      break;
    case "pastDue":
      // Recovery first: no plan changes while the charge is unresolved.
      actions.push("cancel");
      break;
    case "scheduledToCancel":
      actions.push("resume");
      if (
        planTier !== TIER.PREMIUM &&
        effectiveTier === TIER.PRO &&
        record.hasStripeSubscription
      ) {
        actions.push("upgradeToPremium");
      }
      break;
    case "scheduledToDowngrade":
      actions.push("cancelDowngrade");
      break;
    case "free":
    case "inactive":
      actions.push("startCheckout");
      break;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }

  return actions;
}

export function isActionAllowed(
  action: SubscriptionAction,
  ctx: SubscriptionActionContext,
  nowMs = Date.now(),
): boolean {
  return resolveAllowedActions(ctx, nowMs).includes(action);
}

/**
 * What a single plan card offers. `none` renders no button at all — the Free
 * card must not be selectable while a paid plan is active, because cancelling
 * is the only way back to Free.
 */
export type PlanCardAction =
  | { kind: "currentPlan" }
  | { kind: "none" }
  | { kind: "upgrade"; targetTier: TierSlug; label: string }
  | { kind: "upgradeToPremium"; label: string }
  | { kind: "cancel"; label: string }
  | { kind: "resume"; label: string }
  | { kind: "downgradeToPro"; label: string }
  | { kind: "keepPremium"; label: string }
  | { kind: "futurePlan"; label: string };

export type PlanCardStateInput = {
  cardTier: TierSlug;
  record: SubscriptionRecord | null;
  accountType?: string | null;
  nowMs?: number;
};

export type PlanCardState = {
  isCurrent: boolean;
  primary: PlanCardAction;
  secondary: PlanCardAction | null;
};

function upgradeLabel(tier: TierSlug): string {
  return tier === TIER.PREMIUM ? "Upgrade to Premium" : "Upgrade to Pro";
}

/**
 * Card layout for every documented state: Free, Pro, Premium, Founding Member,
 * scheduled-to-cancel, scheduled-to-downgrade, and past due.
 */
export function resolvePlanCardState(input: PlanCardStateInput): PlanCardState {
  const nowMs = input.nowMs ?? Date.now();
  const record = input.record;
  const effectiveTier = record ? resolveEffectiveTier(record, nowMs) : TIER.FREE;
  const status = normalizeStatus(record?.status);
  const isCurrent = input.cardTier === effectiveTier;

  if ((input.accountType ?? "").toLowerCase() === "enterprise") {
    return { isCurrent, primary: { kind: isCurrent ? "currentPlan" : "none" }, secondary: null };
  }

  if (input.cardTier === TIER.FREE) {
    // No selectable button on Free: cancellation is the route back.
    return { isCurrent, primary: { kind: isCurrent ? "currentPlan" : "none" }, secondary: null };
  }

  if (!isCurrent) {
    // The plan the user is scheduled to move to shows its start date instead.
    if (
      status === "scheduledToDowngrade" &&
      record?.scheduledDowngradeTier === input.cardTier
    ) {
      const begins =
        formatSubscriptionDate(record.scheduledDowngradeEffectiveAt) ??
        "your downgrade date";
      return {
        isCurrent: false,
        primary: { kind: "futurePlan", label: proPlanBeginsMessage(begins) },
        secondary: null,
      };
    }

    if (input.cardTier === TIER.PREMIUM && effectiveTier === TIER.PRO) {
      const ctx: SubscriptionActionContext = {
        record,
        accountType: input.accountType,
      };
      if (isActionAllowed("upgradeToPremium", ctx, nowMs)) {
        return {
          isCurrent: false,
          primary: { kind: "upgradeToPremium", label: upgradeLabel(TIER.PREMIUM) },
          secondary: null,
        };
      }
      if (isActionAllowed("startCheckout", ctx, nowMs)) {
        return {
          isCurrent: false,
          primary: { kind: "upgrade", targetTier: TIER.PREMIUM, label: upgradeLabel(TIER.PREMIUM) },
          secondary: null,
        };
      }
      return { isCurrent: false, primary: { kind: "none" }, secondary: null };
    }

    if (effectiveTier === TIER.FREE) {
      return {
        isCurrent: false,
        primary: { kind: "upgrade", targetTier: input.cardTier, label: upgradeLabel(input.cardTier) },
        secondary: null,
      };
    }

    // Premium user looking at the Pro card.
    if (input.cardTier === TIER.PRO && effectiveTier === TIER.PREMIUM) {
      return {
        isCurrent: false,
        primary:
          status === "active"
            ? { kind: "downgradeToPro", label: "Downgrade to Pro" }
            : { kind: "none" },
        secondary: null,
      };
    }

    return { isCurrent: false, primary: { kind: "none" }, secondary: null };
  }

  // The current paid plan.
  switch (status) {
    case "scheduledToCancel":
      return {
        isCurrent: true,
        primary: { kind: "resume", label: "Resume subscription" },
        secondary: null,
      };
    case "scheduledToDowngrade":
      return {
        isCurrent: true,
        primary: { kind: "keepPremium", label: "Keep Premium" },
        secondary: null,
      };
    case "active":
    case "pastDue":
      return {
        isCurrent: true,
        primary: { kind: "cancel", label: "Cancel subscription" },
        secondary: null,
      };
    case "free":
    case "inactive":
      return { isCurrent: true, primary: { kind: "currentPlan" }, secondary: null };
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

/** Loading labels while an action is in flight. */
export const ACTION_PENDING_LABELS: Record<SubscriptionAction, string> = {
  cancel: "Canceling…",
  resume: "Resuming…",
  scheduleDowngrade: "Scheduling downgrade…",
  cancelDowngrade: "Updating…",
  upgradeToPremium: "Upgrading…",
  startCheckout: "Processing payment…",
  updatePaymentMethod: "Opening…",
};
