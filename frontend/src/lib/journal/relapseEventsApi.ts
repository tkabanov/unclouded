import { supabase } from "@/integrations/supabase/client";

/** Bubble uds_relapseevent field names surfaced in journal UI. */
export interface RelapseEventListItem {
  id: string;
  event_date_date: string | null;
  notes_text: string | null;
}

/** Stored in profiles.onboarding_data when uds_relapseevent table is absent. */
export const RELAPSE_EVENTS_ONBOARDING_KEY = "relapse_events" as const;

type RelapseEventRow = {
  id: string;
  event_date_date?: string | null;
  notes_text?: string | null;
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

function mapRelapseEventRow(row: RelapseEventRow): RelapseEventListItem {
  return {
    id: row.id,
    event_date_date: row.event_date_date ?? null,
    notes_text: row.notes_text?.trim() || null,
  };
}

function readOnboardingRelapseEvents(
  onboardingData: Record<string, unknown> | null | undefined,
): RelapseEventListItem[] {
  const raw = onboardingData?.[RELAPSE_EVENTS_ONBOARDING_KEY];
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is RelapseEventRow => Boolean(entry && typeof entry === "object"))
    .map((entry) =>
      mapRelapseEventRow({
        id: typeof entry.id === "string" ? entry.id : crypto.randomUUID(),
        event_date_date: typeof entry.event_date_date === "string" ? entry.event_date_date : null,
        notes_text: typeof entry.notes_text === "string" ? entry.notes_text : null,
      }),
    );
}

async function tryFetchFromRelapseTable(userId: string): Promise<RelapseEventListItem[] | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("uds_relapseevent")
    .select("id, event_date_date, notes_text")
    .eq("user_user", userId)
    .order("event_date_date", { ascending: false });

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return (data ?? []).map((row) => mapRelapseEventRow(row as RelapseEventRow));
}

/**
 * Current user's relapse events — newest event date first.
 * Tries uds_relapseevent; falls back to profiles.onboarding_data.relapse_events when table is absent.
 */
export async function fetchRelapseEvents(
  userId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<RelapseEventListItem[]> {
  const fromTable = await tryFetchFromRelapseTable(userId);
  if (fromTable !== null) return fromTable;
  return readOnboardingRelapseEvents(onboardingData);
}

export interface RelapseEventInput {
  event_date_date: string | null;
  notes_text: string | null;
}

type RelapseEventOnboardingRow = {
  id: string;
  event_date_date: string | null;
  notes_text: string | null;
};

function toOnboardingRow(item: RelapseEventListItem): RelapseEventOnboardingRow {
  return {
    id: item.id,
    event_date_date: item.event_date_date,
    notes_text: item.notes_text,
  };
}

async function persistOnboardingRelapseEvents(
  userId: string,
  events: RelapseEventOnboardingRow[],
  onboardingData?: Record<string, unknown> | null,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      onboarding_data: {
        ...(onboardingData ?? {}),
        [RELAPSE_EVENTS_ONBOARDING_KEY]: events,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}

function normalizeRelapseEventInput(input: RelapseEventInput): RelapseEventInput {
  return {
    event_date_date: input.event_date_date?.trim() || null,
    notes_text: input.notes_text?.trim() || null,
  };
}

async function tryCreateInRelapseTable(
  userId: string,
  input: RelapseEventInput,
): Promise<RelapseEventListItem | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("uds_relapseevent")
    .insert({
      event_date_date: input.event_date_date,
      notes_text: input.notes_text,
      user_user: userId,
    })
    .select("id, event_date_date, notes_text")
    .single();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return mapRelapseEventRow(data as RelapseEventRow);
}

async function tryUpdateInRelapseTable(
  userId: string,
  eventId: string,
  input: RelapseEventInput,
): Promise<boolean | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("uds_relapseevent")
    .update({
      event_date_date: input.event_date_date,
      notes_text: input.notes_text,
    })
    .eq("id", eventId)
    .eq("user_user", userId)
    .select("id, event_date_date, notes_text")
    .maybeSingle();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return Boolean(data);
}

async function tryDeleteFromRelapseTable(
  userId: string,
  eventId: string,
): Promise<boolean | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { error } = await client
    .from("uds_relapseevent")
    .delete()
    .eq("id", eventId)
    .eq("user_user", userId);

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return true;
}

/**
 * Create a relapse event — uds_relapseevent row or onboarding_data fallback.
 */
export async function createRelapseEvent(
  userId: string,
  input: RelapseEventInput,
  onboardingData?: Record<string, unknown> | null,
): Promise<RelapseEventListItem> {
  const normalized = normalizeRelapseEventInput(input);
  const fromTable = await tryCreateInRelapseTable(userId, normalized);
  if (fromTable !== null) return fromTable;

  const nextItem = mapRelapseEventRow({
    id: crypto.randomUUID(),
    event_date_date: normalized.event_date_date,
    notes_text: normalized.notes_text,
  });

  const existing = readOnboardingRelapseEvents(onboardingData).map(toOnboardingRow);
  await persistOnboardingRelapseEvents(
    userId,
    [...existing, toOnboardingRow(nextItem)],
    onboardingData,
  );
  return nextItem;
}

/**
 * Update a relapse event — uds_relapseevent row or onboarding_data fallback.
 */
export async function updateRelapseEvent(
  userId: string,
  eventId: string,
  input: RelapseEventInput,
  onboardingData?: Record<string, unknown> | null,
): Promise<RelapseEventListItem> {
  const normalized = normalizeRelapseEventInput(input);
  const tableResult = await tryUpdateInRelapseTable(userId, eventId, normalized);

  if (tableResult === true) {
    return mapRelapseEventRow({
      id: eventId,
      event_date_date: normalized.event_date_date,
      notes_text: normalized.notes_text,
    });
  }

  if (tableResult === null) {
    const existing = readOnboardingRelapseEvents(onboardingData);
    const index = existing.findIndex((row) => row.id === eventId);
    if (index === -1) throw new Error("Relapse event not found");

    const nextItem = mapRelapseEventRow({
      id: eventId,
      event_date_date: normalized.event_date_date,
      notes_text: normalized.notes_text,
    });

    const nextRows = existing.map((row, i) =>
      i === index ? toOnboardingRow(nextItem) : toOnboardingRow(row),
    );
    await persistOnboardingRelapseEvents(userId, nextRows, onboardingData);
    return nextItem;
  }

  throw new Error("Relapse event not found");
}

/**
 * Delete a relapse event — uds_relapseevent row or onboarding_data fallback.
 */
export async function deleteRelapseEvent(
  userId: string,
  eventId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<void> {
  const tableResult = await tryDeleteFromRelapseTable(userId, eventId);
  if (tableResult === true) return;

  if (tableResult === null) {
    const existing = readOnboardingRelapseEvents(onboardingData);
    const nextRows = existing.filter((row) => row.id !== eventId).map(toOnboardingRow);
    if (nextRows.length === existing.length) throw new Error("Relapse event not found");
    await persistOnboardingRelapseEvents(userId, nextRows, onboardingData);
    return;
  }

  throw new Error("Relapse event not found");
}
