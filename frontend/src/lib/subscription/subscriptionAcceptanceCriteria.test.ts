/**
 * The 28 acceptance criteria from
 * `docs/Unclouded _ Individual Subscription Management Flow.md`, one test each.
 *
 * Client-side rules are asserted against the resolvers the UI actually calls.
 * Server-enforced rules (credit accrual, redemption, the 100-slot cap, backend
 * validation) are asserted against the migration text, matching the convention
 * in `subscriptionEntitlement.test.ts`; the runnable end-to-end checks live in
 * `supabase/tests/premium_credits_and_subscription_proof.sql`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { TIER } from "@/lib/enums/tier";
import {
  canBookGroupCoachSession,
  resolveOneOnOneButtonState,
  shouldShowHumanCoachingCard,
} from "@/lib/coach/coachBookingEntitlements";
import {
  ACTION_PENDING_LABELS,
  resolveAllowedActions,
  resolvePlanCardState,
} from "@/lib/subscription/subscriptionActions";
import {
  cancelDialogCopy,
  downgradeDialogCopy,
  foundingPricingNotice,
  FOUNDING_TO_PREMIUM_DIALOG_COPY,
  PRO_TO_PREMIUM_DIALOG_COPY,
  UPGRADE_PAYMENT_FAILED_MESSAGE,
} from "@/lib/subscription/subscriptionCopy";
import {
  lockedFeature,
  shouldShowUpsell,
  upsellPlansFor,
} from "@/lib/subscription/lockedFeatureUpsell";
import {
  CREDITS_PER_ONE_ON_ONE_SESSION,
  FREE_SUBSCRIPTION_RECORD,
  resolveCreditsExpireAt,
  resolveEffectiveTier,
  resolveNextCreditAt,
  resolveNextRenewalAt,
  type SubscriptionRecord,
} from "@/lib/subscription/subscriptionState";

const MIGRATIONS = resolve(import.meta.dirname, "../../../../supabase/migrations");

function migration(name: string): string {
  return readFileSync(resolve(MIGRATIONS, name), "utf8");
}

/** Body of one SQL function, so assertions can't drift into a neighbour. */
function functionBody(sql: string, name: string): string {
  const start = sql.indexOf(`FUNCTION public.${name}(`);
  expect(start, `${name} not found`).toBeGreaterThan(-1);
  const end = sql.indexOf("\n$$;", start);
  expect(end, `${name} body not terminated`).toBeGreaterThan(start);
  return sql.slice(start, end);
}

const LIFECYCLE_SQL = migration("20260727100000_individual_subscription_lifecycle.sql");
const RPCS_SQL = migration("20260727110000_billing_subscription_rpcs.sql");
const BOOKINGS_SQL = migration("20260727120000_premium_credits_and_bookings.sql");
const CRON_SQL = migration("20260727130000_subscription_lifecycle_cron.sql");
const ENFORCEMENT_SQL = migration("20260727140000_paid_feature_server_enforcement.sql");

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 6, 27);

function record(overrides: Partial<SubscriptionRecord>): SubscriptionRecord {
  return { ...FREE_SUBSCRIPTION_RECORD, ...overrides };
}

const activePro = record({
  planTier: TIER.PRO,
  status: "active",
  billingInterval: "month",
  currentPeriodEnd: new Date(NOW + 20 * DAY).toISOString(),
  hasPaymentMethodOnFile: true,
  hasStripeSubscription: true,
});

const activePremium = record({
  planTier: TIER.PREMIUM,
  status: "active",
  billingInterval: "month",
  currentPeriodEnd: new Date(NOW + 20 * DAY).toISOString(),
  hasPaymentMethodOnFile: true,
  hasStripeSubscription: true,
});

describe("AC-1 a Free user can upgrade directly to Pro or Premium", () => {
  it("offers checkout on both paid cards", () => {
    expect(resolveAllowedActions({ record: null }, NOW)).toContain("startCheckout");

    for (const cardTier of [TIER.PRO, TIER.PREMIUM] as const) {
      expect(resolvePlanCardState({ cardTier, record: null, nowMs: NOW }).primary).toEqual({
        kind: "upgrade",
        targetTier: cardTier,
        label: cardTier === TIER.PREMIUM ? "Upgrade to Premium" : "Upgrade to Pro",
      });
    }
  });
});

describe("AC-2 a locked feature prompt shows only the relevant plans", () => {
  it("offers both plans for a Pro feature and only Premium for a Premium feature", () => {
    expect(upsellPlansFor("chatSessionLimit", TIER.FREE)).toEqual([TIER.PRO, TIER.PREMIUM]);
    expect(upsellPlansFor("oneOnOneSession", TIER.FREE)).toEqual([TIER.PREMIUM]);
    expect(upsellPlansFor("premiumPath", TIER.FREE)).toEqual([TIER.PRO, TIER.PREMIUM]);
    expect(upsellPlansFor("premiumPath", TIER.PRO)).toEqual([TIER.PREMIUM]);
  });

  it("never upsells a user who already has the feature", () => {
    expect(shouldShowUpsell("proPath", TIER.PRO)).toBe(false);
    expect(shouldShowUpsell("oneOnOneSession", TIER.PREMIUM)).toBe(false);
    expect(upsellPlansFor("proPath", TIER.PREMIUM)).toEqual([]);
  });

  it("uses spec copy for locked-feature upsells", () => {
    expect(lockedFeature("oneOnOneSession").title).toBe("Unlock 1:1 Sessions");
    expect(lockedFeature("premiumPath").description).toBe(
      "Upgrade to Pro or Premium to unlock this path and access the full premium path library.",
    );
    expect(lockedFeature("reassessment").description).toBe(
      "Upgrade to Pro or Premium to complete your reassessment and review your progress.",
    );
    expect(lockedFeature("groupSession").description).toBe(
      "Upgrade to Pro or Premium to access one group session per month.",
    );
    expect(lockedFeature("oneOnOneSession").description).toBe(
      `Upgrade to Premium to earn monthly credits and book 30-minute 1:1 sessions. ${CREDITS_PER_ONE_ON_ONE_SESSION} credits are required for one session.`,
    );
  });
});

describe("AC-3 a Pro user can upgrade to Premium immediately", () => {
  it("offers the upgrade from the Premium card", () => {
    expect(resolveAllowedActions({ record: activePro }, NOW)).toContain("upgradeToPremium");
    expect(
      resolvePlanCardState({ cardTier: TIER.PREMIUM, record: activePro, nowMs: NOW }).primary,
    ).toEqual({ kind: "upgradeToPremium", label: "Upgrade to Premium" });
  });

  it("does not offer in-app upgrade while payment is past due", () => {
    const pastDue = record({
      ...activePro,
      status: "pastDue",
      gracePeriodEndsAt: new Date(NOW + 7 * DAY).toISOString(),
    });
    expect(
      resolvePlanCardState({ cardTier: TIER.PREMIUM, record: pastDue, nowMs: NOW }).primary,
    ).toEqual({ kind: "none" });
  });

  it("offers checkout when Pro is active but not Stripe-managed", () => {
    const legacyPro = record({
      ...activePro,
      hasStripeSubscription: false,
      hasPaymentMethodOnFile: false,
    });
    expect(resolveAllowedActions({ record: legacyPro }, NOW)).toContain("startCheckout");
    expect(resolveAllowedActions({ record: legacyPro }, NOW)).not.toContain("upgradeToPremium");
    expect(
      resolvePlanCardState({ cardTier: TIER.PREMIUM, record: legacyPro, nowMs: NOW }).primary,
    ).toEqual({ kind: "upgrade", targetTier: TIER.PREMIUM, label: "Upgrade to Premium" });
  });

  it("allows in-app Premium upgrade while cancel is scheduled", () => {
    const scheduledCancel = record({ ...activePro, status: "scheduledToCancel" });
    expect(resolveAllowedActions({ record: scheduledCancel }, NOW)).toContain("upgradeToPremium");
    expect(
      resolvePlanCardState({ cardTier: TIER.PREMIUM, record: scheduledCancel, nowMs: NOW })
        .primary,
    ).toEqual({ kind: "upgradeToPremium", label: "Upgrade to Premium" });
  });
});

describe("AC-4 the unused Pro balance is applied to a Pro → Premium upgrade", () => {
  it("promises proration in the confirmation copy and never computes it locally", () => {
    expect(PRO_TO_PREMIUM_DIALOG_COPY.message).toContain("prorate");
    // Amounts come from Stripe's upcoming invoice, not from the app.
    expect(RPCS_SQL).not.toMatch(/amountDueCents/);
  });
});

describe("AC-5 Premium access begins only after successful payment", () => {
  it("activates from the Stripe sync path only, which clients cannot call", () => {
    expect(RPCS_SQL).toMatch(/billing_sync_stripe_subscription/);
    expect(RPCS_SQL).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.billing_sync_stripe_subscription\([\s\S]*?\) TO service_role;/,
    );
    expect(RPCS_SQL).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.billing_sync_stripe_subscription\([\s\S]*?\) TO authenticated;/,
    );
  });
});

describe("AC-6 one credit is added on Premium activation and each renewal", () => {
  it("grants exactly one credit per paid invoice", () => {
    expect(RPCS_SQL).toMatch(/VALUES \(p_user_id, 1, 'accrual', btrim\(p_stripe_invoice_id\)/);
    expect(RPCS_SQL).toMatch(/IF public\.effective_user_tier\(p_user_id\) <> 'premium' THEN/);
  });
});

describe("AC-7 duplicate payment notifications do not add duplicate credits", () => {
  it("is idempotent per invoice, and the webhook is idempotent per event", () => {
    expect(LIFECYCLE_SQL).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS idx_premium_credit_accrual_per_invoice/,
    );
    expect(RPCS_SQL).toMatch(/ON CONFLICT \("userId", "stripeInvoiceId"\)[\s\S]*?DO NOTHING/);
    expect(RPCS_SQL).toMatch(/stripeWebhookEvent/);
  });
});

describe("AC-8 a Premium user can schedule a downgrade to Pro", () => {
  it("offers the downgrade from the Pro card", () => {
    expect(resolveAllowedActions({ record: activePremium }, NOW)).toContain("scheduleDowngrade");
    expect(
      resolvePlanCardState({ cardTier: TIER.PRO, record: activePremium, nowMs: NOW }).primary,
    ).toEqual({ kind: "downgradeToPro", label: "Downgrade to Pro" });
  });

  it("cannot stack a downgrade on a scheduled cancellation", () => {
    expect(LIFECYCLE_SQL).toMatch(/CONSTRAINT user_subscription_single_schedule CHECK \(/);
    const scheduledToCancel = record({ ...activePremium, status: "scheduledToCancel" });
    expect(resolveAllowedActions({ record: scheduledToCancel }, NOW)).not.toContain(
      "scheduleDowngrade",
    );
  });
});

describe("AC-9 a downgrade takes effect at the end of the billing period", () => {
  it("states the effective date and applies the change on that date", () => {
    expect(downgradeDialogCopy("August 26, 2026").message).toContain("August 26, 2026");
    expect(RPCS_SQL).toMatch(/billing_schedule_downgrade/);
    expect(CRON_SQL).toMatch(/'applyDowngrade'/);
  });
});

describe("AC-10 Premium access and credits continue until the effective date", () => {
  it("keeps the Premium tier until the downgrade date passes", () => {
    const scheduled = record({
      ...activePremium,
      status: "scheduledToDowngrade",
      scheduledDowngradeTier: TIER.PRO,
      scheduledDowngradeEffectiveAt: new Date(NOW + 10 * DAY).toISOString(),
    });

    expect(resolveEffectiveTier(scheduled, NOW)).toBe(TIER.PREMIUM);
    expect(resolveEffectiveTier(scheduled, NOW + 11 * DAY)).toBe(TIER.PRO);
    expect(resolveCreditsExpireAt(scheduled)).toBe(scheduled.scheduledDowngradeEffectiveAt);
  });
});

describe("AC-11 unused credits become unavailable when the downgrade takes effect", () => {
  it("expires the balance as part of applying the downgrade", () => {
    expect(RPCS_SQL).toMatch(
      /billing_apply_scheduled_downgrade[\s\S]*?billing_expire_premium_credits/,
    );
  });
});

describe("AC-12 Pro, Premium, and Founding Members can cancel", () => {
  it("offers cancel on every active paid plan", () => {
    for (const paid of [activePro, activePremium]) {
      expect(resolveAllowedActions({ record: paid }, NOW)).toContain("cancel");
    }

    const founding = record({ ...activePro, isFoundingMember: true });
    expect(resolveAllowedActions({ record: founding }, NOW)).toContain("cancel");
    expect(cancelDialogCopy("Founding Member", "August 26, 2026").title).toBe(
      "Cancel Founding Member Subscription?",
    );
  });
});

describe("AC-13 cancellation stops renewal without removing access", () => {
  it("keeps the paid tier until the period ends and drops the renewal date", () => {
    const scheduled = record({
      ...activePro,
      status: "scheduledToCancel",
      cancelAtPeriodEnd: true,
    });

    expect(resolveEffectiveTier(scheduled, NOW)).toBe(TIER.PRO);
    expect(resolveNextRenewalAt(scheduled)).toBeNull();
    expect(resolveEffectiveTier(scheduled, NOW + 21 * DAY)).toBe(TIER.FREE);
  });
});

describe("AC-14 a scheduled-to-cancel user sees Active until [Date]", () => {
  it("carries the date into the cancellation copy", () => {
    expect(cancelDialogCopy("Pro", "August 16, 2026").message).toContain("August 16, 2026");
  });
});

describe("AC-15 a scheduled-to-cancel user can resume before expiration", () => {
  it("offers resume as the only plan action", () => {
    const scheduled = record({
      ...activePro,
      status: "scheduledToCancel",
      cancelAtPeriodEnd: true,
    });

    expect(resolveAllowedActions({ record: scheduled }, NOW)).toContain("resume");
    expect(
      resolvePlanCardState({ cardTier: TIER.PRO, record: scheduled, nowMs: NOW }).primary,
    ).toEqual({ kind: "resume", label: "Resume subscription" });
  });
});

describe("AC-16 resuming preserves the billing cycle and benefits", () => {
  it("only flips the cancellation flag, leaving the billing period untouched", () => {
    const body = functionBody(RPCS_SQL, "billing_set_cancel_at_period_end");
    expect(body).toMatch(/"cancelAtPeriodEnd" = coalesce\(p_cancel, false\)/);
    expect(body).not.toMatch(/"currentPeriodStart" =/);
    expect(body).not.toMatch(/"currentPeriodEnd" =/);
    expect(body).not.toMatch(/billing_expire_premium_credits/);
  });
});

describe("AC-17 resuming Premium preserves accumulated credits", () => {
  it("expires credits only when Premium access actually ends", () => {
    const resumed = record({ ...activePremium, status: "active" });
    expect(resolveCreditsExpireAt(resumed)).toBeNull();
    expect(resolveNextCreditAt(resumed)).toBe(resumed.currentPeriodEnd);
    // The only expiry paths are losing Premium, a downgrade, or an expiry.
    expect(RPCS_SQL).toMatch(
      /IF public\.effective_user_tier\(p_user_id\) <> 'premium' THEN\s*\n\s*PERFORM public\.billing_expire_premium_credits/,
    );
  });
});

describe("AC-18 an expired paid subscription transitions to Free", () => {
  it("resolves to Free past the date, and the cron applies it", () => {
    const lapsed = record({
      ...activePro,
      status: "scheduledToCancel",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date(NOW - DAY).toISOString(),
    });

    expect(resolveEffectiveTier(lapsed, NOW)).toBe(TIER.FREE);
    expect(CRON_SQL).toMatch(/'expireCancellation'/);
    expect(RPCS_SQL).toMatch(/billing_expire_subscription/);
  });
});

describe("AC-19 Premium credits become unusable once Premium is inactive", () => {
  it("shows the credits-unavailable state and blocks booking server-side", () => {
    const state = resolveOneOnOneButtonState({ effectiveTier: TIER.FREE, creditBalance: 4 });
    expect(state.kind).toBe("creditsUnavailable");
    expect(state.helper).toContain("no longer available");
    expect(BOOKINGS_SQL).toMatch(/'premium_required'/);
  });
});

describe("AC-20 two credits are deducted only after the booking is confirmed", () => {
  it("holds on request and redeems on confirmation", () => {
    expect(CREDITS_PER_ONE_ON_ONE_SESSION).toBe(2);
    expect(BOOKINGS_SQL).toMatch(/-v_required,\s*\n\s*'hold'/);
    expect(BOOKINGS_SQL).toMatch(
      /IF v_booking\.status <> 'confirmed' THEN[\s\S]*?'not_confirmed'/,
    );
    expect(BOOKINGS_SQL).toMatch(/reason = 'redemption'[\s\S]*?'already_redeemed'/);
  });

  it("disables the button below the required balance", () => {
    const state = resolveOneOnOneButtonState({ effectiveTier: TIER.PREMIUM, creditBalance: 1 });
    expect(state.kind).toBe("insufficientCredits");
    expect(state.helper).toContain("Two credits are required");
  });
});

describe("AC-21 credits are not deducted when the booking is not completed", () => {
  it("releases the hold, once, for abandoned bookings", () => {
    expect(BOOKINGS_SQL).toMatch(/release_one_on_one_booking_hold/);
    expect(BOOKINGS_SQL).toMatch(/reason IN \('redemption', 'holdRelease'\)[\s\S]*?'nothing_to_release'/);
    expect(CRON_SQL).toMatch(/billing_release_stale_booking_holds/);
  });
});

describe("AC-22 Founding Member availability is capped at 100 users", () => {
  it("enforces the cap under concurrency", () => {
    expect(LIFECYCLE_SQL).toMatch(/founding_member_slot_limit\(\)\s*\nRETURNS INTEGER[\s\S]*?SELECT 100;/);
    expect(LIFECYCLE_SQL).toMatch(/pg_advisory_xact_lock\(hashtext\('founding_member_slot'\)\)/);
    expect(LIFECYCLE_SQL).toMatch(/IF v_taken >= public\.founding_member_slot_limit\(\) THEN\s*\n\s*RETURN NULL;/);
  });
});

describe("AC-23 Founding pricing converts to standard Pro after 12 months", () => {
  it("announces the conversion date and converts on it", () => {
    expect(foundingPricingNotice("July 27, 2027")).toContain("first 12 months");
    expect(foundingPricingNotice("July 27, 2027")).toContain("$29/month");
    expect(LIFECYCLE_SQL).toMatch(/interval '12 months'/);
    expect(CRON_SQL).toMatch(/'convertFounding'/);
    expect(RPCS_SQL).toMatch(/billing_convert_founding_to_standard/);
  });
});

describe("AC-24 a Founding Member is warned that upgrading drops the discount", () => {
  it("says the price is given up permanently", () => {
    expect(FOUNDING_TO_PREMIUM_DIALOG_COPY.message).toContain(
      "permanently give up your Founding Member price",
    );
    expect(RPCS_SQL).toMatch(/billing_forfeit_founding_discount/);
  });
});

describe("AC-25 payment failures do not activate features or add credits", () => {
  it("keeps access only inside the grace period and never accrues on failure", () => {
    const pastDue = record({
      ...activePremium,
      status: "pastDue",
      gracePeriodEndsAt: new Date(NOW + 3 * DAY).toISOString(),
    });

    expect(resolveEffectiveTier(pastDue, NOW)).toBe(TIER.PREMIUM);
    expect(resolveEffectiveTier(pastDue, NOW + 4 * DAY)).toBe(TIER.FREE);
    // No plan changes while the charge is unresolved.
    expect(resolveAllowedActions({ record: pastDue }, NOW)).not.toContain("upgradeToPremium");
    expect(UPGRADE_PAYMENT_FAILED_MESSAGE).toContain("have not been charged");
    expect(CRON_SQL).toMatch(/'closeGracePeriod'/);
  });
});

describe("AC-26 plan changes show the effective date and financial impact", () => {
  it("puts the date in the copy and the amount behind a Stripe preview", () => {
    expect(downgradeDialogCopy("August 26, 2026").message).toContain("August 26, 2026");
    expect(cancelDialogCopy("Premium", "August 26, 2026").message).toContain("August 26, 2026");
    expect(PRO_TO_PREMIUM_DIALOG_COPY.message).toContain("remaining balance");
  });
});

describe("AC-27 subscription actions are protected against duplicate submissions", () => {
  it("labels in-flight actions and re-validates on the server", () => {
    expect(ACTION_PENDING_LABELS.cancel).toBe("Canceling…");
    expect(ACTION_PENDING_LABELS.resume).toBe("Resuming…");
    expect(ACTION_PENDING_LABELS.scheduleDowngrade).toBe("Scheduling downgrade…");
    expect(ACTION_PENDING_LABELS.upgradeToPremium).toBe("Upgrading…");
    expect(ACTION_PENDING_LABELS.startCheckout).toBe("Processing payment…");

    // A stale tab cannot repeat an action: the state machine rejects it.
    const scheduled = record({ ...activePro, status: "scheduledToCancel" });
    expect(resolveAllowedActions({ record: scheduled }, NOW)).not.toContain("cancel");
    expect(BOOKINGS_SQL).toMatch(/pg_advisory_xact_lock/);
  });
});

describe("AC-28 paid-feature access is validated by the backend", () => {
  it("gates every paid surface on effective_user_tier, not on the interface", () => {
    // Chat session limit.
    expect(ENFORCEMENT_SQL).toMatch(
      /IF public\.effective_user_tier\(p_user_id\) <> 'free' THEN/,
    );
    // Guided paths.
    expect(ENFORCEMENT_SQL).toMatch(
      /CREATE POLICY "Owner with tier inserts pathEnrollment"[\s\S]*?my_tier_allows/,
    );
    // Reassessment.
    expect(ENFORCEMENT_SQL).toMatch(
      /CREATE POLICY "Owner inserts eligible assessmentResult"[\s\S]*?can_i_reassess_now\(\)/,
    );
    // 1:1 bookings and group sessions.
    expect(BOOKINGS_SQL).toMatch(/my_effective_tier\(\) = 'premium'/);
    expect(BOOKINGS_SQL).toMatch(/v_tier NOT IN \('pro', 'premium'\)/);
    // One member cannot read another member's entitlement or balance.
    expect(ENFORCEMENT_SQL).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.effective_user_tier\(UUID\) FROM authenticated;/,
    );
    expect(ENFORCEMENT_SQL).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.available_premium_credits\(UUID\) FROM authenticated;/,
    );
  });

  it("shows human coaching entry points for Free (upsell on click)", () => {
    expect(shouldShowHumanCoachingCard(TIER.FREE)).toBe(true);
    expect(canBookGroupCoachSession(TIER.FREE)).toBe(false);
  });
});
