import { TIER, type TierSlug } from "@/lib/enums/tier";

/** AI journal reflection is a Pro/Premium feature (US-405, Phase 2 requirements). */
export function canUseJournalAiReflection(tier: TierSlug): boolean {
  return tier === TIER.PRO || tier === TIER.PREMIUM;
}
