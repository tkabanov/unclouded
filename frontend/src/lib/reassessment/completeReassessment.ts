import type { ResultsData } from "@/lib/classification";
import type { ReflectionAnswers } from "@/lib/reassessment";
import { insertAssessmentResult } from "@/lib/reassessment/assessmentResultApi";
import { addNinetyDaysIso } from "@/lib/reassessment/reassessmentEntitlements";
import {
  readCoachingModeFromOnboarding,
  recommendPathsAfterReassessment,
  type RecommendedPath,
} from "@/lib/reassessment/recommendPathsAfterReassessment";
import { computeTrajectoryType, type TrajectoryType } from "@/lib/reassessment/trajectory";
import { TIER, type TierSlug } from "@/lib/enums/tier";
import { autoEnrollPathsAfterOnboarding } from "@/lib/paths/pathsOnboardingEnrollmentApi";
import { runOnboardingProfilePipeline } from "@/lib/userProfile/onboardingProfilePipeline";
import { supabase } from "@/integrations/supabase/client";

export interface CompleteReassessmentInput {
  userId: string;
  tier: TierSlug;
  firstResults: ResultsData;
  secondResults: ResultsData;
  reflections: ReflectionAnswers;
  reassessmentData: Record<string, unknown>;
  pathAdaptiveQ?: string | null;
  pathAdaptiveAnswer?: string | null;
  primaryPillar: string;
}

export interface CompleteReassessmentResult {
  trajectoryType: TrajectoryType;
  classificationChanged: boolean;
  assessmentId: string;
  nextReassessmentDate: string;
  modeChanged: boolean;
  previousMode: string | null;
  newMode: string | null;
  recommendedPaths: RecommendedPath[];
  nextFocusText: string | null;
}

/**
 * Persist reassessment history, promote live results, re-run profile pipeline,
 * and additively enroll matching paths when classification changes.
 */
export async function completeReassessment(
  input: CompleteReassessmentInput,
): Promise<CompleteReassessmentResult> {
  const nowIso = new Date().toISOString();
  const trajectoryType = computeTrajectoryType(input.firstResults, input.secondResults);
  const classificationChanged =
    input.firstResults.classification.key !== input.secondResults.classification.key;

  const existingOnboarding = await loadOnboardingData(input.userId);
  const previousMode = readCoachingModeFromOnboarding(existingOnboarding);
  const nextFocusText = (input.reflections.reflection_q4 ?? "").trim() || null;

  const row = await insertAssessmentResult({
    userId: input.userId,
    results: input.secondResults,
    isInitial: false,
    assessmentDate: nowIso,
    trajectoryType,
    reflections: input.reflections,
    pathAdaptiveQ: input.pathAdaptiveQ,
    pathAdaptiveAnswer: input.pathAdaptiveAnswer,
    rawScores: input.reassessmentData,
    pdfGenerated: false,
  });

  const nextReassessmentDate = addNinetyDaysIso(nowIso);
  // Premium on-demand unlocks after first reassessment; Pro resets the flag.
  const canReassessOnDemand = input.tier === TIER.PREMIUM ? true : false;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      results: input.secondResults as unknown as never,
      reassessmentResults: input.secondResults as unknown as never,
      reassessmentData: input.reassessmentData as unknown as never,
      reassessmentReflections: input.reflections as unknown as never,
      reassessmentCompletedAt: nowIso,
      lastAssessmentDate: nowIso,
      nextReassessmentDate,
      canReassessOnDemand,
      classification: input.secondResults.classification.name,
      stabilityScore: input.secondResults.stability_score,
      performanceScore: input.secondResults.performance_score,
      alignmentScore: input.secondResults.alignment_score,
      orientationScore: input.secondResults.orientation_score,
      pressureProfile: input.secondResults.pressure_profile,
      onboardingData: {
        ...existingOnboarding,
        ...input.reassessmentData,
        trajectory_type: trajectoryType,
        reassessment_reflections: input.reflections,
        path_adaptive_q: input.pathAdaptiveQ ?? null,
        path_adaptive_answer: input.pathAdaptiveAnswer ?? null,
        next_focus_text: nextFocusText,
      } as unknown as never,
    })
    .eq("id", input.userId);

  if (profileError) throw profileError;

  await runOnboardingProfilePipeline(input.userId);

  const afterOnboarding = await loadOnboardingData(input.userId);
  const newMode = readCoachingModeFromOnboarding(afterOnboarding);
  const modeChanged = Boolean(previousMode || newMode) && previousMode !== newMode;

  if (classificationChanged) {
    await autoEnrollPathsAfterOnboarding({
      userId: input.userId,
      primaryPillar: input.primaryPillar,
      results: input.secondResults,
      userTier: input.tier,
    });
  }

  const recommendedPaths =
    nextFocusText || classificationChanged
      ? await recommendPathsAfterReassessment({
          primaryPillar: input.primaryPillar,
          results: input.secondResults,
          userTier: input.tier,
          limit: 3,
        })
      : [];

  return {
    trajectoryType,
    classificationChanged,
    assessmentId: row.id,
    nextReassessmentDate,
    modeChanged,
    previousMode,
    newMode,
    recommendedPaths,
    nextFocusText,
  };
}

async function loadOnboardingData(userId: string): Promise<Record<string, unknown>> {
  const { data } = await supabase
    .from("profiles")
    .select("onboardingData")
    .eq("id", userId)
    .maybeSingle();
  return (data?.onboardingData as Record<string, unknown> | null) ?? {};
}

/** Insert initial assessment row + set cycle dates after first onboarding. */
export async function recordInitialAssessment(
  userId: string,
  results: ResultsData,
  assessmentDate?: string,
): Promise<void> {
  const dateIso = assessmentDate ?? new Date().toISOString();
  await insertAssessmentResult({
    userId,
    results,
    isInitial: true,
    assessmentDate: dateIso,
    trajectoryType: null,
    pdfGenerated: false,
  });

  const { error } = await supabase
    .from("profiles")
    .update({
      lastAssessmentDate: dateIso,
      nextReassessmentDate: addNinetyDaysIso(dateIso),
    })
    .eq("id", userId);

  if (error) throw error;
}
