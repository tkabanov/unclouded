import { supabase } from "@/integrations/supabase/client";
import { readChatStreamText } from "@/lib/chat/readChatStreamText";
import {
  saveJournalEntryReflection,
  type JournalEntryListItem,
} from "@/lib/journal/journalEntriesApi";

const CHAT_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

function buildReflectionPrompt(
  entry: Pick<JournalEntryListItem, "title" | "moodTag" | "content">,
): string {
  return `You are a warm, grounded coaching companion. Read this private journal entry and offer a brief, compassionate coaching reflection in 2–4 short paragraphs. Do not diagnose or give medical or psychiatric advice. Name patterns kindly and suggest one small, concrete next step.

Title: ${entry.title}
Mood: ${entry.moodTag ?? "Not specified"}
Entry:
${entry.content}`;
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
    let parsedCode: string | undefined;
    try {
      const parsed = JSON.parse(detail) as { code?: string; error?: string };
      parsedCode = parsed.code;
      if (parsedCode === "journal_reflection_tier_required") {
        throw new Error("AI journal reflection is available on Pro and Premium plans.");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("Pro and Premium")) {
        throw error;
      }
    }
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
