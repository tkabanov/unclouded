import type { ChatMessage } from "@/components/chat/types";
import { patchOnboardingAndResults } from "@/lib/userProfile/profileFieldPatch";
import type { ProfileData } from "../../../../supabase/functions/chat/prompt/types.ts";
import type { SessionFinalizePayload } from "../../../../supabase/functions/chat/prompt/sessionLifecycle.ts";
import { sanitizeSessionFinalizePayload } from "../../../../supabase/functions/chat/prompt/sessionLifecycle.ts";
import { callChatEdge } from "@/lib/chat/chatAiReplyStub";

export const CHAT_SESSION_MEMORY_KEY = "chat_session_memory" as const;
export const LAST_SESSION_TOPIC_KEY = "last_session_topic_text" as const;
export const MICRO_COMMITMENT_ACTIVE_KEY = "micro_commitment_active_text" as const;
export const MICRO_COMMITMENT_DUE_KEY = "micro_commitment_due_date" as const;

const MAX_SESSION_MEMORY_STUBS = 5;
const DEFAULT_COMMITMENT_DUE_DAYS = 7;

export type SessionMemoryStub = {
  conversationId: string;
  closedAt: string;
  topic: string;
  summaryStub: string;
  microCommitment?: string | null;
};

export type SessionLifecycleState = {
  lastSessionTopic: string | null;
  sessionMemoryStubs: SessionMemoryStub[];
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

function readSessionMemoryStubs(
  onboardingData: Record<string, unknown> | null | undefined,
): SessionMemoryStub[] {
  const raw = onboardingData?.[CHAT_SESSION_MEMORY_KEY];
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"))
    .map((entry) => {
      const conversationId =
        typeof entry.conversationId === "string" ? entry.conversationId : "";
      const closedAt = typeof entry.closedAt === "string" ? entry.closedAt : "";
      const topic = typeof entry.topic === "string" ? entry.topic.trim() : "";
      const summaryStub =
        typeof entry.summaryStub === "string" ? entry.summaryStub.trim() : "";
      if (!conversationId || !topic || !summaryStub) return null;
      const microCommitment =
        typeof entry.microCommitment === "string"
          ? entry.microCommitment.trim()
          : entry.microCommitment === null
            ? null
            : undefined;
      return {
        conversationId,
        closedAt: closedAt || new Date().toISOString(),
        topic,
        summaryStub,
        microCommitment,
      } satisfies SessionMemoryStub;
    })
    .filter((stub): stub is SessionMemoryStub => stub !== null)
    .slice(-MAX_SESSION_MEMORY_STUBS);
}

export function readSessionLifecycleState(
  onboardingData?: Record<string, unknown> | null,
): SessionLifecycleState {
  return {
    lastSessionTopic:
      readStringField(onboardingData, LAST_SESSION_TOPIC_KEY) ??
      readStringField(onboardingData, "last_session_topic"),
    sessionMemoryStubs: readSessionMemoryStubs(onboardingData),
    activeMicroCommitment:
      readStringField(onboardingData, MICRO_COMMITMENT_ACTIVE_KEY) ??
      readStringField(onboardingData, "micro_commitment_active"),
    microCommitmentDue:
      readStringField(onboardingData, MICRO_COMMITMENT_DUE_KEY) ??
      readStringField(onboardingData, "micro_commitment_due"),
  };
}

function defaultCommitmentDueDate(): string {
  const due = new Date();
  due.setDate(due.getDate() + DEFAULT_COMMITMENT_DUE_DAYS);
  return due.toISOString().slice(0, 10);
}

export async function saveSessionCloseRecord(
  userId: string,
  conversationId: string,
  finalize: SessionFinalizePayload,
  existingOnboarding?: Record<string, unknown> | null,
): Promise<void> {
  const sanitized = sanitizeSessionFinalizePayload(finalize);
  if (!sanitized) {
    throw new Error("Session finalize payload invalid after sanitization");
  }

  const onboarding = existingOnboarding ?? {};
  const priorStubs = readSessionMemoryStubs(onboarding);
  const nextStub: SessionMemoryStub = {
    conversationId,
    closedAt: new Date().toISOString(),
    topic: sanitized.lastSessionTopic,
    summaryStub: sanitized.summaryStub,
    microCommitment: sanitized.microCommitmentText,
  };

  const onboardingPatch: Record<string, unknown> = {
    [LAST_SESSION_TOPIC_KEY]: sanitized.lastSessionTopic,
    [CHAT_SESSION_MEMORY_KEY]: [...priorStubs, nextStub].slice(-MAX_SESSION_MEMORY_STUBS),
  };

  if (sanitized.microCommitmentText) {
    onboardingPatch[MICRO_COMMITMENT_ACTIVE_KEY] = sanitized.microCommitmentText;
    onboardingPatch[MICRO_COMMITMENT_DUE_KEY] = defaultCommitmentDueDate();
  }

  await patchOnboardingAndResults(userId, onboardingPatch);
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

export async function finalizeSessionFromThread(
  messages: ChatMessage[],
  profileData?: ProfileData,
  context?: string,
  conversationId?: string,
): Promise<SessionFinalizePayload> {
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
  });

  if (!sanitized) {
    throw new Error("Session finalize payload incomplete");
  }

  return sanitized;
}
