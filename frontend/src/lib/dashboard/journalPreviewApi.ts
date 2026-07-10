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
  title: string | null;
  content: string | null;
  moodTag: string | null;
  createdAt: string;
}): JournalPreviewEntry {
  return {
    id: row.id,
    title: row.title?.trim() || "Untitled entry",
    preview: truncatePreview(row.content ?? ""),
    mood: row.moodTag,
    date: row.createdAt,
  };
}

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

/**
 * Recent journal entries for dashboard preview RG — current user, newest first.
 */
export async function fetchJournalPreviewEntries(
  userId: string,
  limit: number = JOURNAL_PREVIEW_LIMIT,
): Promise<JournalPreviewEntry[]> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("journalEntry")
    .select("id, title, content, moodTag, createdAt")
    .eq("userId", userId)
    .order("createdAt", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((row) => mapJournalRow(row as {
    id: string;
    title: string | null;
    content: string | null;
    moodTag: string | null;
    createdAt: string;
  }));
}
