/**
 * Hard enrollment cap (mirrors SQL workplace_hard_seat_limit / edge helpers):
 * - flat_rate → seatCount
 * - pay_per_active → maxSeats if set, else null (soft target only)
 */
export function workplaceHardSeatLimit(workplace: {
  billingModel?: string | null;
  seatCount?: number | null;
  maxSeats?: number | null;
}): number | null {
  const model = workplace.billingModel?.trim().toLowerCase() || "flat_rate";
  if (model === "pay_per_active") {
    const max = workplace.maxSeats;
    return typeof max === "number" && max > 0 ? max : null;
  }
  const seats = workplace.seatCount;
  return typeof seats === "number" && seats > 0 ? seats : null;
}

export function isWorkplaceSeatsFull(
  workplace: {
    billingModel?: string | null;
    seatCount?: number | null;
    maxSeats?: number | null;
  },
  activeSeats: number,
): boolean {
  const limit = workplaceHardSeatLimit(workplace);
  return limit !== null && activeSeats >= limit;
}

export function formatEnrollmentSeatLine(workplace: {
  billingModel?: string | null;
  seatCount: number;
  maxSeats?: number | null;
  activeSeats: number;
}): string {
  const model = workplace.billingModel?.trim().toLowerCase() || "flat_rate";
  const active = workplace.activeSeats;
  if (model === "pay_per_active") {
    const limit = workplaceHardSeatLimit(workplace);
    const target = `target ${workplace.seatCount}`;
    if (limit == null) {
      return `Seats: ${active} enrolled · ${target} (no hard cap)`;
    }
    const full =
      active >= limit
        ? " — full (new enrollments blocked until a seat frees or max increases)"
        : "";
    return `Seats: ${active} / ${limit} max · ${target}${full}`;
  }
  const full =
    workplace.seatCount > 0 && active >= workplace.seatCount
      ? " — full (new enrollments blocked until a seat frees or capacity increases)"
      : "";
  return `Seats: ${active} / ${workplace.seatCount} used${full}`;
}
