/**
 * NCLDD-57 S6 — finalize a finished Conversation-mode session with the existing chat
 * `session_finalize` (session memory, coachingSessionArchive, memory facts, insights by consent).
 * Uses the persisted transcript (what `realtime-voice` saved), not the client's live copy.
 */
import type { ChatMessage } from "@/components/chat/types";
import { fetchMessagesForConversation } from "@/lib/chat/chatMessagesApi";
import { finalizeSessionFromThread } from "@/lib/chat/chatSessionLifecycleApi";
import { INAUDIBLE_PLACEHOLDER } from "./persistQueue";
import type { RealtimeEndReason } from "./realtimeErrors";

/**
 * Ends that close the conversation for good. Recoverable ends (network/mic/connect/error) wait:
 * the user may Try again in the same conversation, which a finalized conversation would refuse.
 * Crisis is not finalized, like a chat thread that hit the crisis hard stop.
 */
const FINAL_END_REASONS: ReadonlySet<RealtimeEndReason> = new Set([
  "user_ended",
  "max_duration",
  "idle_timeout",
  "budget_reached",
]);

export function shouldFinalizeOnEnd(reason: RealtimeEndReason | null | undefined): boolean {
  return reason ? FINAL_END_REASONS.has(reason) : false;
}

/** Something the user actually said (not only `[inaudible]`). */
export function hasUserSpeech(messages: readonly ChatMessage[]): boolean {
  return messages.some(
    (message) => message.role === "user" && message.content.trim() && message.content.trim() !== INAUDIBLE_PLACEHOLDER,
  );
}

export type FinalizeDeps = {
  fetchMessages: (conversationId: string) => Promise<ChatMessage[]>;
  finalize: (messages: ChatMessage[], conversationId: string) => Promise<unknown>;
};

const defaultDeps: FinalizeDeps = {
  fetchMessages: (conversationId) => fetchMessagesForConversation(conversationId),
  finalize: (messages, conversationId) =>
    finalizeSessionFromThread(messages, undefined, undefined, conversationId, "voice_conversation"),
};

/** `saved` = finalized; `skipped` = nothing to finalize. Throws when finalize fails (stays unfinalized). */
export async function finalizeRealtimeConversation(
  conversationId: string,
  deps: FinalizeDeps = defaultDeps,
): Promise<"saved" | "skipped"> {
  const messages = await deps.fetchMessages(conversationId);
  if (!hasUserSpeech(messages)) return "skipped";
  await deps.finalize(messages, conversationId);
  return "saved";
}
