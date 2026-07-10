import { supabase } from "@/integrations/supabase/client";

/** Bubble uds_relapseevent field names surfaced in journal UI. */
export interface RelapseEventListItem {
  id: string;
  eventDate: string | null;
  notes: string | null;
}

/** Stored in profiles.onboardingData when uds_relapseevent table is absent. */
export const RELAPSE_EVENTS_ONBOARDING_KEY = "relapse_events" as const;

type RelapseEventRow = {
  id: string;
  eventDate?: string | null;
  notes?: string | null;
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
    eventDate: row.eventDate ?? null,
    notes: row.notes?.trim() || null,
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
        eventDate: typeof entry.eventDate === "string" ? entry.eventDate : null,
        notes: typeof entry.notes === "string" ? entry.notes : null,
      }),
    );
}

async function tryFetchFromRelapseTable(userId: string): Promise<RelapseEventListItem[] | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("relapseEvent")
    .select("id, eventDate, notes")
    .eq("userId", userId)
    .order("eventDate", { ascending: false });

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return (data ?? []).map((row) => mapRelapseEventRow(row as RelapseEventRow));
}

/**
 * Current user's relapse events — newest event date first.
 * Tries uds_relapseevent; falls back to profiles.onboardingData.relapse_events when table is absent.
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
  eventDate: string | null;
  notes: string | null;
}

type RelapseEventOnboardingRow = {
  id: string;
  eventDate: string | null;
  notes: string | null;
};

function toOnboardingRow(item: RelapseEventListItem): RelapseEventOnboardingRow {
  return {
    id: item.id,
    eventDate: item.eventDate,
    notes: item.notes,
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
      onboardingData: {
        ...(onboardingData ?? {}),
        [RELAPSE_EVENTS_ONBOARDING_KEY]: events,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}

function normalizeRelapseEventInput(input: RelapseEventInput): RelapseEventInput {
  return {
    eventDate: input.eventDate?.trim() || null,
    notes: input.notes?.trim() || null,
  };
}

async function tryCreateInRelapseTable(
  userId: string,
  input: RelapseEventInput,
): Promise<RelapseEventListItem | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("relapseEvent")
    .insert({
      eventDate: input.eventDate,
      notes: input.notes,
      userId: userId,
    })
    .select("id, eventDate, notes")
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
    .from("relapseEvent")
    .update({
      eventDate: input.eventDate,
      notes: input.notes,
    })
    .eq("id", eventId)
    .eq("userId", userId)
    .select("id, eventDate, notes")
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
    .from("relapseEvent")
    .delete()
    .eq("id", eventId)
    .eq("userId", userId);

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return true;
}

/**
 * Create a relapse event — uds_relapseevent row or onboardingData fallback.
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
    eventDate: normalized.eventDate,
    notes: normalized.notes,
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
 * Update a relapse event — uds_relapseevent row or onboardingData fallback.
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
      eventDate: normalized.eventDate,
      notes: normalized.notes,
    });
  }

  if (tableResult === null) {
    const existing = readOnboardingRelapseEvents(onboardingData);
    const index = existing.findIndex((row) => row.id === eventId);
    if (index === -1) throw new Error("Relapse event not found");

    const nextItem = mapRelapseEventRow({
      id: eventId,
      eventDate: normalized.eventDate,
      notes: normalized.notes,
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
 * Delete a relapse event — uds_relapseevent row or onboardingData fallback.
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
