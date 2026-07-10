import { supabase } from "@/integrations/supabase/client";

/** List row mapped from uds_journalentry field names in API surface. */
export interface JournalEntryListItem {
  id: string;
  title: string;
  moodTag: string | null;
  content: string;
  content_preview: string;
  createdAt: string;
  updatedAt: string;
  aiReflection: string | null;
  has_ai_reflection: boolean;
}

/** Bubble uds_journalentry create payload. */
export interface JournalEntryInput {
  title: string;
  moodTag: string | null;
  content: string;
}

/** Stored in profiles.onboardingData when uds_journalentry table is absent. */
export const JOURNAL_ENTRIES_ONBOARDING_KEY = "journal_entries" as const;

/** Reflection text keyed by entry id when uds_journalentry / aiReflection column is absent. */
export const JOURNAL_REFLECTIONS_ONBOARDING_KEY = "journal_entry_reflections" as const;

type JournalEntryRow = {
  id: string;
  title?: string | null;
  body?: string | null;
  mood?: string | null;
  aiReflection?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type UdsJournalEntryRow = {
  id: string;
  title?: string | null;
  moodTag?: string | null;
  content?: string | null;
  aiReflection?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

function isSchemaUnavailable(error: { code?: string; message?: string }): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("relation") ||
    message.includes("does not exist") ||
    message.includes("could not find the table")
  );
}

function truncatePreview(content: string, maxLength = 200): string {
  const trimmed = content.trim();
  if (!trimmed) return "";
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

function mapJournalEntryRow(row: {
  id: string;
  title: string;
  body: string;
  mood: string | null;
  aiReflection?: string | null;
  createdAt: string;
  updatedAt: string;
}): JournalEntryListItem {
  const aiReflection = row.aiReflection?.trim() || null;
  return {
    id: row.id,
    title: row.title.trim() || "Untitled entry",
    moodTag: row.mood,
    content: row.body,
    content_preview: truncatePreview(row.body),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    aiReflection: aiReflection,
    has_ai_reflection: Boolean(aiReflection),
  };
}

function readOnboardingReflections(
  onboardingData: Record<string, unknown> | null | undefined,
): Record<string, string> {
  const raw = onboardingData?.[JOURNAL_REFLECTIONS_ONBOARDING_KEY];
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim()) out[id] = value.trim();
  }
  return out;
}

function applyReflectionFallback(
  items: JournalEntryListItem[],
  onboardingData?: Record<string, unknown> | null,
): JournalEntryListItem[] {
  const reflections = readOnboardingReflections(onboardingData);
  return items.map((item) => {
    if (item.has_ai_reflection) return item;
    const reflection = reflections[item.id] ?? null;
    return {
      ...item,
      aiReflection: reflection,
      has_ai_reflection: Boolean(reflection),
    };
  });
}

function readOnboardingJournalEntries(
  onboardingData: Record<string, unknown> | null | undefined,
): JournalEntryListItem[] {
  const raw = onboardingData?.[JOURNAL_ENTRIES_ONBOARDING_KEY];
  if (!Array.isArray(raw)) return [];
  const now = new Date().toISOString();
  return raw
    .filter((entry): entry is JournalEntryRow => Boolean(entry && typeof entry === "object"))
    .map((entry) =>
      mapJournalEntryRow({
        id: typeof entry.id === "string" ? entry.id : crypto.randomUUID(),
        title: typeof entry.title === "string" ? entry.title : "",
        body: typeof entry.body === "string" ? entry.body : "",
        mood: typeof entry.mood === "string" ? entry.mood : null,
        aiReflection:
          typeof entry.aiReflection === "string" ? entry.aiReflection : null,
        createdAt: typeof entry.createdAt === "string" ? entry.createdAt : now,
        updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : now,
      }),
    );
}

type JournalOnboardingRow = {
  id: string;
  title: string;
  body: string;
  mood: string | null;
  aiReflection?: string | null;
  createdAt: string;
  updatedAt: string;
};

function toOnboardingRow(item: JournalEntryListItem): JournalOnboardingRow {
  return {
    id: item.id,
    title: item.title,
    body: item.content,
    mood: item.moodTag,
    aiReflection: item.aiReflection,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function persistOnboardingReflections(
  userId: string,
  reflections: Record<string, string>,
  onboardingData?: Record<string, unknown> | null,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      onboardingData: {
        ...(onboardingData ?? {}),
        [JOURNAL_REFLECTIONS_ONBOARDING_KEY]: reflections,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}

async function persistOnboardingJournalEntries(
  userId: string,
  entries: JournalOnboardingRow[],
  onboardingData?: Record<string, unknown> | null,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      onboardingData: {
        ...(onboardingData ?? {}),
        [JOURNAL_ENTRIES_ONBOARDING_KEY]: entries,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}

function normalizeJournalEntryInput(input: JournalEntryInput): JournalEntryInput {
  return {
    title: input.title.trim(),
    moodTag: input.moodTag?.trim() || null,
    content: input.content.trim(),
  };
}

async function tryCreateInUdsJournalEntryTable(
  userId: string,
  input: JournalEntryInput,
): Promise<JournalEntryListItem | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("journalEntry")
    .insert({
      title: input.title || "Untitled entry",
      moodTag: input.moodTag,
      content: input.content,
      userId: userId,
    })
    .select("id, title, moodTag, content, createdAt, updatedAt")
    .single();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  const row = data as {
    id: string;
    title?: string | null;
    moodTag?: string | null;
    content?: string | null;
    createdAt?: string;
    updatedAt?: string;
  };

  const now = new Date().toISOString();
  return mapJournalEntryRow({
    id: row.id,
    title: row.title ?? "",
    body: row.content ?? "",
    mood: row.moodTag ?? null,
    aiReflection: row.aiReflection ?? null,
    createdAt: row.createdAt ?? now,
    updatedAt: row.updatedAt ?? now,
  });
}

/**
 * Current user's journal entries — newest first.
 * Uses uds_journalentry or onboardingData fallback.
 */
export async function fetchJournalEntries(
  userId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<JournalEntryListItem[]> {
  const client = supabase as unknown as UntypedSupabase;
  const { data: udsData, error: udsError } = await client
    .from("journalEntry")
    .select(
      "id, title, moodTag, content, aiReflection, createdAt, updatedAt",
    )
    .eq("userId", userId)
    .order("createdAt", { ascending: false });

  if (!udsError) {
    const now = new Date().toISOString();
    return (udsData ?? []).map((row) => {
      const typed = row as UdsJournalEntryRow;
      return mapJournalEntryRow({
        id: typed.id,
        title: typed.title ?? "",
        body: typed.content ?? "",
        mood: typed.moodTag ?? null,
        aiReflection: typed.aiReflection ?? null,
        createdAt: typed.createdAt ?? now,
        updatedAt: typed.updatedAt ?? now,
      });
    });
  }

  if (!isSchemaUnavailable(udsError)) throw udsError;

  return applyReflectionFallback(readOnboardingJournalEntries(onboardingData), onboardingData);
}

/**
 * Create a journal entry — uds_journalentry or onboardingData fallback.
 */
export async function createJournalEntry(
  userId: string,
  input: JournalEntryInput,
  onboardingData?: Record<string, unknown> | null,
): Promise<JournalEntryListItem> {
  const normalized = normalizeJournalEntryInput(input);

  const fromUds = await tryCreateInUdsJournalEntryTable(userId, normalized);
  if (fromUds !== null) return fromUds;

  const now = new Date().toISOString();
  const nextItem = mapJournalEntryRow({
    id: crypto.randomUUID(),
    title: normalized.title || "Untitled entry",
    body: normalized.content,
    mood: normalized.moodTag,
    aiReflection: null,
    createdAt: now,
    updatedAt: now,
  });

  const existing = readOnboardingJournalEntries(onboardingData).map(toOnboardingRow);
  await persistOnboardingJournalEntries(
    userId,
    [nextItem, ...existing],
    onboardingData,
  );
  return nextItem;
}

async function tryUpdateInUdsJournalEntryTable(
  userId: string,
  entryId: string,
  input: JournalEntryInput,
): Promise<boolean | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("journalEntry")
    .update({
      title: input.title || "Untitled entry",
      moodTag: input.moodTag,
      content: input.content,
    })
    .eq("id", entryId)
    .eq("userId", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return Boolean(data);
}

async function tryDeleteFromUdsJournalEntryTable(
  userId: string,
  entryId: string,
): Promise<boolean | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { error } = await client
    .from("journalEntry")
    .delete()
    .eq("id", entryId)
    .eq("userId", userId);

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return true;
}

async function trySaveReflectionInUdsJournalEntryTable(
  userId: string,
  entryId: string,
  aiReflectionText: string,
): Promise<boolean | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("journalEntry")
    .update({ aiReflection: aiReflectionText })
    .eq("id", entryId)
    .eq("userId", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return Boolean(data);
}

/**
 * Update a journal entry — uds_journalentry or onboardingData fallback.
 */
export async function updateJournalEntry(
  userId: string,
  entryId: string,
  input: JournalEntryInput,
  onboardingData?: Record<string, unknown> | null,
): Promise<JournalEntryListItem> {
  const normalized = normalizeJournalEntryInput(input);
  const tableResult = await tryUpdateInUdsJournalEntryTable(userId, entryId, normalized);

  if (tableResult === null) {
    const existing = readOnboardingJournalEntries(onboardingData);
    const index = existing.findIndex((row) => row.id === entryId);
    if (index === -1) throw new Error("Journal entry not found");

    const prior = existing[index];
    const nextItem = mapJournalEntryRow({
      id: entryId,
      title: normalized.title || "Untitled entry",
      body: normalized.content,
      mood: normalized.moodTag,
      aiReflection: prior.aiReflection,
      createdAt: prior.createdAt,
      updatedAt: new Date().toISOString(),
    });

    const nextRows = existing.map((row, i) =>
      i === index ? toOnboardingRow(nextItem) : toOnboardingRow(row),
    );
    await persistOnboardingJournalEntries(userId, nextRows, onboardingData);
    return nextItem;
  }
  if (!tableResult) {
    throw new Error("Journal entry not found");
  }

  const rows = await fetchJournalEntries(userId, onboardingData);
  const updated = rows.find((row) => row.id === entryId);
  if (!updated) throw new Error("Journal entry not found");
  return updated;
}

/**
 * Delete a journal entry — uds_journalentry or onboardingData fallback.
 */
export async function deleteJournalEntry(
  userId: string,
  entryId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<void> {
  const udsResult = await tryDeleteFromUdsJournalEntryTable(userId, entryId);
  if (udsResult === true) return;

  if (udsResult === null) {
    const existing = readOnboardingJournalEntries(onboardingData);
    const nextRows = existing.filter((row) => row.id !== entryId).map(toOnboardingRow);
    if (nextRows.length === existing.length) throw new Error("Journal entry not found");
    await persistOnboardingJournalEntries(userId, nextRows, onboardingData);

    const reflections = readOnboardingReflections(onboardingData);
    if (reflections[entryId]) {
      const nextReflections = { ...reflections };
      delete nextReflections[entryId];
      await persistOnboardingReflections(userId, nextReflections, onboardingData);
    }
    return;
  }

  throw new Error("Journal entry not found");
}

/**
 * Persist AI reflection text on a journal entry.
 */
export async function saveJournalEntryReflection(
  userId: string,
  entryId: string,
  aiReflectionText: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<JournalEntryListItem> {
  const reflection = aiReflectionText.trim();
  if (!reflection) throw new Error("AI reflection text is empty");

  const udsResult = await trySaveReflectionInUdsJournalEntryTable(userId, entryId, reflection);

  if (udsResult === null) {
    const reflections = {
      ...readOnboardingReflections(onboardingData),
      [entryId]: reflection,
    };
    await persistOnboardingReflections(userId, reflections, onboardingData);

    const existing = readOnboardingJournalEntries(onboardingData);
    const index = existing.findIndex((row) => row.id === entryId);
    if (index !== -1) {
      const prior = existing[index];
      const nextItem = mapJournalEntryRow({
        id: entryId,
        title: prior.title,
        body: prior.content,
        mood: prior.moodTag,
        aiReflection: reflection,
        createdAt: prior.createdAt,
        updatedAt: prior.updatedAt,
      });
      const nextRows = existing.map((row, i) =>
        i === index ? toOnboardingRow(nextItem) : toOnboardingRow(row),
      );
      await persistOnboardingJournalEntries(userId, nextRows, onboardingData);
      return nextItem;
    }
  } else if (!udsResult) {
    throw new Error("Journal entry not found");
  }

  const rows = await fetchJournalEntries(userId, onboardingData);
  const updated = rows.find((row) => row.id === entryId);
  if (!updated) throw new Error("Journal entry not found");
  return { ...updated, aiReflection: reflection, has_ai_reflection: true };
}
