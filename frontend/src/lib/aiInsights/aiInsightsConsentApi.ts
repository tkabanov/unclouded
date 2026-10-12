import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

import {
  AI_INSIGHTS_CONSENT_VERSION,
  needsAiInsightsConsentPrompt,
} from "../../../../supabase/functions/_shared/aiInsights/taxonomy.ts";

/**
 * NCLDD-55 (OVR-073) — the user's choice about including AI conversations in anonymized Insights.
 * Read separately from the shared profile select so the app keeps working if the frontend ships
 * before the migration: a missing column means "unavailable" and AI is never blocked.
 */

// Untyped until frontend/src/integrations/supabase/types.ts is regenerated after the migration.
const db = supabase as unknown as SupabaseClient;

export type AiInsightsConsentSource = "first_use" | "settings";

export type AiInsightsConsentState =
  | { status: "unavailable" }
  | {
      status: "loaded";
      granted: boolean | null;
      version: number | null;
      updatedAt: string | null;
      needsPrompt: boolean;
    };

export async function fetchAiInsightsConsent(userId: string): Promise<AiInsightsConsentState> {
  const { data, error } = await db
    .from("profiles")
    .select("aiInsightsConsent, aiInsightsConsentVersion, aiInsightsConsentUpdatedAt")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) {
    if (error) console.warn("AI Insights consent unavailable", error.message);
    return { status: "unavailable" };
  }
  const row = data as {
    aiInsightsConsent: boolean | null;
    aiInsightsConsentVersion: number | null;
    aiInsightsConsentUpdatedAt: string | null;
  };
  return {
    status: "loaded",
    granted: row.aiInsightsConsent,
    version: row.aiInsightsConsentVersion,
    updatedAt: row.aiInsightsConsentUpdatedAt,
    needsPrompt: needsAiInsightsConsentPrompt(row.aiInsightsConsent, row.aiInsightsConsentVersion),
  };
}

export type SetAiInsightsConsentResult = {
  granted: boolean;
  version: number;
  updatedAt: string | null;
};

/** Saves the choice for the current terms version. Revoking deletes the user's Insights records. */
export async function setAiInsightsConsent(
  granted: boolean,
  source: AiInsightsConsentSource,
): Promise<SetAiInsightsConsentResult> {
  const { data, error } = await db.rpc("set_ai_insights_consent", {
    p_granted: granted,
    p_version: AI_INSIGHTS_CONSENT_VERSION,
    p_source: source,
  });
  if (error) throw new Error("Couldn't save your choice. Please try again.");
  const result = (data ?? {}) as { ok?: boolean; error?: string; updatedAt?: string };
  if (result.ok === false) throw new Error(result.error || "Couldn't save your choice.");
  return {
    granted,
    version: AI_INSIGHTS_CONSENT_VERSION,
    updatedAt: typeof result.updatedAt === "string" ? result.updatedAt : null,
  };
}
