import type { ResultsData } from "@/lib/classification";
import type { UserProfile } from "@/lib/userProfile";
import { getInitialAssessmentResult } from "@/lib/reassessment/assessmentResultApi";

export interface ReassessmentComparisonPair {
  first: ResultsData;
  second: ResultsData;
  priorAssessmentDate: string | null;
}

function resultsDiffer(a: ResultsData, b: ResultsData): boolean {
  return (
    a.classification.key !== b.classification.key ||
    a.stability_score !== b.stability_score ||
    a.performance_score !== b.performance_score ||
    a.alignment_score !== b.alignment_score ||
    a.orientation_score !== b.orientation_score
  );
}

/** Resolve Day 0 vs Day 90 pair for dashboard comparison UI. */
export async function resolveReassessmentComparison(
  userId: string,
  profile: UserProfile,
): Promise<ReassessmentComparisonPair | null> {
  const second = profile.reassessmentResults;
  if (!second || !profile.reassessmentCompletedAt) return null;

  const initialRow = await getInitialAssessmentResult(userId);
  if (initialRow?.rawResults) {
    return {
      first: initialRow.rawResults,
      second,
      priorAssessmentDate: initialRow.assessmentDate,
    };
  }

  const baseline = profile.results;
  if (baseline && resultsDiffer(baseline, second)) {
    return {
      first: baseline,
      second,
      priorAssessmentDate: profile.onboardingCompletedAt ?? null,
    };
  }

  return null;
}
