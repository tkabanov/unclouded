/** Tier gates for standalone Kota prompts. */

export type StandaloneTier = "free" | "pro" | "premium";

export function normalizeStandaloneTier(raw: unknown): StandaloneTier {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (value === "pro" || value === "premium") return value;
  return "free";
}

/** Prompts 1–3 and coach brief on bookable sessions. */
export function canUseStandaloneProPrompts(tier: StandaloneTier): boolean {
  return tier === "pro" || tier === "premium";
}

/** Prompts 4–5 Premium PDF narrative. */
export function canUsePremiumPdfPrompts(tier: StandaloneTier): boolean {
  return tier === "premium";
}
