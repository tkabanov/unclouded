/** NCLDD-52 — parsing of admin-entered monthly USD limits (mirrors the DB checks). */

export const AI_LIMIT_MAX_USD = 100000;

export type ParsedLimitAmount = {
  ok: boolean;
  /** null = not set (empty input); only meaningful when `ok`. */
  value: number | null;
  /** Set when `!ok`. */
  error: string | null;
};

/** Empty input means "not set" (null). Otherwise 0..100000 with at most 2 decimals. */
export function parseLimitAmount(input: string): ParsedLimitAmount {
  const trimmed = input.trim().replace(/^\$/, "").trim();
  if (trimmed === "") return { ok: true, value: null, error: null };
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) {
    return { ok: false, value: null, error: "Enter a non-negative amount with up to 2 decimals." };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value > AI_LIMIT_MAX_USD) {
    return {
      ok: false,
      value: null,
      error: `Amount can't exceed $${AI_LIMIT_MAX_USD.toLocaleString("en-US")}.`,
    };
  }
  return { ok: true, value, error: null };
}

/** Text shown in an input for a stored limit. */
export function formatLimitInput(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}
