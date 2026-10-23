import type { ChatLifecycleMode } from "./prompt/sessionLifecycle.ts";

/** NCLDD-64 / OVR-080: one AI coaching session lasts at most 60 minutes from its start. */
export const AI_SESSION_MAX_MINUTES = 60;
export const AI_SESSION_MAX_MS = AI_SESSION_MAX_MINUTES * 60_000;

export const SESSION_TIME_LIMIT_CODE = "session_time_limit";

export const SESSION_TIME_LIMIT_MESSAGE =
  "This session has reached its 60-minute limit. Let's wrap it up — you can start a new session right after.";

/**
 * Only coaching turns (and the opener) are time-limited. Close, close-ack, finalize and title
 * calls stay allowed so an expired session can always be wrapped up and saved.
 */
export function isTimeLimitedLifecycle(lifecycle: ChatLifecycleMode | undefined): boolean {
  return lifecycle === undefined || lifecycle === "session_open";
}

/** True when the conversation started more than 60 minutes ago. Unknown start → not limited. */
export function isSessionPastTimeLimit(
  conversationCreatedAt: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!conversationCreatedAt) return false;
  const startedAt = Date.parse(conversationCreatedAt);
  if (Number.isNaN(startedAt)) return false;
  return now - startedAt >= AI_SESSION_MAX_MS;
}
