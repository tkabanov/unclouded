import { supabase } from "@/integrations/supabase/client";

/** Bubble uds_milestone field names surfaced in journal UI. */
export interface MilestoneListItem {
  id: string;
  title: string;
  description: string | null;
  achievedAt: string | null;
}

/** Stored in profiles.onboardingData when uds_milestone table is absent. */
export const MILESTONES_ONBOARDING_KEY = "milestones" as const;

type MilestoneRow = {
  id: string;
  title?: string | null;
  description?: string | null;
  achievedAt?: string | null;
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
    title: (row.title ?? "").trim() || "Untitled milestone",
    description: row.description?.trim() || null,
    achievedAt: row.achievedAt ?? null,
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
        title: typeof entry.title === "string" ? entry.title : null,
        description:
          typeof entry.description === "string" ? entry.description : null,
        achievedAt:
          typeof entry.achievedAt === "string" ? entry.achievedAt : null,
      }),
    );
}

async function tryFetchFromMilestoneTable(userId: string): Promise<MilestoneListItem[] | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("milestone")
    .select("id, title, description, achievedAt")
    .eq("userId", userId)
    .order("achievedAt", { ascending: false });

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return (data ?? []).map((row) => mapMilestoneRow(row as MilestoneRow));
}

/**
 * Current user's milestones — newest achieved date first.
 * Tries uds_milestone; falls back to profiles.onboardingData.milestones when table is absent.
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
  title: string;
  description: string | null;
  achievedAt: string | null;
}

type MilestoneOnboardingRow = {
  id: string;
  title: string;
  description: string | null;
  achievedAt: string | null;
};

function toOnboardingRow(item: MilestoneListItem): MilestoneOnboardingRow {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    achievedAt: item.achievedAt,
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
      onboardingData: {
        ...(onboardingData ?? {}),
        [MILESTONES_ONBOARDING_KEY]: milestones,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}

function normalizeMilestoneInput(input: MilestoneInput): MilestoneInput {
  return {
    title: input.title.trim() || "Untitled milestone",
    description: input.description?.trim() || null,
    achievedAt: input.achievedAt?.trim() || null,
  };
}

async function tryCreateInMilestoneTable(
  userId: string,
  input: MilestoneInput,
): Promise<MilestoneListItem | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("milestone")
    .insert({
      title: input.title,
      description: input.description,
      achievedAt: input.achievedAt,
      userId: userId,
    })
    .select("id, title, description, achievedAt")
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
    .from("milestone")
    .update({
      title: input.title,
      description: input.description,
      achievedAt: input.achievedAt,
    })
    .eq("id", milestoneId)
    .eq("userId", userId)
    .select("id, title, description, achievedAt")
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
    .from("milestone")
    .delete()
    .eq("id", milestoneId)
    .eq("userId", userId);

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return true;
}

/**
 * Create a milestone — uds_milestone row or onboardingData fallback.
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
    title: normalized.title,
    description: normalized.description,
    achievedAt: normalized.achievedAt,
  });

  const existing = readOnboardingMilestones(onboardingData).map(toOnboardingRow);
  await persistOnboardingMilestones(userId, [...existing, toOnboardingRow(nextItem)], onboardingData);
  return nextItem;
}

/**
 * Update a milestone — uds_milestone row or onboardingData fallback.
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
      title: normalized.title,
      description: normalized.description,
      achievedAt: normalized.achievedAt,
    });
  }

  if (tableResult === null) {
    const existing = readOnboardingMilestones(onboardingData);
    const index = existing.findIndex((row) => row.id === milestoneId);
    if (index === -1) throw new Error("Milestone not found");

    const nextItem = mapMilestoneRow({
      id: milestoneId,
      title: normalized.title,
      description: normalized.description,
      achievedAt: normalized.achievedAt,
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
 * Delete a milestone — uds_milestone row or onboardingData fallback.
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
