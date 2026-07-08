/** Bubble option set: tier_os (Tier OS) */

export const TIER_OPTION_SET_ID = "tier_os" as const;

export const TIER = {
  /** bTIrS */
  FREE: "free",
  /** bTIrT */
  PRO: "pro",
  /** bTIrU */
  PREMIUM: "premium",
} as const;

export type TierSlug = (typeof TIER)[keyof typeof TIER];

/** Bubble option-set value ids keyed by tier slug */
export const TIER_BUBBLE_IDS: Record<TierSlug, string> = {
  free: "bTIrS",
  pro: "bTIrT",
  premium: "bTIrU",
};

/** Display strings from ir/inventory.json → tier_os (Bubble display field) */
export const TIER_LABELS: Record<TierSlug, string> = {
  free: "free", // bTIrS
  pro: "pro", // bTIrT
  premium: "premium", // bTIrU
};

export const TIER_ORDER: readonly TierSlug[] = [
  TIER.FREE,
  TIER.PRO,
  TIER.PREMIUM,
];
