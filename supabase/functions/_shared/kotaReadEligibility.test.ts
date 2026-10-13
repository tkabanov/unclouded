import { describe, expect, it } from "vitest";

import {
  resolveKotaReadEligibility,
  type KotaReadEligibilityBooking,
} from "./kotaReadEligibility.ts";

const NOW = Date.parse("2026-10-13T12:00:00Z");
const FUTURE = "2026-10-20T15:00:00Z";
const PAST = "2026-10-01T15:00:00Z";

function referralBooking(
  overrides: Partial<KotaReadEligibilityBooking> = {},
): KotaReadEligibilityBooking {
  return {
    paymentSource: "referral_credit",
    status: "confirmed",
    scheduledAt: FUTURE,
    kotaReadJson: null,
    ...overrides,
  };
}

describe("resolveKotaReadEligibility — NCLDD-56 A3 (referral credit on Free plan)", () => {
  it("allows a Free member's upcoming referral-credit 1:1 booking", () => {
    expect(
      resolveKotaReadEligibility({
        tier: "free",
        bookingTable: "coachBooking",
        booking: referralBooking(),
        nowMs: NOW,
      }),
    ).toEqual({ ok: true });
  });

  it("allows a pending referral-credit booking too", () => {
    expect(
      resolveKotaReadEligibility({
        tier: "free",
        bookingTable: "coachBooking",
        booking: referralBooking({ status: "pending" }),
        nowMs: NOW,
      }).ok,
    ).toBe(true);
  });

  it("generates only once: a second call after the brief is stored is rejected", () => {
    const booking = referralBooking();
    const first = resolveKotaReadEligibility({
      tier: "free",
      bookingTable: "coachBooking",
      booking,
      nowMs: NOW,
    });
    expect(first.ok).toBe(true);

    // index.ts persists kotaReadJson on the booking after a successful generation.
    const afterFirstRun = { ...booking, kotaReadJson: { headline: "stored brief" } };
    expect(
      resolveKotaReadEligibility({
        tier: "free",
        bookingTable: "coachBooking",
        booking: afterFirstRun,
        nowMs: NOW,
      }),
    ).toEqual({
      ok: false,
      status: 409,
      error: "Kota's Read was already prepared for this session",
    });
  });

  it.each([
    ["past session", { scheduledAt: PAST }],
    ["missing scheduledAt", { scheduledAt: null }],
    ["cancelled booking", { status: "cancelled" }],
    ["completed booking", { status: "completed" }],
    ["missing status", { status: null }],
  ] as const)("rejects a referral-credit booking that is not upcoming/live (%s)", (_, patch) => {
    expect(
      resolveKotaReadEligibility({
        tier: "free",
        bookingTable: "coachBooking",
        booking: referralBooking(patch),
        nowMs: NOW,
      }),
    ).toEqual({
      ok: false,
      status: 409,
      error: "Kota's Read is only prepared for upcoming sessions",
    });
  });
});

describe("resolveKotaReadEligibility — Free plan without referral credit", () => {
  it.each([
    ["stripe payment", "stripe"],
    ["null paymentSource", null],
    ["missing paymentSource", undefined],
  ] as const)("returns 403 for a Free member's 1:1 booking (%s)", (_, paymentSource) => {
    expect(
      resolveKotaReadEligibility({
        tier: "free",
        bookingTable: "coachBooking",
        booking: referralBooking({ paymentSource }),
        nowMs: NOW,
      }),
    ).toEqual({ ok: false, status: 403, error: "Pro or Premium membership required" });
  });

  it("ignores referral_credit on group session bookings (403 on Free)", () => {
    expect(
      resolveKotaReadEligibility({
        tier: "free",
        bookingTable: "groupSessionBooking",
        booking: referralBooking(),
        nowMs: NOW,
      }),
    ).toMatchObject({ ok: false, status: 403 });
  });
});

describe("resolveKotaReadEligibility — paid plans (unchanged rule)", () => {
  it.each(["pro", "premium"] as const)(
    "%s is allowed regardless of payment source, timing or an existing brief",
    (tier) => {
      expect(
        resolveKotaReadEligibility({
          tier,
          bookingTable: "coachBooking",
          booking: referralBooking({
            paymentSource: null,
            scheduledAt: PAST,
            kotaReadJson: { headline: "old" },
          }),
          nowMs: NOW,
        }),
      ).toEqual({ ok: true });
    },
  );
});
