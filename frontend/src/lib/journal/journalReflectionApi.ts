import { supabase } from "@/integrations/supabase/client";
import {
  saveJournalEntryReflection,
  type JournalEntryListItem,
} from "@/lib/journal/journalEntriesApi";

const CHAT_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

function buildReflectionPrompt(
  entry: Pick<JournalEntryListItem, "title_text" | "mood_tag_text" | "content_text">,
): string {
  return `You are a warm, grounded coaching companion. Read this private journal entry and offer a brief, compassionate coaching reflection in 2–4 short paragraphs. Do not diagnose or give medical or psychiatric advice. Name patterns kindly and suggest one small, concrete next step.

Title: ${entry.title_text}
Mood: ${entry.mood_tag_text ?? "Not specified"}
Entry:
${entry.content_text}`;
}

async function readChatStreamText(response: Response): Promise<string> {
  if (!response.body) throw new Error("AI reflection response was empty");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") continue;

      if (trimmed.startsWith("data:")) {
        try {
          const json = JSON.parse(trimmed.slice(5).trim()) as {
            type?: string;
            delta?: string;
          };
          if (json.type === "text-delta" && typeof json.delta === "string") {
            text += json.delta;
          }
        } catch {
          // ignore malformed stream chunks
        }
        continue;
      }

      const legacy = trimmed.match(/^(\d+):"((?:\\.|[^"\\])*)"/);
      if (legacy) {
        text += legacy[2]
          .replace(/\\"/g, '"')
          .replace(/\\n/g, "\n")
          .replace(/\\\\/g, "\\");
      }
    }
  }

  const reflection = text.trim();
  if (!reflection) throw new Error("AI reflection response was empty");
  return reflection;
}

/**
 * Generate and persist AI coaching reflection for a journal entry via the chat edge function.
 */
export async function generateJournalReflection(
  userId: string,
  entry: JournalEntryListItem,
  onboardingData?: Record<string, unknown> | null,
): Promise<JournalEntryListItem> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      messages: [
        {
          id: crypto.randomUUID(),
          role: "user",
          parts: [{ type: "text", text: buildReflectionPrompt(entry) }],
        },
      ],
      context: "journal-reflection",
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 402) {
      throw new Error("AI credits are exhausted. Add credits in Settings to continue.");
    }
    if (response.status === 429) {
      throw new Error("Too many requests — please wait a moment and try again.");
    }
    throw new Error(detail || `AI reflection failed (${response.status})`);
  }

  const reflectionText = await readChatStreamText(response);
  return saveJournalEntryReflection(userId, entry.id, reflectionText, onboardingData);
}
