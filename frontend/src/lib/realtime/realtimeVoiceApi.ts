/**
 * NCLDD-57 S4 — typed client for the `realtime-voice` edge function (plan §5.2). The function
 * ships in S3 (T-027); this is the contract the hook codes against.
 */
import { supabase } from "@/integrations/supabase/client";
import { AI_MONTHLY_LIMIT_CODE, FREE_TIER_LIMIT_CODE } from "@/lib/chat/chatSessionLimit";
import { apiErrorMessage, type RealtimeApiErrorCode, type RealtimeEndReason } from "./realtimeErrors";
import type { RealtimeUsagePayload } from "./realtimeUsage";
import type { PersistItem } from "./persistQueue";
import type { RealtimeVoice } from "./realtimeVoices";

export const REALTIME_VOICE_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/realtime-voice`;

export class RealtimeApiError extends Error {
  code: RealtimeApiErrorCode;
  status: number;

  constructor(code: RealtimeApiErrorCode, status: number, serverMessage?: string | null) {
    super(apiErrorMessage(code, serverMessage));
    this.name = "RealtimeApiError";
    this.code = code;
    this.status = status;
  }
}

export type RealtimeStartResult = {
  realtimeSessionId: string;
  conversationId: string;
  sdpAnswer: string;
  model: string;
  voice: string;
  expiresAt: string;
  heartbeatSec: number;
  idleTimeoutSec: number;
};

export type RealtimeHeartbeatStop = "budget_reached" | "max_duration";

export type RealtimeCounters = { responsesSeen: number; transcriptionsSeen: number };

type Payload = Record<string, unknown>;

const KNOWN_CODES: ReadonlySet<string> = new Set([
  AI_MONTHLY_LIMIT_CODE,
  FREE_TIER_LIMIT_CODE,
  "realtime_conversation_tier_required",
  "realtime_session_active",
  "realtime_unavailable",
  "crisis",
]);

/** HTTP status + body → typed error code. */
export function realtimeErrorCode(status: number, code: unknown): RealtimeApiErrorCode {
  if (typeof code === "string" && KNOWN_CODES.has(code)) return code as RealtimeApiErrorCode;
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 429) return "rate_limited";
  if (status === 409) return "realtime_session_active";
  if (status >= 500) return "realtime_unavailable";
  return "request_failed";
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new RealtimeApiError("unauthorized", 401);
  return token;
}

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    "Content-Type": "application/json",
  };
}

async function call(action: string, body: Payload): Promise<Payload> {
  const token = await getAccessToken();
  let response: Response;
  try {
    response = await fetch(REALTIME_VOICE_ENDPOINT, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({ action, ...body }),
    });
  } catch {
    throw new RealtimeApiError("network_error", 0);
  }

  let payload: Payload = {};
  try {
    const parsed: unknown = await response.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) payload = parsed as Payload;
  } catch {
    if (response.ok) throw new RealtimeApiError("invalid_response", response.status);
  }

  if (!response.ok) {
    const message = typeof payload.error === "string" ? payload.error : null;
    throw new RealtimeApiError(realtimeErrorCode(response.status, payload.code), response.status, message);
  }
  return payload;
}

function requireString(payload: Payload, key: string): string {
  const value = payload[key];
  if (typeof value !== "string" || !value) throw new RealtimeApiError("invalid_response", 200);
  return value;
}

function requireNumber(payload: Payload, key: string): number {
  const value = payload[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new RealtimeApiError("invalid_response", 200);
  }
  return value;
}

export async function startRealtimeSession(input: {
  sdpOffer: string;
  voice: RealtimeVoice;
  conversationId?: string | null;
}): Promise<RealtimeStartResult> {
  const payload = await call("start", {
    sdpOffer: input.sdpOffer,
    voice: input.voice,
    ...(input.conversationId ? { conversationId: input.conversationId } : {}),
  });
  return {
    realtimeSessionId: requireString(payload, "realtimeSessionId"),
    conversationId: requireString(payload, "conversationId"),
    sdpAnswer: requireString(payload, "sdpAnswer"),
    model: requireString(payload, "model"),
    voice: requireString(payload, "voice"),
    expiresAt: requireString(payload, "expiresAt"),
    heartbeatSec: requireNumber(payload, "heartbeatSec"),
    idleTimeoutSec: requireNumber(payload, "idleTimeoutSec"),
  };
}

export async function markRealtimeConnected(realtimeSessionId: string): Promise<void> {
  await call("connected", { realtimeSessionId });
}

export async function sendRealtimeHeartbeat(
  realtimeSessionId: string,
  counters: RealtimeCounters,
): Promise<{ stop: RealtimeHeartbeatStop | null }> {
  const payload = await call("heartbeat", { realtimeSessionId, ...counters });
  const stop = payload.stop === "budget_reached" || payload.stop === "max_duration" ? payload.stop : null;
  return { stop };
}

export async function reportRealtimeUsage(
  realtimeSessionId: string,
  usage: RealtimeUsagePayload,
): Promise<{ duplicate: boolean }> {
  const payload = await call("usage", {
    realtimeSessionId,
    kind: usage.kind,
    externalEventId: usage.externalEventId,
    usage: usage.usage,
  });
  return { duplicate: payload.duplicate === true };
}

export type RealtimeCrisis = { level: number; text: string };

export async function persistRealtimeTranscript(
  realtimeSessionId: string,
  items: readonly PersistItem[],
): Promise<{ crisis: RealtimeCrisis | null }> {
  const payload = await call("transcript", { realtimeSessionId, items });
  const crisis = payload.crisis && typeof payload.crisis === "object" ? (payload.crisis as Payload) : null;
  if (!crisis || typeof crisis.text !== "string") return { crisis: null };
  return { crisis: { level: typeof crisis.level === "number" ? crisis.level : 0, text: crisis.text } };
}

/** Tool output for the model; `tool_not_available` comes back as an error string, never throws. */
export async function callRealtimeTool(input: {
  realtimeSessionId: string;
  callId: string;
  name: string;
  arguments: string;
}): Promise<{ output: string } | { error: string }> {
  const payload = await call("tool", input);
  if (typeof payload.output === "string") return { output: payload.output };
  return { error: typeof payload.error === "string" ? payload.error : "tool_failed" };
}

export type RealtimeEndInput = RealtimeCounters & {
  realtimeSessionId: string;
  reason: RealtimeEndReason;
};

export async function endRealtimeSession(input: RealtimeEndInput): Promise<{ usageStatus: string | null }> {
  const payload = await call("end", { ...input });
  return { usageStatus: typeof payload.usageStatus === "string" ? payload.usageStatus : null };
}

/**
 * Fire-and-forget `end` for `pagehide` / `beforeunload`: no awaits before the request (the page
 * may be gone), so the caller passes the access token it already holds.
 */
export function endRealtimeSessionKeepalive(input: RealtimeEndInput, accessToken: string): void {
  try {
    void fetch(REALTIME_VOICE_ENDPOINT, {
      method: "POST",
      headers: headers(accessToken),
      body: JSON.stringify({ action: "end", ...input }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Unload path: nothing to report to.
  }
}
