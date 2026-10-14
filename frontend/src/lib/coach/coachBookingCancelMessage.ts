import type { CoachBookingRow } from "@/lib/coach/coachBookingApi";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Toast after a 1:1 cancel. No refund 24h+ ahead means the credit was not returnable
 * (e.g. the referral reward was reversed by a refund / dispute, or the Premium balance cap).
 */
export function cancelToastMessage(
  refunded: boolean,
  row: Pick<CoachBookingRow, "scheduledAt"> | undefined,
  nowMs: number = Date.now(),
): string {
  if (refunded) return "Session canceled — your credits were returned.";
  const startsAt = row?.scheduledAt ? new Date(row.scheduledAt).getTime() : NaN;
  if (Number.isFinite(startsAt) && startsAt - nowMs >= DAY_MS) {
    return "Session canceled. No credit was returned for this session.";
  }
  return "Session canceled. Credits are not refunded within 24 hours of the session.";
}
