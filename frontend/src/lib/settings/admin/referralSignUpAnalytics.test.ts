import { describe, expect, it } from "vitest";

import {
  aggregateReferralSignUpStats,
  formatReferralConversionRate,
  formatReferralSignUpDate,
  isPaidReferralProfile,
  type ReferralSignUpProfileRow,
} from "./referralSignUpAnalytics";

describe("isPaidReferralProfile", () => {
  it("treats subscribed users as paid", () => {
    expect(isPaidReferralProfile({ subscribed: true, tier: "free" })).toBe(true);
  });

  it("treats pro and premium tiers as paid", () => {
    expect(isPaidReferralProfile({ subscribed: false, tier: "pro" })).toBe(true);
    expect(isPaidReferralProfile({ subscribed: false, tier: "premium" })).toBe(true);
  });

  it("excludes free and explorer tiers when unsubscribed", () => {
    expect(isPaidReferralProfile({ subscribed: false, tier: "free" })).toBe(false);
    expect(isPaidReferralProfile({ subscribed: false, tier: "explorer" })).toBe(false);
    expect(isPaidReferralProfile({ subscribed: false, tier: null })).toBe(false);
  });
});

describe("aggregateReferralSignUpStats", () => {
  it("groups profiles by referrer user id and picks latest createdAt", () => {
    const rows: ReferralSignUpProfileRow[] = [
      {
        referredByUserId: "11111111-1111-1111-1111-111111111111",
        referredByReferralCode: "abc123",
        createdAt: "2026-07-01T10:00:00.000Z",
      },
      {
        referredByUserId: "11111111-1111-1111-1111-111111111111",
        referredByReferralCode: "ABC123",
        createdAt: "2026-07-22T10:00:00.000Z",
      },
      {
        referredByUserId: "22222222-2222-2222-2222-222222222222",
        referredByReferralCode: "XYZ789",
        createdAt: "2026-07-15T10:00:00.000Z",
      },
    ];

    const stats = aggregateReferralSignUpStats(rows);

    expect(stats).toHaveLength(2);
    expect(stats[0]).toEqual({
      referredByUserId: "11111111-1111-1111-1111-111111111111",
      referralCode: "ABC123",
      signUpCount: 2,
      paidConversionCount: 0,
      conversionRate: 0,
      lastSignUpAt: "2026-07-22T10:00:00.000Z",
    });
    expect(stats[1]).toEqual({
      referredByUserId: "22222222-2222-2222-2222-222222222222",
      referralCode: "XYZ789",
      signUpCount: 1,
      paidConversionCount: 0,
      conversionRate: 0,
      lastSignUpAt: "2026-07-15T10:00:00.000Z",
    });
  });

  it("counts paid conversions from subscribed and paid tiers", () => {
    const rows: ReferralSignUpProfileRow[] = [
      {
        referredByUserId: "33333333-3333-3333-3333-333333333333",
        referredByReferralCode: "CODE1",
        createdAt: "2026-07-01T10:00:00.000Z",
        subscribed: true,
        tier: "free",
      },
      {
        referredByUserId: "33333333-3333-3333-3333-333333333333",
        referredByReferralCode: "CODE1",
        createdAt: "2026-07-02T10:00:00.000Z",
        subscribed: false,
        tier: "pro",
      },
      {
        referredByUserId: "33333333-3333-3333-3333-333333333333",
        referredByReferralCode: "CODE1",
        createdAt: "2026-07-03T10:00:00.000Z",
        subscribed: false,
        tier: "free",
      },
    ];

    const stats = aggregateReferralSignUpStats(rows);

    expect(stats).toEqual([
      {
        referredByUserId: "33333333-3333-3333-3333-333333333333",
        referralCode: "CODE1",
        signUpCount: 3,
        paidConversionCount: 2,
        conversionRate: 2 / 3,
        lastSignUpAt: "2026-07-03T10:00:00.000Z",
      },
    ]);
  });

  it("ignores rows without referrer user id or referral code", () => {
    const rows: ReferralSignUpProfileRow[] = [
      {
        referredByUserId: null,
        referredByReferralCode: null,
        createdAt: "2026-07-01T10:00:00.000Z",
      },
      {
        referredByUserId: null,
        referredByReferralCode: "   ",
        createdAt: "2026-07-02T10:00:00.000Z",
      },
      {
        referredByUserId: "44444444-4444-4444-4444-444444444444",
        referredByReferralCode: "VALID1",
        createdAt: "2026-07-03T10:00:00.000Z",
      },
    ];

    expect(aggregateReferralSignUpStats(rows)).toEqual([
      {
        referredByUserId: "44444444-4444-4444-4444-444444444444",
        referralCode: "VALID1",
        signUpCount: 1,
        paidConversionCount: 0,
        conversionRate: 0,
        lastSignUpAt: "2026-07-03T10:00:00.000Z",
      },
    ]);
  });

  it("sorts by sign-up count descending, then last sign-up date", () => {
    const rows: ReferralSignUpProfileRow[] = [
      {
        referredByUserId: "aaaa0000-0000-0000-0000-000000000001",
        referredByReferralCode: "LOW",
        createdAt: "2026-07-01T10:00:00.000Z",
      },
      {
        referredByUserId: "aaaa0000-0000-0000-0000-000000000002",
        referredByReferralCode: "HIGH",
        createdAt: "2026-07-10T10:00:00.000Z",
      },
      {
        referredByUserId: "aaaa0000-0000-0000-0000-000000000002",
        referredByReferralCode: "HIGH",
        createdAt: "2026-07-20T10:00:00.000Z",
      },
      {
        referredByUserId: "aaaa0000-0000-0000-0000-000000000003",
        referredByReferralCode: "MID",
        createdAt: "2026-07-05T10:00:00.000Z",
      },
      {
        referredByUserId: "aaaa0000-0000-0000-0000-000000000003",
        referredByReferralCode: "MID",
        createdAt: "2026-07-06T10:00:00.000Z",
      },
    ];

    const stats = aggregateReferralSignUpStats(rows);

    expect(stats.map((row) => row.referralCode)).toEqual(["HIGH", "MID", "LOW"]);
  });

  it("returns an empty list when no rows qualify", () => {
    expect(aggregateReferralSignUpStats([])).toEqual([]);
  });
});

describe("formatReferralSignUpDate", () => {
  it("formats valid ISO timestamps", () => {
    expect(formatReferralSignUpDate("2026-07-22T10:00:00.000Z")).toBe("Jul 22, 2026");
  });

  it("returns an em dash for invalid timestamps", () => {
    expect(formatReferralSignUpDate("not-a-date")).toBe("—");
  });
});

describe("formatReferralConversionRate", () => {
  it("formats conversion rates as whole percentages", () => {
    expect(formatReferralConversionRate(2 / 3)).toBe("67%");
    expect(formatReferralConversionRate(0)).toBe("0%");
  });

  it("returns an em dash for null rates", () => {
    expect(formatReferralConversionRate(null)).toBe("—");
  });
});
