import {
  readPreferredCoachingMode,
  updateCoachingModePreference,
} from "@/lib/dashboard/coachingModeApi";
import type { AiCoachingModeSlug } from "@/lib/enums/coachingMode";
import { supabase } from "@/integrations/supabase/client";

export async function loadCoachingPreference(
  userId: string,
): Promise<AiCoachingModeSlug | ""> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_data")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return readPreferredCoachingMode(
    (data?.onboarding_data as Record<string, unknown> | null) ?? null,
  ) ?? "";
}

/** bTIhv coaching-save-btn workflow parity. */
export async function saveCoachingPreference(
  userId: string,
  mode: AiCoachingModeSlug | "",
): Promise<void> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_data")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  await updateCoachingModePreference(
    userId,
    mode,
    (data?.onboarding_data as Record<string, unknown> | null) ?? null,
  );
}
