/** Client-side enrollment code helpers (mirrors edge shared helpers). */

export const WORKPLACE_JOIN_CODE_STORAGE_KEY = "unclouded_workplace_join_code";

export function normalizeEnrollmentCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidEnrollmentCodeFormat(code: string): boolean {
  const normalized = normalizeEnrollmentCode(code);
  if (normalized.length < 6 || normalized.length > 8) return false;
  return /^[A-Z0-9]+(-[A-Z0-9]+)?$/.test(normalized);
}

export function buildWorkplaceJoinUrl(origin: string, code: string): string {
  const normalized = normalizeEnrollmentCode(code);
  return `${origin.replace(/\/$/, "")}/join/${encodeURIComponent(normalized)}`;
}

export function readStoredJoinCode(): string | null {
  try {
    const raw = sessionStorage.getItem(WORKPLACE_JOIN_CODE_STORAGE_KEY);
    if (!raw) return null;
    const normalized = normalizeEnrollmentCode(raw);
    return isValidEnrollmentCodeFormat(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

export function storeJoinCode(code: string): void {
  const normalized = normalizeEnrollmentCode(code);
  sessionStorage.setItem(WORKPLACE_JOIN_CODE_STORAGE_KEY, normalized);
}

export function clearStoredJoinCode(): void {
  try {
    sessionStorage.removeItem(WORKPLACE_JOIN_CODE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
