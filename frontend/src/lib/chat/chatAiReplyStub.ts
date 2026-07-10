import type { ChatMessage } from "@/components/chat/types";
import { supabase } from "@/integrations/supabase/client";
import { readChatStreamText } from "@/lib/chat/readChatStreamText";
import type { ProfileData } from "../../../../supabase/functions/chat/prompt/types.ts";

const CHAT_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export type ChatAiProfileData = ProfileData;
function toUiMessages(messages: ChatMessage[]) {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: [{ type: "text" as const, text: message.content }],
  }));
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
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages: toUiMessages(messages),
      context,
      profileData,
    }),
  });

  if (!response.ok) {
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

  return readChatStreamText(response);
}
