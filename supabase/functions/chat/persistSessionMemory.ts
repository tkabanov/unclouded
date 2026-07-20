import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { SessionFinalizePayload } from "./prompt/sessionLifecycle.ts";
import { buildSessionMemoryOnboardingPatch } from "./sessionMemory/sessionMemoryHelpers.ts";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Persist session memory into profiles.onboardingData after server-side finalize (T-009). */
export async function persistSessionMemory(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  finalize: SessionFinalizePayload,
  coachingModeUsed: string,
  exchangeCount?: number | null,
): Promise<void> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboardingData")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data || typeof data !== "object") {
    throw new Error("Profile not found for session memory persistence");
  }

  const row = data as Record<string, unknown>;
  const onboardingData = asRecord(row.onboardingData);
  const patch = buildSessionMemoryOnboardingPatch(
    onboardingData,
    conversationId,
    finalize,
    coachingModeUsed,
    exchangeCount,
  );

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      onboardingData: {
        ...onboardingData,
        ...patch,
      },
    })
    .eq("id", userId);

  if (updateError) throw updateError;
}
