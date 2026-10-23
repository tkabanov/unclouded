import type { RealtimeTool } from "./tools/registry.ts";
import { realtimeToolDefinitions } from "./tools/registry.ts";

/** NCLDD-57 — realtime session limits and defaults (plan §5.3, spike T-024). */

export const DEFAULT_REALTIME_MODEL = "gpt-realtime-2.1";
export const DEFAULT_REALTIME_TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";

/** Voices documented for realtime (spike §1.7); voice is fixed at start (C9). */
export const REALTIME_VOICE_ALLOWLIST = [
  "marin",
  "cedar",
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "sage",
  "shimmer",
  "verse",
] as const;

export type RealtimeVoiceName = (typeof REALTIME_VOICE_ALLOWLIST)[number];

export function isAllowedRealtimeVoice(value: unknown): value is RealtimeVoiceName {
  return typeof value === "string" && (REALTIME_VOICE_ALLOWLIST as readonly string[]).includes(value);
}

/**
 * NCLDD-64 / OVR-080: an AI session lasts at most 60 min (product rule, was 58). OpenAI also ends
 * a call at 60 min with an undocumented signal (C6), so its cut may race ours at the very end.
 * The client ends at `expiresAt`, heartbeat answers `max_duration` after it.
 */
export const REALTIME_SESSION_MAX_MS = 60 * 60_000;
export const REALTIME_HEARTBEAT_SEC = 30;
/** Idle auto-end is ours (C8: `idle_timeout_ms` is server_vad only). */
export const REALTIME_IDLE_TIMEOUT_SEC = 10 * 60;
/** Instructions cap for 2.1 is not documented (C11): log above this estimate, never cut. */
export const REALTIME_INSTRUCTIONS_SOFT_LIMIT_TOKENS = 16_000;
/** `usage` / `transcript` are still accepted this long after `end` (final flush). */
export const REALTIME_POST_END_GRACE_MS = 10 * 60_000;

export function buildRealtimeSessionConfig(input: {
  model: string;
  instructions: string;
  voice: RealtimeVoiceName;
  transcribeModel: string;
  tools: readonly RealtimeTool[];
}): Record<string, unknown> {
  const config: Record<string, unknown> = {
    type: "realtime",
    model: input.model,
    instructions: input.instructions,
    audio: {
      input: {
        turn_detection: { type: "semantic_vad", create_response: true, interrupt_response: true },
        transcription: { model: input.transcribeModel, language: "en" },
      },
      output: { voice: input.voice },
    },
    truncation: { type: "retention_ratio", retention_ratio: 0.8 },
  };
  const tools = realtimeToolDefinitions(input.tools);
  if (tools.length > 0) {
    config.tools = tools;
    config.tool_choice = "auto";
  }
  return config;
}
