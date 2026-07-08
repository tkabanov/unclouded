import { supabase } from "@/integrations/supabase/client";

/** List row mapped from journal_entries (uds_journalentry field names in API surface). */
export interface JournalEntryListItem {
  id: string;
  title_text: string;
  mood_tag_text: string | null;
  content_text: string;
  content_preview: string;
  created_at: string;
  updated_at: string;
  ai_reflection_text: string | null;
  has_ai_reflection: boolean;
}

/** Bubble uds_journalentry create payload. */
export interface JournalEntryInput {
  title_text: string;
  mood_tag_text: string | null;
  content_text: string;
}

/** Stored in profiles.onboarding_data when journal_entries table is absent. */
export const JOURNAL_ENTRIES_ONBOARDING_KEY = "journal_entries" as const;

/** Reflection text keyed by entry id when uds_journalentry / ai_reflection_text column is absent. */
export const JOURNAL_REFLECTIONS_ONBOARDING_KEY = "journal_entry_reflections" as const;

type JournalEntryRow = {
  id: string;
  title?: string | null;
  body?: string | null;
  mood?: string | null;
  ai_reflection_text?: string | null;
  created_at?: string;
  updated_at?: string;
};

type UdsJournalEntryRow = {
  id: string;
  title_text?: string | null;
  mood_tag_text?: string | null;
  content_text?: string | null;
  ai_reflection_text?: string | null;
  created_at?: string;
  updated_at?: string;
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
  ai_reflection_text?: string | null;
  created_at: string;
  updated_at: string;
}): JournalEntryListItem {
  const aiReflection = row.ai_reflection_text?.trim() || null;
  return {
    id: row.id,
    title_text: row.title.trim() || "Untitled entry",
    mood_tag_text: row.mood,
    content_text: row.body,
    content_preview: truncatePreview(row.body),
    created_at: row.created_at,
    updated_at: row.updated_at,
    ai_reflection_text: aiReflection,
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
      ai_reflection_text: reflection,
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
        ai_reflection_text:
          typeof entry.ai_reflection_text === "string" ? entry.ai_reflection_text : null,
        created_at: typeof entry.created_at === "string" ? entry.created_at : now,
        updated_at: typeof entry.updated_at === "string" ? entry.updated_at : now,
      }),
    );
}

type JournalOnboardingRow = {
  id: string;
  title: string;
  body: string;
  mood: string | null;
  ai_reflection_text?: string | null;
  created_at: string;
  updated_at: string;
};

function toOnboardingRow(item: JournalEntryListItem): JournalOnboardingRow {
  return {
    id: item.id,
    title: item.title_text,
    body: item.content_text,
    mood: item.mood_tag_text,
    ai_reflection_text: item.ai_reflection_text,
    created_at: item.created_at,
    updated_at: item.updated_at,
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
      onboarding_data: {
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
      onboarding_data: {
        ...(onboardingData ?? {}),
        [JOURNAL_ENTRIES_ONBOARDING_KEY]: entries,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}

function normalizeJournalEntryInput(input: JournalEntryInput): JournalEntryInput {
  return {
    title_text: input.title_text.trim(),
    mood_tag_text: input.mood_tag_text?.trim() || null,
    content_text: input.content_text.trim(),
  };
}

async function tryCreateInUdsJournalEntryTable(
  userId: string,
  input: JournalEntryInput,
): Promise<JournalEntryListItem | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("uds_journalentry")
    .insert({
      title_text: input.title_text || "Untitled entry",
      mood_tag_text: input.mood_tag_text,
      content_text: input.content_text,
      user_user: userId,
    })
    .select("id, title_text, mood_tag_text, content_text, created_at, updated_at")
    .single();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  const row = data as {
    id: string;
    title_text?: string | null;
    mood_tag_text?: string | null;
    content_text?: string | null;
    created_at?: string;
    updated_at?: string;
  };

  const now = new Date().toISOString();
  return mapJournalEntryRow({
    id: row.id,
    title: row.title_text ?? "",
    body: row.content_text ?? "",
    mood: row.mood_tag_text ?? null,
    ai_reflection_text: row.ai_reflection_text ?? null,
    created_at: row.created_at ?? now,
    updated_at: row.updated_at ?? now,
  });
}

async function tryCreateInJournalEntriesTable(
  userId: string,
  input: JournalEntryInput,
): Promise<JournalEntryListItem | null> {
  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: userId,
      title: input.title_text || "Untitled entry",
      body: input.content_text,
      mood: input.mood_tag_text,
    })
    .select("id, title, body, mood, created_at, updated_at")
    .single();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return mapJournalEntryRow(data as JournalEntryRow & {
    title: string;
    body: string;
    mood: string | null;
    created_at: string;
    updated_at: string;
  });
}

/**
 * Current user's journal entries — newest first.
 * Uses uds_journalentry, journal_entries, or onboarding_data fallback.
 */
export async function fetchJournalEntries(
  userId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<JournalEntryListItem[]> {
  const client = supabase as unknown as UntypedSupabase;
  const { data: udsData, error: udsError } = await client
    .from("uds_journalentry")
    .select(
      "id, title_text, mood_tag_text, content_text, ai_reflection_text, created_at, updated_at",
    )
    .eq("user_user", userId)
    .order("created_at", { ascending: false });

  if (!udsError) {
    const now = new Date().toISOString();
    return (udsData ?? []).map((row) => {
      const typed = row as UdsJournalEntryRow;
      return mapJournalEntryRow({
        id: typed.id,
        title: typed.title_text ?? "",
        body: typed.content_text ?? "",
        mood: typed.mood_tag_text ?? null,
        ai_reflection_text: typed.ai_reflection_text ?? null,
        created_at: typed.created_at ?? now,
        updated_at: typed.updated_at ?? now,
      });
    });
  }

  if (!isSchemaUnavailable(udsError)) throw udsError;

  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, title, body, mood, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isSchemaUnavailable(error)) {
      return applyReflectionFallback(readOnboardingJournalEntries(onboardingData), onboardingData);
    }
    throw error;
  }

  return applyReflectionFallback(
    (data ?? []).map(mapJournalEntryRow),
    onboardingData,
  );
}

/**
 * Create a journal entry — uds_journalentry, journal_entries, or onboarding_data fallback.
 */
export async function createJournalEntry(
  userId: string,
  input: JournalEntryInput,
  onboardingData?: Record<string, unknown> | null,
): Promise<JournalEntryListItem> {
  const normalized = normalizeJournalEntryInput(input);

  const fromUds = await tryCreateInUdsJournalEntryTable(userId, normalized);
  if (fromUds !== null) return fromUds;

  const fromPrototype = await tryCreateInJournalEntriesTable(userId, normalized);
  if (fromPrototype !== null) return fromPrototype;

  const now = new Date().toISOString();
  const nextItem = mapJournalEntryRow({
    id: crypto.randomUUID(),
    title: normalized.title_text || "Untitled entry",
    body: normalized.content_text,
    mood: normalized.mood_tag_text,
    ai_reflection_text: null,
    created_at: now,
    updated_at: now,
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
    .from("uds_journalentry")
    .update({
      title_text: input.title_text || "Untitled entry",
      mood_tag_text: input.mood_tag_text,
      content_text: input.content_text,
    })
    .eq("id", entryId)
    .eq("user_user", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return Boolean(data);
}

async function tryUpdateInJournalEntriesTable(
  userId: string,
  entryId: string,
  input: JournalEntryInput,
): Promise<boolean | null> {
  const { data, error } = await supabase
    .from("journal_entries")
    .update({
      title: input.title_text || "Untitled entry",
      body: input.content_text,
      mood: input.mood_tag_text,
    })
    .eq("id", entryId)
    .eq("user_id", userId)
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
    .from("uds_journalentry")
    .delete()
    .eq("id", entryId)
    .eq("user_user", userId);

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return true;
}

async function tryDeleteFromJournalEntriesTable(
  userId: string,
  entryId: string,
): Promise<boolean | null> {
  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId);

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
    .from("uds_journalentry")
    .update({ ai_reflection_text: aiReflectionText })
    .eq("id", entryId)
    .eq("user_user", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return Boolean(data);
}

/**
 * Update a journal entry — uds_journalentry, journal_entries, or onboarding_data fallback.
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
    const prototypeResult = await tryUpdateInJournalEntriesTable(userId, entryId, normalized);
    if (prototypeResult === null) {
      const existing = readOnboardingJournalEntries(onboardingData);
      const index = existing.findIndex((row) => row.id === entryId);
      if (index === -1) throw new Error("Journal entry not found");

      const prior = existing[index];
      const nextItem = mapJournalEntryRow({
        id: entryId,
        title: normalized.title_text || "Untitled entry",
        body: normalized.content_text,
        mood: normalized.mood_tag_text,
        ai_reflection_text: prior.ai_reflection_text,
        created_at: prior.created_at,
        updated_at: new Date().toISOString(),
      });

      const nextRows = existing.map((row, i) =>
        i === index ? toOnboardingRow(nextItem) : toOnboardingRow(row),
      );
      await persistOnboardingJournalEntries(userId, nextRows, onboardingData);
      return nextItem;
    }
    if (!prototypeResult) throw new Error("Journal entry not found");
  } else if (!tableResult) {
    throw new Error("Journal entry not found");
  }

  const rows = await fetchJournalEntries(userId, onboardingData);
  const updated = rows.find((row) => row.id === entryId);
  if (!updated) throw new Error("Journal entry not found");
  return updated;
}

/**
 * Delete a journal entry — uds_journalentry, journal_entries, or onboarding_data fallback.
 */
export async function deleteJournalEntry(
  userId: string,
  entryId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<void> {
  const udsResult = await tryDeleteFromUdsJournalEntryTable(userId, entryId);
  if (udsResult === true) return;

  if (udsResult === null) {
    const prototypeResult = await tryDeleteFromJournalEntriesTable(userId, entryId);
    if (prototypeResult === true) {
      const reflections = readOnboardingReflections(onboardingData);
      if (reflections[entryId]) {
        const nextReflections = { ...reflections };
        delete nextReflections[entryId];
        await persistOnboardingReflections(userId, nextReflections, onboardingData);
      }
      return;
    }

    if (prototypeResult === null) {
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
        title: prior.title_text,
        body: prior.content_text,
        mood: prior.mood_tag_text,
        ai_reflection_text: reflection,
        created_at: prior.created_at,
        updated_at: prior.updated_at,
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
  return { ...updated, ai_reflection_text: reflection, has_ai_reflection: true };
}
