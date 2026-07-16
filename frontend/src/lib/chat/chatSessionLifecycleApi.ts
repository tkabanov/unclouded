import type { ChatMessage } from "@/components/chat/types";
import type { ProfileData } from "../../../../supabase/functions/chat/prompt/types.ts";
import type { SessionFinalizePayload } from "../../../../supabase/functions/chat/prompt/sessionLifecycle.ts";
import { sanitizeSessionFinalizePayload } from "../../../../supabase/functions/chat/prompt/sessionLifecycle.ts";
import {
  CHAT_SESSION_MEMORY_KEY,
  LAST_SESSION_TOPIC_KEY,
  MICRO_COMMITMENT_ACTIVE_KEY,
  MICRO_COMMITMENT_DUE_KEY,
  readSessionMemoryRecords,
  type SessionMemoryRecord,
} from "../../../../supabase/functions/chat/sessionMemory/sessionMemoryHelpers.ts";
import { callChatEdge } from "@/lib/chat/chatAiReplyStub";

export {
  CHAT_SESSION_MEMORY_KEY,
  LAST_SESSION_TOPIC_KEY,
  MICRO_COMMITMENT_ACTIVE_KEY,
  MICRO_COMMITMENT_DUE_KEY,
};

export type SessionMemoryStub = SessionMemoryRecord;

export type SessionLifecycleState = {
  lastSessionTopic: string | null;
  sessionMemoryStubs: SessionMemoryRecord[];
  activeMicroCommitment: string | null;
  microCommitmentDue: string | null;
};

function readStringField(
  onboardingData: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const raw = onboardingData?.[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export function readSessionLifecycleState(
  onboardingData?: Record<string, unknown> | null,
): SessionLifecycleState {
  return {
    lastSessionTopic:
      readStringField(onboardingData, LAST_SESSION_TOPIC_KEY) ??
      readStringField(onboardingData, "last_session_topic"),
    sessionMemoryStubs: readSessionMemoryRecords(onboardingData),
    activeMicroCommitment:
      readStringField(onboardingData, MICRO_COMMITMENT_ACTIVE_KEY) ??
      readStringField(onboardingData, "micro_commitment_active"),
    microCommitmentDue:
      readStringField(onboardingData, MICRO_COMMITMENT_DUE_KEY) ??
      readStringField(onboardingData, "micro_commitment_due"),
  };
}

export async function requestSessionOpening(
  profileData?: ProfileData,
  context?: string,
  conversationId?: string,
): Promise<string> {
  return callChatEdge({
    lifecycle: "session_open",
    messages: [],
    profileData,
    context,
    conversationId,
  }) as Promise<string>;
}

export async function requestSessionClose(
  messages: ChatMessage[],
  profileData?: ProfileData,
  context?: string,
  conversationId?: string,
): Promise<string> {
  return callChatEdge({
    lifecycle: "session_close",
    messages,
    profileData,
    context,
    conversationId,
  }) as Promise<string>;
}

export async function requestConversationTitle(
  messages: ChatMessage[],
  conversationId: string,
): Promise<string> {
  const response = await callChatEdge({
    lifecycle: "conversation_title",
    messages,
    conversationId,
    expectJson: true,
  });

  if (typeof response !== "object" || response === null) {
    throw new Error("Invalid conversation title response");
  }

  const title = (response as { title?: unknown }).title;
  if (typeof title !== "string" || !title.trim()) {
    throw new Error("Conversation title missing from response");
  }

  return title.trim();
}

export async function finalizeSessionFromThread(
  messages: ChatMessage[],
  profileData?: ProfileData,
  context?: string,
  conversationId?: string,
): Promise<SessionFinalizePayload> {
  if (!conversationId?.trim()) {
    throw new Error("conversationId is required to finalize a session");
  }

  const response = await callChatEdge({
    lifecycle: "session_finalize",
    messages,
    profileData,
    context,
    conversationId,
    expectJson: true,
  });

  if (typeof response !== "object" || response === null) {
    throw new Error("Invalid session finalize response");
  }

  const payload = response as SessionFinalizePayload;
  const sanitized = sanitizeSessionFinalizePayload({
    lastSessionTopic: typeof payload.lastSessionTopic === "string" ? payload.lastSessionTopic : "",
    summaryStub: typeof payload.summaryStub === "string" ? payload.summaryStub : "",
    microCommitmentText:
      typeof payload.microCommitmentText === "string" ? payload.microCommitmentText : null,
    emotionalStart:
      typeof payload.emotionalStart === "string" ? payload.emotionalStart : null,
    emotionalEnd: typeof payload.emotionalEnd === "string" ? payload.emotionalEnd : null,
    keyPatternOrInsight:
      typeof payload.keyPatternOrInsight === "string" ? payload.keyPatternOrInsight : null,
    resistancePoints:
      typeof payload.resistancePoints === "string" ? payload.resistancePoints : null,
    effectivenessSignal:
      typeof payload.effectivenessSignal === "string" ? payload.effectivenessSignal : null,
  });

  if (!sanitized) {
    throw new Error("Session finalize payload incomplete");
  }

  return sanitized;
}
