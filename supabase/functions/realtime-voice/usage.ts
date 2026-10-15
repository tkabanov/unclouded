import type { AiUsageAmounts } from "../_shared/aiUsage.ts";

/**
 * NCLDD-57 §7 — validation of client-reported realtime usage and the session `usageStatus`.
 * Token columns: text tokens in input/cached/output, audio tokens in the audio* columns;
 * `inputTokens` / `audioInputTokens` include their cached part (client lib `realtimeUsage`).
 */

/** Sanity cap per event (plan §5.2): far above any real turn, blocks absurd self-reports. */
export const MAX_TOKENS_PER_EVENT = 200_000;
export const MAX_AUDIO_SECONDS_PER_EVENT = 3600;

const EXTERNAL_EVENT_ID = /^[A-Za-z0-9_.:-]{1,128}$/;

export type RealtimeUsageKind = "response" | "transcription";

export type ParsedRealtimeUsage = {
  kind: RealtimeUsageKind;
  externalEventId: string;
  usage: Required<
    Pick<
      AiUsageAmounts,
      "inputTokens" | "cachedInputTokens" | "outputTokens" | "audioInputTokens" | "cachedAudioInputTokens" | "audioOutputTokens"
    >
  > & { audioSeconds: number };
};

function tokenCount(value: unknown): number | null {
  if (value === undefined || value === null) return 0;
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_TOKENS_PER_EVENT
    ? value
    : null;
}

/** Strict schema; null when anything is off (the caller answers 400). */
export function parseRealtimeUsage(body: Record<string, unknown>): ParsedRealtimeUsage | null {
  const kind = body.kind;
  if (kind !== "response" && kind !== "transcription") return null;
  const externalEventId = body.externalEventId;
  if (typeof externalEventId !== "string" || !EXTERNAL_EVENT_ID.test(externalEventId)) return null;
  const raw = body.usage;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const u = raw as Record<string, unknown>;

  const fields = {
    inputTokens: tokenCount(u.inputTokens),
    cachedInputTokens: tokenCount(u.cachedInputTokens),
    outputTokens: tokenCount(u.outputTokens),
    audioInputTokens: tokenCount(u.audioInputTokens),
    cachedAudioInputTokens: tokenCount(u.cachedAudioInputTokens),
    audioOutputTokens: tokenCount(u.audioOutputTokens),
  };
  if (Object.values(fields).some((value) => value === null)) return null;
  const usage = fields as ParsedRealtimeUsage["usage"];
  if (usage.cachedInputTokens > usage.inputTokens || usage.cachedAudioInputTokens > usage.audioInputTokens) {
    return null;
  }

  let audioSeconds = 0;
  if (u.audioSeconds !== undefined && u.audioSeconds !== null) {
    if (
      typeof u.audioSeconds !== "number" ||
      !Number.isFinite(u.audioSeconds) ||
      u.audioSeconds < 0 ||
      u.audioSeconds > MAX_AUDIO_SECONDS_PER_EVENT
    ) {
      return null;
    }
    audioSeconds = u.audioSeconds;
  }
  usage.audioSeconds = audioSeconds;
  return { kind, externalEventId, usage };
}

export type UsageCounters = {
  connectedAt: string | null;
  responsesSeen: number;
  responsesReported: number;
  transcriptionsSeen: number;
  transcriptionsReported: number;
};

/**
 * Plan §7.3 for a session ended via `end`: never connected → complete (nothing billed);
 * everything the client saw was recorded → complete; some recorded → partial; none → unknown.
 */
export function deriveUsageStatus(row: UsageCounters): "complete" | "partial" | "unknown" {
  // Events seen means the call ran, whatever `connectedAt` says.
  if (!row.connectedAt && row.responsesSeen + row.transcriptionsSeen === 0) return "complete";
  if (row.responsesReported >= row.responsesSeen && row.transcriptionsReported >= row.transcriptionsSeen) {
    return "complete";
  }
  return row.responsesReported + row.transcriptionsReported > 0 ? "partial" : "unknown";
}
