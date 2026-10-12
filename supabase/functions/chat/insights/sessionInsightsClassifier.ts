import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

import {
  AI_INSIGHT_CONCERNS,
  AI_INSIGHT_REQUEST_TYPES,
  AI_INSIGHT_TOPICS,
  AI_INSIGHTS_CLASSIFIER_VERSION,
  filterTaxonomyKeys,
  hasValidAiInsightsConsent,
  taxonomyKeys,
  type TaxonomyEntry,
} from "../../_shared/aiInsights/taxonomy.ts";
import { isValidUuid } from "../../_shared/uuidHelpers.ts";

/**
 * NCLDD-55 (OVR-073) — classify one finalized session into closed taxonomy keys for
 * consent-based admin Insights. Only keys and catalog resource ids are stored, never text.
 * Runs in the background after session_finalize; every failure is logged and swallowed.
 */

const MAX_TOPICS = 3;
const MAX_REQUEST_TYPES = 3;
const MAX_CONCERNS = 3;
const MAX_RESOURCES = 10;
const MAX_TRANSCRIPT_CHARS = 24_000;
const MAX_CATALOG_RESOURCES = 300;
const RESOURCE_CACHE_TTL_MS = 5 * 60_000;

export type InsightResource = { id: string; title: string };

export type SessionInsightsFact = {
  topics: string[];
  requestTypes: string[];
  concernThemes: string[];
  resourceIds: string[];
  crisisLineMentioned: boolean;
};

export type InsightsGenerate = (params: {
  system: string;
  prompt: string;
}) => Promise<{ text: string; usage?: unknown }>;

function taxonomyBlock(title: string, entries: readonly TaxonomyEntry[]): string {
  return `${title}:\n${entries.map((entry) => `- ${entry.key}: ${entry.label}`).join("\n")}`;
}

export const SESSION_INSIGHTS_SYSTEM_PROMPT = [
  "You label coaching conversations for anonymized, aggregated product analytics.",
  "Return ONLY a JSON object with these keys:",
  `"topics" (1-${MAX_TOPICS} keys), "requestTypes" (1-${MAX_REQUEST_TYPES} keys), "concerns" (0-${MAX_CONCERNS} keys),`,
  `"resourceIds" (0-${MAX_RESOURCES} ids of catalog resources the COACH recommended or mentioned),`,
  '"crisisLineMentioned" (true only if the coach referred the user to a crisis line such as 988, 741741 or 911).',
  "Use only keys and ids from the lists provided. Never output names, quotes, or any other text.",
  "",
  taxonomyBlock("Topics", AI_INSIGHT_TOPICS),
  "",
  taxonomyBlock("Request types (what the user asked the coach for)", AI_INSIGHT_REQUEST_TYPES),
  "",
  taxonomyBlock("Concerns (what is worrying the user; omit when none is clear)", AI_INSIGHT_CONCERNS),
].join("\n");

export function buildSessionInsightsPrompt(transcript: string, resources: InsightResource[]): string {
  const catalog = resources.length
    ? resources.map((resource) => `- ${resource.id}: ${resource.title}`).join("\n")
    : "(empty)";
  const clipped =
    transcript.length > MAX_TRANSCRIPT_CHARS ? transcript.slice(-MAX_TRANSCRIPT_CHARS) : transcript;
  return `Resource catalog (id: title):\n${catalog}\n\nConversation:\n${clipped}`;
}

const TOPIC_KEYS = taxonomyKeys(AI_INSIGHT_TOPICS);
const REQUEST_TYPE_KEYS = taxonomyKeys(AI_INSIGHT_REQUEST_TYPES);
const CONCERN_KEYS = taxonomyKeys(AI_INSIGHT_CONCERNS);

function parseJsonObjectLoose(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Validate model output against the taxonomy and the resource catalog. Null when unusable. */
export function parseSessionInsightsPayload(
  text: string,
  catalogIds: Set<string>,
): SessionInsightsFact | null {
  const raw = parseJsonObjectLoose(text);
  if (!raw) return null;

  const topics = filterTaxonomyKeys(raw.topics, TOPIC_KEYS, MAX_TOPICS);
  const requestTypes = filterTaxonomyKeys(raw.requestTypes, REQUEST_TYPE_KEYS, MAX_REQUEST_TYPES);
  if (topics.length === 0 && requestTypes.length === 0) return null;

  const resourceIds: string[] = [];
  if (Array.isArray(raw.resourceIds)) {
    for (const value of raw.resourceIds) {
      if (typeof value !== "string") continue;
      const id = value.trim().toLowerCase();
      if (!catalogIds.has(id) || resourceIds.includes(id)) continue;
      resourceIds.push(id);
      if (resourceIds.length >= MAX_RESOURCES) break;
    }
  }

  return {
    topics,
    requestTypes,
    concernThemes: filterTaxonomyKeys(raw.concerns, CONCERN_KEYS, MAX_CONCERNS),
    resourceIds,
    crisisLineMentioned: raw.crisisLineMentioned === true,
  };
}

let resourceCache: { loadedAt: number; rows: InsightResource[] } | null = null;

export function clearInsightResourceCache(): void {
  resourceCache = null;
}

async function loadResourceCatalog(admin: SupabaseClient): Promise<InsightResource[]> {
  if (resourceCache && Date.now() - resourceCache.loadedAt < RESOURCE_CACHE_TTL_MS) {
    return resourceCache.rows;
  }
  const { data, error } = await admin
    .from("resource")
    .select("id, title")
    .not("title", "is", null)
    .order("title")
    .limit(MAX_CATALOG_RESOURCES);
  if ((data?.length ?? 0) >= MAX_CATALOG_RESOURCES) {
    console.warn(`insights resource catalog truncated to ${MAX_CATALOG_RESOURCES} entries`);
  }
  if (error) {
    console.warn("insights resource catalog load failed", error.code ?? error.message);
    return resourceCache?.rows ?? [];
  }
  const rows = ((data ?? []) as { id: string; title: string | null }[])
    .filter((row) => isValidUuid(row.id) && row.title?.trim())
    .map((row) => ({ id: row.id.toLowerCase(), title: row.title!.trim().slice(0, 160) }));
  resourceCache = { loadedAt: Date.now(), rows };
  return rows;
}

async function userHasValidConsent(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("profiles")
    .select("aiInsightsConsent, aiInsightsConsentVersion")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) {
    // Fail closed: without a readable consent, nothing is processed for Insights.
    if (error) console.warn("insights consent lookup failed", error.code ?? error.message);
    return false;
  }
  const row = data as { aiInsightsConsent?: boolean | null; aiInsightsConsentVersion?: number | null };
  return hasValidAiInsightsConsent(row.aiInsightsConsent, row.aiInsightsConsentVersion);
}

async function factExists(admin: SupabaseClient, conversationId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("aiInsightSessionFact")
    .select("id")
    .eq("conversationId", conversationId)
    .maybeSingle();
  // Fail closed: if we can't tell, skip rather than double-count.
  return Boolean(error) || Boolean(data);
}

export type ClassifySessionInsightsParams = {
  admin: SupabaseClient;
  generate: InsightsGenerate;
  userId: string;
  conversationId: string;
  sessionType: "text" | "voice";
  transcript: string;
  onUsage?: (usage: unknown) => void;
  now?: Date;
};

export type ClassifySessionInsightsResult =
  | "stored"
  | "already_classified"
  | "no_consent"
  | "empty_transcript"
  | "unparseable"
  | "error";

export async function classifySessionInsights(
  params: ClassifySessionInsightsParams,
): Promise<ClassifySessionInsightsResult> {
  try {
    if (!params.transcript.trim()) return "empty_transcript";
    if (!(await userHasValidConsent(params.admin, params.userId))) return "no_consent";
    // A repeated finalize must not re-run the model (cost) or re-count a session.
    if (await factExists(params.admin, params.conversationId)) return "already_classified";

    const resources = await loadResourceCatalog(params.admin);
    const { text, usage } = await params.generate({
      system: SESSION_INSIGHTS_SYSTEM_PROMPT,
      prompt: buildSessionInsightsPrompt(params.transcript, resources),
    });
    params.onUsage?.(usage);

    const fact = parseSessionInsightsPayload(text, new Set(resources.map((r) => r.id)));
    if (!fact) {
      console.warn("insights classifier output unusable", { conversationId: params.conversationId });
      return "unparseable";
    }

    // Re-check right before writing: the user may have revoked consent while the model ran.
    // A DB trigger (ai_insight_fact_require_consent) closes the remaining race window.
    if (!(await userHasValidConsent(params.admin, params.userId))) return "no_consent";

    const sessionDate = (params.now ?? new Date()).toISOString().slice(0, 10);
    const { error } = await params.admin.from("aiInsightSessionFact").upsert(
      {
        userId: params.userId,
        conversationId: params.conversationId,
        sessionType: params.sessionType,
        sessionDate,
        topics: fact.topics,
        requestTypes: fact.requestTypes,
        concernThemes: fact.concernThemes,
        resourceIds: fact.resourceIds,
        crisisLineMentioned: fact.crisisLineMentioned,
        classifierVersion: AI_INSIGHTS_CLASSIFIER_VERSION,
      },
      { onConflict: "conversationId" },
    );
    if (error) {
      console.warn("insights fact upsert failed", error.code ?? error.message);
      return "error";
    }
    return "stored";
  } catch (err) {
    // Message only: AI SDK errors can carry the request body (the transcript).
    console.warn("insights classification failed", err instanceof Error ? err.message : "unknown error");
    return "error";
  }
}
