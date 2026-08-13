export const SEATS_FULL_MESSAGE =
  "Your organization's seats are full. Contact your HR team.";

export const WORKPLACE_JOIN_CODE_STORAGE_KEY = "unclouded_workplace_join_code";

export type WorkplaceContractRow = {
  id: string;
  contractTier?: string | null;
  seatCount?: number | null;
  maxSeats?: number | null;
  billingModel?: string | null;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  isActive?: boolean | null;
};

/** Normalize for comparison / storage: trim, uppercase, strip spaces. Keep a single hyphen if present. */
export function normalizeEnrollmentCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Public short code: 6–8 chars, A–Z / 0–9, optional single hyphen.
 * Example: ACME26, ACME-26, ORG2026A
 */
export function isValidEnrollmentCodeFormat(code: string): boolean {
  const normalized = normalizeEnrollmentCode(code);
  if (normalized.length < 6 || normalized.length > 8) return false;
  return /^[A-Z0-9]+(-[A-Z0-9]+)?$/.test(normalized);
}

/** Generate a unique-looking 6–8 character code (caller retries on collision). */
export function generateEnrollmentCode(prefix = "ORG"): string {
  const cleaned = prefix.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 4) || "ORG";
  const suffix = crypto.randomUUID().replace(/[^a-f0-9]/gi, "").slice(0, 4).toUpperCase();
  // Prefer 7–8 char forms: PREFIX + digits
  const candidate = `${cleaned}${suffix}`.slice(0, 8);
  if (candidate.length >= 6 && isValidEnrollmentCodeFormat(candidate)) {
    return candidate;
  }
  const fallback = `ORG${suffix}`.slice(0, 8);
  return fallback.length >= 6 ? fallback : `ORG${Date.now().toString(36).slice(-4).toUpperCase()}`.slice(0, 8);
}

export function buildWorkplaceJoinUrl(origin: string, code: string): string {
  const normalized = normalizeEnrollmentCode(code);
  return `${origin.replace(/\/$/, "")}/join/${encodeURIComponent(normalized)}`;
}

export function isWorkplaceContractActive(
  workplace: WorkplaceContractRow,
  now = new Date(),
): boolean {
  if (workplace.isActive === false) return false;

  const today = now.toISOString().slice(0, 10);

  if (workplace.contractStartDate && workplace.contractStartDate > today) {
    return false;
  }

  if (workplace.contractEndDate && workplace.contractEndDate < today) {
    return false;
  }

  return true;
}

export function resolveEnterpriseTier(
  contractTier: string | null | undefined,
): "pro" | "premium" {
  return contractTier?.trim().toLowerCase() === "premium" ? "premium" : "pro";
}

/**
 * Hard enrollment cap:
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
