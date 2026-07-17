import type { ChatMessage } from "@/components/chat/types";
import { supabase } from "@/integrations/supabase/client";
import { readChatStreamText } from "@/lib/chat/readChatStreamText";
import type { ProfileData } from "../../../../supabase/functions/chat/prompt/types.ts";
import type { ChatLifecycleMode } from "../../../../supabase/functions/chat/prompt/sessionLifecycle.ts";

const CHAT_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export type ChatAiProfileData = ProfileData;

function toUiMessages(messages: ChatMessage[]) {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: [{ type: "text" as const, text: message.content }],
  }));
}

async function getAuthToken(): Promise<string> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return token;
}

export class ChatEdgeError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ChatEdgeError";
    this.code = code;
  }
}

type ChatErrorPayload = {
  error?: unknown;
  code?: unknown;
};

async function parseChatError(response: Response): Promise<never> {
  let message = `chat edge function ${response.status}`;
  let code: string | undefined;

  try {
    const payload = (await response.json()) as ChatErrorPayload;
    if (typeof payload.error === "string" && payload.error.trim()) {
      message = payload.error.trim();
    }
    if (typeof payload.code === "string") {
      code = payload.code;
    }
  } catch {
    // Non-JSON error responses still surface the status.
  }

  if (response.status === 401) {
    throw new ChatEdgeError("Your session expired. Please sign in again.", "unauthorized");
  }
  if (response.status === 402) {
    if (code === "free_tier_session_limit") {
      throw new ChatEdgeError(message, code);
    }
    throw new ChatEdgeError(
      "AI credits are exhausted. Add credits in Settings to continue.",
      "openai_quota",
    );
  }
  if (response.status === 429) {
    throw new ChatEdgeError("Too many requests — please wait a moment and try again.", "rate_limit");
  }
  throw new ChatEdgeError(message, code);
}

type CallChatEdgeParams = {
  lifecycle?: ChatLifecycleMode;
  messages: ChatMessage[];
  context?: string;
  profileData?: ChatAiProfileData;
  conversationId?: string;
  sessionType?: "text" | "voice" | "quick_checkin";
  exchangeCount?: number;
  expectJson?: boolean;
};

function isCrisisPayload(payload: Record<string, unknown>): payload is { crisis: true; text: string } {
  return payload.crisis === true && typeof payload.text === "string";
}

function isConversationTitlePayload(
  payload: Record<string, unknown>,
): payload is { title: string } {
  return typeof payload.title === "string" && payload.title.trim().length > 0;
}

function isFinalizePayload(payload: Record<string, unknown>): boolean {
  return (
    typeof payload.lastSessionTopic === "string" &&
    typeof payload.summaryStub === "string"
  );
}

export async function callChatEdge(
  params: CallChatEdgeParams,
): Promise<string | Record<string, unknown>> {
  const token = await getAuthToken();

  const response = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      lifecycle: params.lifecycle,
      messages: toUiMessages(params.messages),
      context: params.context,
      conversationId: params.conversationId,
      sessionType: params.sessionType,
      exchangeCount: params.exchangeCount,
    }),
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    return parseChatError(response);
  }

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as Record<string, unknown>;
    if (params.expectJson && isFinalizePayload(payload)) {
      return payload;
    }
    if (params.expectJson && isConversationTitlePayload(payload)) {
      return payload;
    }
    if (isCrisisPayload(payload)) {
      return payload.text;
    }
    if (params.expectJson) {
      return payload;
    }
    throw new ChatEdgeError("Unexpected JSON response from chat edge function");
  }

  return readChatStreamText(response);
}

/**
 * ScheduleAPIEvent parity — calls project chat edge function.
 * Handler: supabase/functions/chat/index.ts
 */
export async function generateAiReplyStub(
  messages: ChatMessage[],
  context?: string,
  profileData?: ChatAiProfileData,
  conversationId?: string,
  sessionType?: "text" | "voice" | "quick_checkin",
): Promise<string> {
  const exchangeCount = messages.filter((m) => m.role === "user").length;
  const result = await callChatEdge({
    messages,
    context,
    profileData,
    conversationId,
    sessionType,
    exchangeCount,
  });
  if (typeof result !== "string") {
    throw new ChatEdgeError("Expected streamed AI reply");
  }
  return result;
}
