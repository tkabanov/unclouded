import { supabase } from "@/integrations/supabase/client";

/** Bubble uds_milestone field names surfaced in journal UI. */
export interface MilestoneListItem {
  id: string;
  title_text: string;
  description_text: string | null;
  achieved_at_date: string | null;
}

/** Stored in profiles.onboarding_data when uds_milestone table is absent. */
export const MILESTONES_ONBOARDING_KEY = "milestones" as const;

type MilestoneRow = {
  id: string;
  title_text?: string | null;
  description_text?: string | null;
  achieved_at_date?: string | null;
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

function mapMilestoneRow(row: MilestoneRow): MilestoneListItem {
  return {
    id: row.id,
    title_text: (row.title_text ?? "").trim() || "Untitled milestone",
    description_text: row.description_text?.trim() || null,
    achieved_at_date: row.achieved_at_date ?? null,
  };
}

function readOnboardingMilestones(
  onboardingData: Record<string, unknown> | null | undefined,
): MilestoneListItem[] {
  const raw = onboardingData?.[MILESTONES_ONBOARDING_KEY];
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is MilestoneRow => Boolean(entry && typeof entry === "object"))
    .map((entry) =>
      mapMilestoneRow({
        id: typeof entry.id === "string" ? entry.id : crypto.randomUUID(),
        title_text: typeof entry.title_text === "string" ? entry.title_text : null,
        description_text:
          typeof entry.description_text === "string" ? entry.description_text : null,
        achieved_at_date:
          typeof entry.achieved_at_date === "string" ? entry.achieved_at_date : null,
      }),
    );
}

async function tryFetchFromMilestoneTable(userId: string): Promise<MilestoneListItem[] | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("uds_milestone")
    .select("id, title_text, description_text, achieved_at_date")
    .eq("user_user", userId)
    .order("achieved_at_date", { ascending: false });

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return (data ?? []).map((row) => mapMilestoneRow(row as MilestoneRow));
}

/**
 * Current user's milestones — newest achieved date first.
 * Tries uds_milestone; falls back to profiles.onboarding_data.milestones when table is absent.
 */
export async function fetchMilestones(
  userId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<MilestoneListItem[]> {
  const fromTable = await tryFetchFromMilestoneTable(userId);
  if (fromTable !== null) return fromTable;
  return readOnboardingMilestones(onboardingData);
}

export interface MilestoneInput {
  title_text: string;
  description_text: string | null;
  achieved_at_date: string | null;
}

type MilestoneOnboardingRow = {
  id: string;
  title_text: string;
  description_text: string | null;
  achieved_at_date: string | null;
};

function toOnboardingRow(item: MilestoneListItem): MilestoneOnboardingRow {
  return {
    id: item.id,
    title_text: item.title_text,
    description_text: item.description_text,
    achieved_at_date: item.achieved_at_date,
  };
}

async function persistOnboardingMilestones(
  userId: string,
  milestones: MilestoneOnboardingRow[],
  onboardingData?: Record<string, unknown> | null,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      onboarding_data: {
        ...(onboardingData ?? {}),
        [MILESTONES_ONBOARDING_KEY]: milestones,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}

function normalizeMilestoneInput(input: MilestoneInput): MilestoneInput {
  return {
    title_text: input.title_text.trim() || "Untitled milestone",
    description_text: input.description_text?.trim() || null,
    achieved_at_date: input.achieved_at_date?.trim() || null,
  };
}

async function tryCreateInMilestoneTable(
  userId: string,
  input: MilestoneInput,
): Promise<MilestoneListItem | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("uds_milestone")
    .insert({
      title_text: input.title_text,
      description_text: input.description_text,
      achieved_at_date: input.achieved_at_date,
      user_user: userId,
    })
    .select("id, title_text, description_text, achieved_at_date")
    .single();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return mapMilestoneRow(data as MilestoneRow);
}

async function tryUpdateInMilestoneTable(
  userId: string,
  milestoneId: string,
  input: MilestoneInput,
): Promise<boolean | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("uds_milestone")
    .update({
      title_text: input.title_text,
      description_text: input.description_text,
      achieved_at_date: input.achieved_at_date,
    })
    .eq("id", milestoneId)
    .eq("user_user", userId)
    .select("id, title_text, description_text, achieved_at_date")
    .maybeSingle();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return Boolean(data);
}

async function tryDeleteFromMilestoneTable(
  userId: string,
  milestoneId: string,
): Promise<boolean | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { error } = await client
    .from("uds_milestone")
    .delete()
    .eq("id", milestoneId)
    .eq("user_user", userId);

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return true;
}

/**
 * Create a milestone — uds_milestone row or onboarding_data fallback.
 */
export async function createMilestone(
  userId: string,
  input: MilestoneInput,
  onboardingData?: Record<string, unknown> | null,
): Promise<MilestoneListItem> {
  const normalized = normalizeMilestoneInput(input);
  const fromTable = await tryCreateInMilestoneTable(userId, normalized);
  if (fromTable !== null) return fromTable;

  const nextItem = mapMilestoneRow({
    id: crypto.randomUUID(),
    title_text: normalized.title_text,
    description_text: normalized.description_text,
    achieved_at_date: normalized.achieved_at_date,
  });

  const existing = readOnboardingMilestones(onboardingData).map(toOnboardingRow);
  await persistOnboardingMilestones(userId, [...existing, toOnboardingRow(nextItem)], onboardingData);
  return nextItem;
}

/**
 * Update a milestone — uds_milestone row or onboarding_data fallback.
 */
export async function updateMilestone(
  userId: string,
  milestoneId: string,
  input: MilestoneInput,
  onboardingData?: Record<string, unknown> | null,
): Promise<MilestoneListItem> {
  const normalized = normalizeMilestoneInput(input);
  const tableResult = await tryUpdateInMilestoneTable(userId, milestoneId, normalized);

  if (tableResult === true) {
    return mapMilestoneRow({
      id: milestoneId,
      title_text: normalized.title_text,
      description_text: normalized.description_text,
      achieved_at_date: normalized.achieved_at_date,
    });
  }

  if (tableResult === null) {
    const existing = readOnboardingMilestones(onboardingData);
    const index = existing.findIndex((row) => row.id === milestoneId);
    if (index === -1) throw new Error("Milestone not found");

    const nextItem = mapMilestoneRow({
      id: milestoneId,
      title_text: normalized.title_text,
      description_text: normalized.description_text,
      achieved_at_date: normalized.achieved_at_date,
    });

    const nextRows = existing.map((row, i) =>
      i === index ? toOnboardingRow(nextItem) : toOnboardingRow(row),
    );
    await persistOnboardingMilestones(userId, nextRows, onboardingData);
    return nextItem;
  }

  throw new Error("Milestone not found");
}

/**
 * Delete a milestone — uds_milestone row or onboarding_data fallback.
 */
export async function deleteMilestone(
  userId: string,
  milestoneId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<void> {
  const tableResult = await tryDeleteFromMilestoneTable(userId, milestoneId);
  if (tableResult === true) return;

  if (tableResult === null) {
    const existing = readOnboardingMilestones(onboardingData);
    const nextRows = existing
      .filter((row) => row.id !== milestoneId)
      .map(toOnboardingRow);
    if (nextRows.length === existing.length) throw new Error("Milestone not found");
    await persistOnboardingMilestones(userId, nextRows, onboardingData);
    return;
  }

  throw new Error("Milestone not found");
}
