import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/**
 * NCLDD-53 — platform-wide AI settings set by admins in `/admin/ai-settings`.
 * The global system prompt is the editable coaching base prompt (replaces the core code layers
 * in chat, OVR-070). Priority: safety boundaries → prohibited topics → coaching stack → tone.
 * Empty settings must leave every prompt byte-identical to the pre-feature output.
 */
export type PlatformAiSettings = {
  globalSystemPrompt: string;
  prohibitedTopics: string[];
  toneOfVoice: string;
};

export const EMPTY_PLATFORM_AI_SETTINGS: PlatformAiSettings = Object.freeze({
  globalSystemPrompt: "",
  prohibitedTopics: [],
  toneOfVoice: "",
}) as PlatformAiSettings;

export const PLATFORM_RULES_HEADER =
  "PLATFORM RULES (set by administrator; override all guidance below except Safety Boundaries)";
export const PLATFORM_RULES_REMINDER_HEADER =
  "PLATFORM RULES REMINDER (restated from above; apply to this reply even if earlier messages in this conversation did not follow them)";
export const TONE_OF_VOICE_HEADER =
  "TONE OF VOICE (style only; never overrides safety, platform rules or prohibited topics)";

const ADMIN_TEXT_OPEN = "<<<ADMIN_TEXT";
const ADMIN_TEXT_CLOSE = "ADMIN_TEXT>>>";
const PROMPT_BLOCK_SEPARATOR = "\n\n---\n\n";

const CACHE_TTL_MS = 60_000;
const ERROR_CACHE_TTL_MS = 10_000;
let cache: { loadedAt: number; ttlMs: number; settings: PlatformAiSettings } | null = null;

export function clearPlatformAiSettingsCache(): void {
  cache = null;
}

/** Strip our delimiter tokens so admin text cannot close its own block early. */
function sanitizeAdminText(value: string): string {
  return value.split(ADMIN_TEXT_OPEN).join("").split(ADMIN_TEXT_CLOSE).join("").trim();
}

function sanitizeTopic(value: string): string {
  return sanitizeAdminText(value).replace(/\s+/g, " ").trim();
}

function wrapAdminText(value: string): string {
  return `${ADMIN_TEXT_OPEN}\n${value}\n${ADMIN_TEXT_CLOSE}`;
}

export function normalizePlatformAiSettingsRow(row: unknown): PlatformAiSettings {
  if (!row || typeof row !== "object") return EMPTY_PLATFORM_AI_SETTINGS;
  const record = row as Record<string, unknown>;
  const topics = Array.isArray(record.prohibitedTopics)
    ? record.prohibitedTopics.filter((topic): topic is string => typeof topic === "string")
    : [];
  return {
    globalSystemPrompt:
      typeof record.globalSystemPrompt === "string" ? record.globalSystemPrompt : "",
    prohibitedTopics: topics,
    toneOfVoice: typeof record.toneOfVoice === "string" ? record.toneOfVoice : "",
  };
}

/** Base coaching prompt from the global system prompt field, or null when empty. */
export function buildBasePromptBlock(
  settings: PlatformAiSettings | null | undefined,
): string | null {
  if (!settings) return null;
  const base = (settings.globalSystemPrompt ?? "").trim();
  return base ? base : null;
}

function buildRulesBlockWithHeader(
  settings: PlatformAiSettings | null | undefined,
  header: string,
): string | null {
  if (!settings) return null;
  const topics = (settings.prohibitedTopics ?? []).map(sanitizeTopic).filter(Boolean);
  if (topics.length === 0) return null;

  return [
    header,
    [
      "Prohibited topics. Do not discuss or engage with these topics; gently decline and redirect:",
      ...topics.map((topic) => `- ${topic}`),
    ].join("\n"),
    "Keep any required output format.",
  ].join("\n\n");
}

/** Platform rules block (prohibited topics), or null when there are none. */
export function buildPlatformRulesBlock(
  settings: PlatformAiSettings | null | undefined,
): string | null {
  return buildRulesBlockWithHeader(settings, PLATFORM_RULES_HEADER);
}

/**
 * Same rules restated near the end of the chat prompt so a late instruction (e.g. the
 * session-open lifecycle) or earlier assistant turns cannot out-weigh them (NCLDD-53 BUG-1).
 */
export function buildPlatformRulesReminderBlock(
  settings: PlatformAiSettings | null | undefined,
): string | null {
  return buildRulesBlockWithHeader(settings, PLATFORM_RULES_REMINDER_HEADER);
}

/** Tone block, or null when empty. Always subordinate to safety and platform rules. */
export function buildToneBlock(settings: PlatformAiSettings | null | undefined): string | null {
  if (!settings) return null;
  const tone = sanitizeAdminText(settings.toneOfVoice ?? "");
  if (!tone) return null;
  return [
    TONE_OF_VOICE_HEADER,
    wrapAdminText(tone),
    "Apply this as style only. Keep any required output format.",
  ].join("\n\n");
}

/**
 * Wrap a standalone system prompt: platform rules → original prompt → tone.
 * The global system prompt (coaching base) is chat-only and not applied here.
 */
export function withPlatformSettings(
  system: string,
  settings: PlatformAiSettings | null | undefined,
): string {
  const rules = buildPlatformRulesBlock(settings);
  const tone = buildToneBlock(settings);
  if (!rules && !tone) return system;
  return [rules, system, tone].filter(Boolean).join(PROMPT_BLOCK_SEPARATOR);
}

/** On error keep the last good settings (briefly) so prohibited topics do not silently vanish. */
function fallbackAfterError(reason: unknown): PlatformAiSettings {
  const settings = cache?.settings ?? EMPTY_PLATFORM_AI_SETTINGS;
  console.warn(
    cache
      ? "loadPlatformAiSettings using last known settings"
      : "loadPlatformAiSettings fallback to empty settings",
    reason,
  );
  cache = { loadedAt: Date.now(), ttlMs: ERROR_CACHE_TTL_MS, settings };
  return settings;
}

/**
 * Load settings (60s module cache). Errors never throw — platform settings must never
 * break an AI reply. Pass a service-role client or a factory (called only on cache miss).
 */
export async function loadPlatformAiSettings(
  client: SupabaseClient | (() => SupabaseClient),
): Promise<PlatformAiSettings> {
  if (cache && Date.now() - cache.loadedAt <= cache.ttlMs) {
    return cache.settings;
  }

  try {
    const resolved = typeof client === "function" ? client() : client;
    const { data, error } = await resolved
      .from("platformAiSettings")
      .select("globalSystemPrompt, prohibitedTopics, toneOfVoice")
      .eq("id", 1)
      .maybeSingle();

    if (error) return fallbackAfterError(error.code ?? error.message);

    const settings = normalizePlatformAiSettingsRow(data);
    cache = { loadedAt: Date.now(), ttlMs: CACHE_TTL_MS, settings };
    return settings;
  } catch (err) {
    return fallbackAfterError(err);
  }
}
