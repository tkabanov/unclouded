import type { ChatMessage } from "@/components/chat/types";

const CHAT_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const FALLBACK_REPLIES = [
  "Thank you for sharing that. What feels most important to address first?",
  "I hear you. What's one small step that might help right now?",
  "That sounds like a lot to carry. Would it help to break this into one concrete next action?",
] as const;

function toUiMessages(messages: ChatMessage[]) {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: [{ type: "text" as const, text: message.content_text }],
  }));
}

/**
 * ScheduleAPIEvent parity stub — tries project chat edge function, falls back locally.
 * Handler: supabase/functions/chat/index.ts
 */
export async function generateAiReplyStub(
  messages: ChatMessage[],
  context?: string,
): Promise<string> {
  try {
    const response = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: toUiMessages(messages),
        context,
      }),
    });

    if (!response.ok) {
      throw new Error(`chat edge function ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("empty stream");

    const decoder = new TextDecoder();
    let buffer = "";
    let assistantText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      for (const line of buffer.split("\n")) {
        if (!line.startsWith("0:")) continue;
        try {
          const payload = JSON.parse(line.slice(2)) as string;
          if (typeof payload === "string") assistantText += payload;
        } catch {
          // ignore malformed stream chunks
        }
      }
      buffer = buffer.split("\n").pop() ?? "";
    }

    const trimmed = assistantText.trim();
    if (trimmed) return trimmed;
  } catch {
    // fall through to local stub
  }

  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  const index = lastUser ? lastUser.content_text.length % FALLBACK_REPLIES.length : 0;
  return FALLBACK_REPLIES[index];
}
