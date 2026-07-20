import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { readSignificantLifeEventFlag } from "./significantLifeEventDetect.ts";

export type SignificantLifeEventSource = "session_disclosure" | "profile_life_event";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Layer 10 item 11 / Block 3.32 — persist mid-cycle life-event trigger in onboardingData. */
export async function persistSignificantLifeEventFlag(
  supabase: SupabaseClient,
  userId: string,
  onboardingData: Record<string, unknown> | null | undefined,
  source: SignificantLifeEventSource,
): Promise<boolean> {
  const existing = asRecord(onboardingData);
  if (readSignificantLifeEventFlag(existing)) {
    return false;
  }

  const nowIso = new Date().toISOString();
  const patch = {
    ...existing,
    significant_life_event_flag: true,
    significantLifeEventFlag: true,
    significant_life_event_source: source,
    significant_life_event_at: nowIso,
  };

  const { error } = await supabase
    .from("profiles")
    .update({ onboardingData: patch })
    .eq("id", userId);

  if (error) {
    console.error("persistSignificantLifeEventFlag failed", error);
    return false;
  }

  return true;
}
