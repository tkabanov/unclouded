import { supabase } from "@/integrations/supabase/client";
import {
  AI_COACHING_MODE,
  type AiCoachingModeSlug,
} from "@/lib/enums/coachingMode";

/** Bubble user field: ai_coaching_mode_list_list_option_ai_coaching_mode_os */
export const COACHING_MODE_LIST_FIELD =
  "ai_coaching_mode_list_list_option_ai_coaching_mode_os" as const;

export function readCoachingModeList(
  onboardingData: Record<string, unknown> | null | undefined,
): AiCoachingModeSlug[] {
  const raw = onboardingData?.[COACHING_MODE_LIST_FIELD];
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is AiCoachingModeSlug => typeof v === "string");
}

/** Active selection for bTIVQ — last list entry when present. */
export function readPreferredCoachingMode(
  onboardingData: Record<string, unknown> | null | undefined,
): AiCoachingModeSlug | null {
  const list = readCoachingModeList(onboardingData);
  return list.length > 0 ? list[list.length - 1]! : null;
}

/**
 * InputChanged workflow bTIVW parity on dropdown bTIVQ.
 * - Non-empty selection: add mode to user coaching mode list (bTIVc).
 * - Empty selection: reset list to simplifier fallback (bTIVe).
 */
export async function updateCoachingModePreference(
  userId: string,
  mode: AiCoachingModeSlug | "",
  existingOnboardingData: Record<string, unknown> | null | undefined,
): Promise<void> {
  const currentList = readCoachingModeList(existingOnboardingData);

  let nextList: AiCoachingModeSlug[];
  if (mode) {
    nextList = currentList.includes(mode) ? currentList : [...currentList, mode];
  } else {
    const filtered = currentList.filter((m) => m === AI_COACHING_MODE.SIMPLIFIER);
    nextList = filtered.length > 0 ? filtered : [AI_COACHING_MODE.SIMPLIFIER];
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      onboarding_data: {
        ...(existingOnboardingData ?? {}),
        [COACHING_MODE_LIST_FIELD]: nextList,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}
