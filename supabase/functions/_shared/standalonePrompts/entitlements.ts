/** Tier gates for standalone Kota prompts. */

export type StandaloneTier = "free" | "pro" | "premium";

export function normalizeStandaloneTier(raw: unknown): StandaloneTier {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (value === "pro" || value === "premium") return value;
  return "free";
}

/** Prompts 1–4 and coach brief (Pro + Premium). Prompt 4 Trajectory Statement is Pro+Premium. */
export function canUseStandaloneProPrompts(tier: StandaloneTier): boolean {
  return tier === "pro" || tier === "premium";
}

/** Prompt 5 Coaching Summary — Premium PDF narrative only. */
export function canUsePremiumPdfPrompts(tier: StandaloneTier): boolean {
  return tier === "premium";
}
