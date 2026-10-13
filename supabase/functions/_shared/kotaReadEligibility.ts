import {
  canUseStandaloneProPrompts,
  type StandaloneTier,
} from "./standalonePrompts/entitlements.ts";

export type KotaReadBookingTable = "coachBooking" | "groupSessionBooking";

export type KotaReadEligibilityBooking = {
  paymentSource?: string | null;
  status?: string | null;
  scheduledAt?: string | null;
  kotaReadJson?: unknown;
};

export type KotaReadEligibility =
  | { ok: true }
  | { ok: false; status: 403 | 409; error: string };

/**
 * Decides whether a member may generate Kota's Read for a booking.
 * Pro/Premium: always allowed. Other plans: only for a 1:1 session paid with a referral
 * coach credit (NCLDD-56 / OVR-074) that is upcoming, live and has no brief yet.
 */
export function resolveKotaReadEligibility(input: {
  tier: StandaloneTier;
  bookingTable: KotaReadBookingTable;
  booking: KotaReadEligibilityBooking;
  nowMs?: number;
}): KotaReadEligibility {
  const { tier, bookingTable, booking } = input;
  if (canUseStandaloneProPrompts(tier)) return { ok: true };

  // NCLDD-56 / OVR-074: a 1:1 session booked with a referral coach credit gets Kota's Read on
  // any plan, so the coach has context even for a Free member.
  const paidWithReferralCredit =
    bookingTable === "coachBooking" && booking.paymentSource === "referral_credit";
  if (!paidWithReferralCredit) {
    return { ok: false, status: 403, error: "Pro or Premium membership required" };
  }

  // Plan-free access is one brief for one upcoming, live referral booking — no regeneration
  // (each call costs an AI generation and emails the coach).
  const nowMs = input.nowMs ?? Date.now();
  const upcoming =
    typeof booking.scheduledAt === "string" &&
    new Date(booking.scheduledAt).getTime() > nowMs;
  if (!["pending", "confirmed"].includes(booking.status ?? "") || !upcoming) {
    return {
      ok: false,
      status: 409,
      error: "Kota's Read is only prepared for upcoming sessions",
    };
  }
  if (booking.kotaReadJson) {
    return {
      ok: false,
      status: 409,
      error: "Kota's Read was already prepared for this session",
    };
  }
  return { ok: true };
}
