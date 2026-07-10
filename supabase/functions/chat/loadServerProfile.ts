import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { ChatLiveContext, ProfileData } from "./prompt/types.ts";

type ProfileRow = {
  firstName?: string | null;
  roleType?: string | null;
  primaryPillar?: string | null;
  results?: Record<string, unknown> | null;
  onboardingData?: Record<string, unknown> | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Load profile fields for the authenticated user — server truth replaces client profileData.
 * liveContext remains client-supplied (labeled untrusted in prompt) until server aggregation ships.
 */
export async function loadServerProfile(
  supabase: SupabaseClient,
  userId: string,
  clientLiveContext?: ChatLiveContext | null,
): Promise<ProfileData | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("firstName, roleType, primaryPillar, results, onboardingData")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data || typeof data !== "object") return null;

  const row = data as ProfileRow;

  return {
    firstName: typeof row.firstName === "string" ? row.firstName : undefined,
    roleType: typeof row.roleType === "string" ? row.roleType : undefined,
    primaryPillar: typeof row.primaryPillar === "string" ? row.primaryPillar : undefined,
    results: asRecord(row.results),
    onboardingData: asRecord(row.onboardingData),
    liveContext: clientLiveContext ?? undefined,
  };
}
