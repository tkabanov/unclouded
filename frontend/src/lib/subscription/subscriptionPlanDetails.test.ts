import { describe, expect, it } from "vitest";

import { TIER } from "@/lib/enums/tier";
import { buildCurrentPlanDetails } from "@/lib/subscription/subscriptionPlanDetails";
import type { SubscriptionRecord } from "@/lib/subscription/subscriptionState";

const NOW = Date.UTC(2026, 6, 28);

function record(partial: Partial<SubscriptionRecord>): SubscriptionRecord {
  return {
    planTier: TIER.PRO,
    status: "active",
    billingInterval: "month",
    currentPeriodStart: new Date(NOW).toISOString(),
    currentPeriodEnd: new Date(NOW + 30 * 86400000).toISOString(),
    cancelAtPeriodEnd: false,
    scheduledDowngradeTier: null,
    scheduledDowngradeEffectiveAt: null,
    isFoundingMember: false,
    foundingStartedAt: null,
    foundingDiscountEndsAt: null,
    foundingDiscountForfeitedAt: null,
    gracePeriodEndsAt: null,
    hasPaymentMethodOnFile: true,
    hasStripeSubscription: true,
    ...partial,
  };
}

describe("buildCurrentPlanDetails", () => {
  it("includes start and discount end for Founding Members", () => {
    const started = new Date(NOW).toISOString();
    const discountEnds = new Date(NOW + 365 * 86400000).toISOString();
    const details = buildCurrentPlanDetails(
      record({
        isFoundingMember: true,
        foundingStartedAt: started,
        foundingDiscountEndsAt: discountEnds,
      }),
    );

    const labels = details.map((row) => row.label);
    expect(labels).toContain("Started");
    expect(labels).toContain("Discount ends");
    expect(labels).toContain("Next renewal date");
  });

  it("omits access expiry row when cancellation is scheduled (date lives on the badge)", () => {
    const periodEnd = new Date(NOW + 30 * 86400000).toISOString();
    const details = buildCurrentPlanDetails(
      record({
        status: "scheduledToCancel",
        cancelAtPeriodEnd: true,
        currentPeriodEnd: periodEnd,
      }),
    );
    const labels = details.map((row) => row.label);
    expect(labels).not.toContain("Next renewal date");
    expect(labels).not.toContain("Access expires");
  });
});
