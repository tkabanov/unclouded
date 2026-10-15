/**
 * NCLDD-57 S4 — user copy for the Conversation mode error matrix (plan §6.4).
 */
import {
  AI_MONTHLY_LIMIT_CODE,
  FREE_TIER_LIMIT_CODE,
  FREE_TIER_UPSELL_MESSAGE,
  formatMonthlyAiLimitMessage,
} from "@/lib/chat/chatSessionLimit";

/** Server `endReason` values (`realtimeVoiceSession."endReason"` CHECK). */
export type RealtimeEndReason =
  | "user_ended"
  | "max_duration"
  | "idle_timeout"
  | "network_lost"
  | "connect_failed"
  | "mic_lost"
  | "budget_reached"
  | "crisis"
  | "error"
  | "abandoned";

export type RealtimeMicErrorKind = "mic_denied" | "mic_not_found" | "mic_busy" | "mic_error";

export type RealtimeApiErrorCode =
  | typeof AI_MONTHLY_LIMIT_CODE
  | typeof FREE_TIER_LIMIT_CODE
  | "realtime_conversation_tier_required"
  | "realtime_session_active"
  | "realtime_unavailable"
  | "crisis"
  | "rate_limited"
  | "unauthorized"
  | "invalid_response"
  | "network_error"
  | "request_failed";

export const REALTIME_MIC_PERMISSION_HINT = "We'll ask for microphone access when you start.";
export const REALTIME_OFFLINE_MESSAGE = "You're offline. Reconnect to start a conversation.";
export const REALTIME_SESSION_ACTIVE_MESSAGE = "A conversation is already running in another tab.";

const MIC_MESSAGES: Record<RealtimeMicErrorKind, string> = {
  mic_denied:
    "Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.",
  mic_not_found: "No microphone found. Connect a microphone and try again.",
  mic_busy: "Your microphone is being used by another app. Close it and try again.",
  mic_error: "We couldn't start your microphone. Please try again.",
};

/** Map a `getUserMedia` DOMException name to an error kind. */
export function micErrorKind(name: string | null | undefined): RealtimeMicErrorKind {
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
    case "PermissionDeniedError":
      return "mic_denied";
    case "NotFoundError":
    case "OverconstrainedError":
    case "DevicesNotFoundError":
      return "mic_not_found";
    case "NotReadableError":
    case "TrackStartError":
      return "mic_busy";
    default:
      return "mic_error";
  }
}

export function micErrorMessage(kind: RealtimeMicErrorKind): string {
  return MIC_MESSAGES[kind];
}

/** Copy for a failed `realtime-voice` call. */
export function apiErrorMessage(code: RealtimeApiErrorCode, serverMessage?: string | null): string {
  switch (code) {
    case AI_MONTHLY_LIMIT_CODE:
      return formatMonthlyAiLimitMessage("voice");
    case FREE_TIER_LIMIT_CODE:
      return FREE_TIER_UPSELL_MESSAGE;
    case "realtime_conversation_tier_required":
      return serverMessage?.trim() || "Conversation mode isn't included in your plan.";
    case "realtime_session_active":
      return REALTIME_SESSION_ACTIVE_MESSAGE;
    case "crisis":
      // The server sends the same crisis text as chat.
      return serverMessage?.trim() || "Please reach out for support. If you are in crisis, call or text 988.";
    case "rate_limited":
      return "Too many attempts. Please wait a moment and try again.";
    case "unauthorized":
      return "Your session has expired. Please sign in again.";
    case "network_error":
      return "We couldn't reach the server. Check your connection and try again.";
    case "realtime_unavailable":
    case "invalid_response":
    case "request_failed":
      return "Conversation mode is unavailable right now. Please try again.";
  }
}

/** Limit errors block Start, like the voice-messages banner. */
export function isRealtimeLimitCode(code: string | null | undefined): boolean {
  return code === AI_MONTHLY_LIMIT_CODE || code === FREE_TIER_LIMIT_CODE;
}

/**
 * Message shown after a session ended. `null` = no message (the user ended it, or the crisis
 * block replaces the panel).
 */
export function endReasonMessage(reason: RealtimeEndReason): string | null {
  switch (reason) {
    case "user_ended":
    case "crisis":
      return null;
    case "max_duration":
      return "This conversation reached the 60-minute limit.";
    case "idle_timeout":
      return "The conversation ended after a long silence.";
    case "network_lost":
      return "The connection was lost. Tap Try again to continue this conversation.";
    case "connect_failed":
      return "We couldn't connect the conversation. Please try again.";
    case "mic_lost":
      return "Your microphone was disconnected. Tap Try again to continue this conversation.";
    case "budget_reached":
      return formatMonthlyAiLimitMessage("voice");
    case "error":
    case "abandoned":
      return "Something went wrong and the conversation ended.";
  }
}

/** Whether "Try again" makes sense after this end reason (same conversation, new realtime session). */
export function canRetryAfter(reason: RealtimeEndReason): boolean {
  return reason === "network_lost" || reason === "connect_failed" || reason === "mic_lost" || reason === "error";
}

/**
 * Server `error` events that end the session. The 60-min end is not documented (C6):
 * `session_expired` is treated as the max-duration end. Everything else is logged only.
 */
export function endReasonForServerError(code: string | null | undefined): RealtimeEndReason | null {
  return code === "session_expired" ? "max_duration" : null;
}
