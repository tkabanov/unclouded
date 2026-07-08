import { computeAiConfidenceLevel } from "./resolveAiConfidenceLevel";
import { loadProfileRow, patchOnboardingAndResults } from "./profileFieldPatch";

export const MODULES_COMPLETED_COUNT_FIELD = "modules_completed_count_number" as const;
export const AI_CONFIDENCE_LEVEL_FIELD =
  "ai_confidence_level_option_ai_confidence_level_os" as const;

function readModulesCompleted(onboarding: Record<string, unknown>): number {
  const raw = onboarding[MODULES_COMPLETED_COUNT_FIELD];
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

/** bTIFU trigger parity — patch confidence when modules count changes. */
export async function onModulesCompletedCountChanged(
  userId: string,
  previousCount: number,
  currentCount: number,
): Promise<void> {
  if (previousCount === currentCount) return;

  const confidence = computeAiConfidenceLevel(currentCount);
  await patchOnboardingAndResults(userId, {
    [MODULES_COMPLETED_COUNT_FIELD]: currentCount,
    [AI_CONFIDENCE_LEVEL_FIELD]: confidence,
  });
}

export async function incrementModulesCompletedCount(userId: string): Promise<number> {
  const { onboarding_data } = await loadProfileRow(userId);
  const previous = readModulesCompleted(onboarding_data);
  const current = previous + 1;
  await onModulesCompletedCountChanged(userId, previous, current);
  return current;
}
