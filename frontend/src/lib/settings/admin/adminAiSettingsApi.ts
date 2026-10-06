import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

/** NCLDD-53 — platform-wide AI prompt settings (singleton row id = 1, admin-only RLS). */
export const PLATFORM_AI_SETTINGS_ROW_ID = 1;

export const AI_SETTINGS_LIMITS = {
  globalSystemPrompt: 8000,
  toneOfVoice: 1000,
  topicCount: 50,
  topicLength: 200,
} as const;

export type PlatformAiSettingsRecord = {
  globalSystemPrompt: string;
  prohibitedTopics: string[];
  toneOfVoice: string;
  updatedAt: string | null;
};

export type PlatformAiSettingsPatch = Partial<
  Pick<PlatformAiSettingsRecord, "globalSystemPrompt" | "prohibitedTopics" | "toneOfVoice">
>;

const SELECT_COLUMNS = "globalSystemPrompt, prohibitedTopics, toneOfVoice, updatedAt";

function toRecord(row: unknown): PlatformAiSettingsRecord {
  // Defensive read: the singleton row may be missing (RLS hides it from non-admins).
  const record = (row ?? {}) as Record<string, unknown>;
  return {
    globalSystemPrompt:
      typeof record.globalSystemPrompt === "string" ? record.globalSystemPrompt : "",
    prohibitedTopics: Array.isArray(record.prohibitedTopics)
      ? record.prohibitedTopics.filter((topic): topic is string => typeof topic === "string")
      : [],
    toneOfVoice: typeof record.toneOfVoice === "string" ? record.toneOfVoice : "",
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : null,
  };
}

/** Trim, collapse whitespace, drop empties, case-insensitive dedupe, enforce limits. */
export function normalizeTopics(topics: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of topics) {
    const topic = raw.replace(/\s+/g, " ").trim().slice(0, AI_SETTINGS_LIMITS.topicLength);
    if (!topic) continue;
    const key = topic.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(topic);
    if (result.length >= AI_SETTINGS_LIMITS.topicCount) break;
  }
  return result;
}

export async function fetchPlatformAiSettings(): Promise<PlatformAiSettingsRecord> {
  const { data, error } = await supabase
    .from("platformAiSettings")
    .select(SELECT_COLUMNS)
    .eq("id", PLATFORM_AI_SETTINGS_ROW_ID)
    .maybeSingle();
  if (error) throw new Error(error.message || "Couldn't load AI settings.");
  return toRecord(data);
}

/** Saves only the given fields; returns the row as confirmed by the database. */
export async function savePlatformAiSettings(
  patch: PlatformAiSettingsPatch,
): Promise<PlatformAiSettingsRecord> {
  // `updatedBy` is set by a DB trigger from auth.uid().
  const payload: TablesInsert<"platformAiSettings"> = { id: PLATFORM_AI_SETTINGS_ROW_ID };
  if (patch.globalSystemPrompt !== undefined) {
    payload.globalSystemPrompt = patch.globalSystemPrompt.trim();
  }
  if (patch.prohibitedTopics !== undefined) {
    payload.prohibitedTopics = normalizeTopics(patch.prohibitedTopics);
  }
  if (patch.toneOfVoice !== undefined) {
    payload.toneOfVoice = patch.toneOfVoice.trim();
  }

  const { data, error } = await supabase
    .from("platformAiSettings")
    .upsert(payload, { onConflict: "id" })
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw new Error(error.message || "Couldn't save AI settings.");
  return toRecord(data);
}
