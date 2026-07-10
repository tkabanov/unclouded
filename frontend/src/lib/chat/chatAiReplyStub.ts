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

async function parseChatError(response: Response): Promise<never> {
  let message = `chat edge function ${response.status}`;
  try {
    const payload = (await response.json()) as { error?: unknown };
    if (typeof payload.error === "string" && payload.error.trim()) {
      message = payload.error.trim();
    }
  } catch {
    // Non-JSON error responses still surface the status.
  }
  if (response.status === 402) {
    throw new Error("AI credits are exhausted. Add credits in Settings to continue.");
  }
  if (response.status === 429) {
    throw new Error("Too many requests — please wait a moment and try again.");
  }
  throw new Error(message);
}

type CallChatEdgeParams = {
  lifecycle?: ChatLifecycleMode;
  messages: ChatMessage[];
  context?: string;
  profileData?: ChatAiProfileData;
  expectJson?: boolean;
};

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
      profileData: params.profileData,
    }),
  });

  if (!response.ok) {
    return parseChatError(response);
  }

  if (params.expectJson) {
    return (await response.json()) as Record<string, unknown>;
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
): Promise<string> {
  const result = await callChatEdge({ messages, context, profileData });
  if (typeof result !== "string") {
    throw new Error("Expected streamed AI reply");
  }
  return result;
}
