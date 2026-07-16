import type { ResultsData } from "@/lib/classification";
import { TIER, type TierSlug } from "@/lib/enums/tier";
import {
  selectOnboardingEnrollmentPaths,
  type OnboardingEnrollmentContext,
  type PathEnrollmentCandidate,
} from "@/lib/paths/pathEnrollmentMatching";
import { supabase } from "@/integrations/supabase/client";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

export interface RecommendedPath {
  id: string;
  name: string;
}

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

function isTierSlug(value: string | undefined | null): value is TierSlug {
  return value === TIER.FREE || value === TIER.PRO || value === TIER.PREMIUM;
}

/**
 * Surface 1–3 path recommendations for the results screen (no enroll from free text).
 */
export async function recommendPathsAfterReassessment(input: {
  primaryPillar: string;
  results: ResultsData;
  userTier: TierSlug;
  limit?: number;
}): Promise<RecommendedPath[]> {
  const limit = input.limit ?? 3;
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("path")
    .select("id, name, tier, pillar, classifications, triggerSignals");

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }

  if (!Array.isArray(data)) return [];

  const candidates: PathEnrollmentCandidate[] = data
    .map((row) => {
      const r = row as {
        id?: string;
        name?: string;
        tier?: string;
        pillar?: string;
        classifications?: string | null;
        triggerSignals?: string | null;
      };
      if (!r.id || !r.name || !r.pillar || !isTierSlug(r.tier)) return null;
      return {
        id: r.id,
        name: r.name,
        tier: r.tier,
        pillar: r.pillar,
        classifications: r.classifications?.trim() ?? "",
        triggerSignals: r.triggerSignals?.trim() ?? "",
      };
    })
    .filter((p): p is PathEnrollmentCandidate => p !== null);

  const context: OnboardingEnrollmentContext = {
    primaryPillar: input.primaryPillar,
    classificationName: input.results.classification.name,
    recoveryModeActive: input.results.recovery_mode_active,
    griefModeActive: input.results.grief_mode_active,
    userTier: input.userTier,
  };

  return selectOnboardingEnrollmentPaths(candidates, context)
    .slice(0, limit)
    .map((p) => ({ id: p.id, name: p.name }));
}

export function readCoachingModeFromOnboarding(
  onboardingData: Record<string, unknown> | null | undefined,
): string | null {
  if (!onboardingData) return null;
  const primary =
    onboardingData.ai_coaching_mode_os ??
    onboardingData.primary_mode_text;
  if (typeof primary === "string" && primary.trim()) return primary.trim();

  const list = onboardingData.ai_coaching_mode_list_list_option_ai_coaching_mode_os;
  if (Array.isArray(list) && typeof list[list.length - 1] === "string") {
    return (list[list.length - 1] as string).trim() || null;
  }
  return null;
}
