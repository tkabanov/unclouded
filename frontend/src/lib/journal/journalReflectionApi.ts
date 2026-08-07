import { supabase } from "@/integrations/supabase/client";
import {
  fetchJournalEntryById,
  saveJournalEntryReflection,
  type JournalEntryListItem,
} from "@/lib/journal/journalEntriesApi";

const REFLECTION_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-journal-reflection`;

/**
 * Generate and persist Kota journal reflection via standalone edge function.
 * Fire-and-forget after create; display only after reflectionReady on a later visit.
 */
export async function generateJournalReflection(
  userId: string,
  entry: Pick<JournalEntryListItem, "id">,
  onboardingData?: Record<string, unknown> | null,
): Promise<JournalEntryListItem> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(REFLECTION_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ entryId: entry.id }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    try {
      const parsed = JSON.parse(detail) as { code?: string; error?: string };
      if (parsed.code === "journal_reflection_tier_required") {
        throw new Error("AI journal reflection is available on Pro and Premium plans.");
      }
      if (parsed.error) throw new Error(parsed.error);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Pro and Premium")) {
        throw error;
      }
    }
    throw new Error(detail || `AI reflection failed (${response.status})`);
  }

  const payload = (await response.json()) as { reflection?: string };
  const reflectionText =
    typeof payload.reflection === "string" ? payload.reflection.trim() : "";
  if (!reflectionText) {
    throw new Error("Empty reflection from Kota");
  }

  return saveJournalEntryReflection(userId, entry.id, reflectionText, onboardingData);
}

/** Best-effort background trigger after journal create (errors are swallowed by caller). */
export async function requestJournalReflectionInBackground(
  entryId: string,
): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return;

  await fetch(REFLECTION_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ entryId }),
  });
}

export async function loadJournalEntryWithReflection(
  userId: string,
  entryId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<JournalEntryListItem | null> {
  return fetchJournalEntryById(userId, entryId, onboardingData);
}
