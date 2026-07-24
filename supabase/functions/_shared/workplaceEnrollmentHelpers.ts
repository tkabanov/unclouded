export const SEATS_FULL_MESSAGE =
  "Your organization's seats are full. Contact your HR team.";

export type WorkplaceContractRow = {
  id: string;
  contractTier?: string | null;
  seatCount?: number | null;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  isActive?: boolean | null;
};

export function normalizeEnrollmentCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidEnrollmentCodeFormat(code: string): boolean {
  const normalized = normalizeEnrollmentCode(code);
  return normalized.length >= 6 && normalized.length <= 32;
}

export function generateEnrollmentCode(prefix = "ORG"): string {
  const year = new Date().getUTCFullYear();
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${prefix.slice(0, 8).toUpperCase()}-${year}-${suffix}`;
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
