import { supabase } from "@/integrations/supabase/client";

export const JOURNAL_PREVIEW_LIMIT = 3 as const;

export interface JournalPreviewEntry {
  id: string;
  title: string;
  preview: string;
  mood: string | null;
  date: string;
}

function truncatePreview(body: string, maxLength = 120): string {
  const trimmed = body.trim();
  if (!trimmed) return "";
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

function mapJournalRow(row: {
  id: string;
  title: string;
  body: string;
  mood: string | null;
  created_at: string;
}): JournalPreviewEntry {
  return {
    id: row.id,
    title: row.title.trim() || "Untitled entry",
    preview: truncatePreview(row.body),
    mood: row.mood,
    date: row.created_at,
  };
}

/**
 * Recent journal entries for dashboard preview RG — current user, newest first.
 */
export async function fetchJournalPreviewEntries(
  userId: string,
  limit: number = JOURNAL_PREVIEW_LIMIT,
): Promise<JournalPreviewEntry[]> {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, title, body, mood, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(mapJournalRow);
}
