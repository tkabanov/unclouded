import { describe, expect, it } from "vitest";
import {
  aggregatePartnerStats,
  filterPartnerReferredUsers,
  type PartnerReferredUserRow,
} from "./referralPartnerStats";

function row(partial: Partial<PartnerReferredUserRow>): PartnerReferredUserRow {
  return {
    userId: partial.userId ?? "u1",
    name: partial.name ?? "User",
    email: partial.email ?? "u@example.com",
    registrationDate: partial.registrationDate ?? "2026-08-01T00:00:00Z",
    referralDate: partial.referralDate ?? "2026-08-01T00:00:00Z",
    tier: partial.tier ?? "free",
    subscriptionStatus: partial.subscriptionStatus ?? "non-active",
    conversionDate: partial.conversionDate ?? null,
    cancellationDate: partial.cancellationDate ?? null,
    isPaid: partial.isPaid ?? false,
    everConverted: partial.everConverted ?? false,
  };
}

describe("referralPartnerStats", () => {
  it("aggregates tiers and conversion rate", () => {
    const stats = aggregatePartnerStats([
      row({ userId: "1", tier: "free" }),
      row({
        userId: "2",
        tier: "pro",
        isPaid: true,
        everConverted: true,
        subscriptionStatus: "active",
      }),
      row({
        userId: "3",
        tier: "premium",
        isPaid: true,
        everConverted: true,
        subscriptionStatus: "active",
      }),
    ]);
    expect(stats.totalReferred).toBe(3);
    expect(stats.freeUsers).toBe(1);
    expect(stats.proUsers).toBe(1);
    expect(stats.premiumUsers).toBe(1);
    expect(stats.paidConversions).toBe(2);
    expect(stats.conversionRate).toBeCloseTo(2 / 3);
  });

  it("filters by search tier and status", () => {
    const rows = [
      row({ userId: "1", name: "Ada", email: "ada@x.com", tier: "pro", subscriptionStatus: "active" }),
      row({
        userId: "2",
        name: "Bob",
        email: "bob@x.com",
        tier: "free",
        subscriptionStatus: "canceled",
      }),
    ];
    expect(filterPartnerReferredUsers(rows, { search: "ada" })).toHaveLength(1);
    expect(filterPartnerReferredUsers(rows, { tier: "free" })).toHaveLength(1);
    expect(filterPartnerReferredUsers(rows, { status: "canceled" })).toHaveLength(1);
  });
});
