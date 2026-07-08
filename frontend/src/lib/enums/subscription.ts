/**
 * Subscription tier helpers and Supabase subscription_plan mapping reference.
 *
 * Supabase mapping (read-only — canonical schema in project/ when present):
 *
 * Bubble user_type `subscriptionplan` → future `subscription_plan` table
 *   - id (text PK) — Bubble row id
 *   - name_text — plan display name shown on subscription cards
 *   - price_number — monthly price
 *   - features_text — feature bullet list
 *   - description_text — plan tagline / summary
 *
 * tier_os slug → expected subscription_plan row correlation:
 *   | tier_os slug | Bubble id | subscription_plan.name_text (expected) |
 *   |--------------|-----------|----------------------------------------|
 *   | free         | bTIrS     | Free                                   |
 *   | pro          | bTIrT     | Pro                                    |
 *   | premium      | bTIrU     | Premium                                |
 *
 * User field `tier_option_tier_os` stores the tier_os slug (free | pro | premium).
 * Prototype PlanId values in @/lib/plans.ts align 1:1 with TierSlug for demo billing.
 */

import { TIER, TIER_LABELS, type TierSlug } from "./tier";

export { TIER, TIER_LABELS, type TierSlug };

/** Title-case labels for subscription plan cards and tier badges */
export const TIER_SUBSCRIPTION_LABELS: Record<TierSlug, string> = {
  free: "Free",
  pro: "Pro",
  premium: "Premium",
};

/** tier_os slug → prototype plan id (1:1; same string values) */
export const TIER_TO_PLAN_ID: Record<TierSlug, TierSlug> = {
  free: TIER.FREE,
  pro: TIER.PRO,
  premium: TIER.PREMIUM,
};

export const PLAN_ID_TO_TIER: Record<TierSlug, TierSlug> = {
  free: TIER.FREE,
  pro: TIER.PRO,
  premium: TIER.PREMIUM,
};

export function getTierLabel(slug: TierSlug): string {
  return TIER_LABELS[slug];
}

export function getTierSubscriptionLabel(slug: TierSlug): string {
  return TIER_SUBSCRIPTION_LABELS[slug];
}
