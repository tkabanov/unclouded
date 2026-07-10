import { supabase } from "@/integrations/supabase/client";
import { PATH_ENROLLMENT_STATUS } from "@/lib/enums/pathEnrollment";
import { getPathBySlug, HARD_SEASONS_PATH } from "@/lib/paths";

/** Bubble pathenrollment1 field keys stored in profiles.onboardingData when DB tables are absent. */
export const PATH_ENROLLMENT_ONBOARDING_KEY = "path_enrollment1" as const;

export interface PathEnrollmentOnboardingState {
  enrollment_id?: string;
  status?: string;
  path_slug?: string;
  focusedMicroCommitmentSessionId?: string[];
  completedMicroCommitmentSessionIds?: string[];
}

/** custom.pathsession row surfaced in dashboard micro-commitment chips. */
export interface MicroCommitmentItem {
  id: string;
  pathName: string;
  sessionIndex: number;
  microCommitmentText: string;
  isCompleted: boolean;
  enrollmentId?: string;
}

type PathenrollmentRow = {
  id?: string;
  status?: string;
  focusedMicroCommitmentSessionId?: unknown;
  completedMicroCommitmentSessionIds?: unknown;
  pathId?: { name?: string; slug?: string } | string | null;
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

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (entry && typeof entry === "object" && "id" in entry && typeof entry.id === "string") {
        return entry.id;
      }
      return null;
    })
    .filter((id): id is string => Boolean(id));
}

function resolvePathFromSlug(slug: string | undefined) {
  if (slug) {
    return getPathBySlug(slug) ?? HARD_SEASONS_PATH;
  }
  return HARD_SEASONS_PATH;
}

function mapFocusedSessions(
  focusedIds: string[],
  pathName: string,
  pathSlug: string | undefined,
  completedIds: Set<string>,
): MicroCommitmentItem[] {
  const path = resolvePathFromSlug(pathSlug);
  return focusedIds
    .map((sessionId) => {
      const session = path.sessions.find((s) => s.id === sessionId);
      if (!session) return null;
      return {
        id: session.id,
        pathName,
        sessionIndex: session.number,
        microCommitmentText: session.micro_commitment,
        isCompleted: completedIds.has(session.id),
      };
    })
    .filter((item): item is MicroCommitmentItem => item !== null);
}

function readEnrollmentState(
  onboardingData: Record<string, unknown> | null | undefined,
): PathEnrollmentOnboardingState {
  const raw = onboardingData?.[PATH_ENROLLMENT_ONBOARDING_KEY];
  if (!raw || typeof raw !== "object") return {};
  return raw as PathEnrollmentOnboardingState;
}

function deriveFromOnboardingData(
  onboardingData: Record<string, unknown> | null | undefined,
): MicroCommitmentItem[] {
  const state = readEnrollmentState(onboardingData);
  if (state.status === PATH_ENROLLMENT_STATUS.COMPLETED) {
    return [];
  }

  const path = resolvePathFromSlug(state.path_slug);
  const focusedIds = state.focusedMicroCommitmentSessionId ?? [];
  const completedIds = new Set(
    state.completedMicroCommitmentSessionIds ?? [],
  );

  return mapFocusedSessions(focusedIds, path.title, state.path_slug, completedIds);
}

function parsePathenrollmentRow(row: PathenrollmentRow): MicroCommitmentItem[] {
  if (row.status === PATH_ENROLLMENT_STATUS.COMPLETED) {
    return [];
  }

  const focusedIds = asStringArray(row.focusedMicroCommitmentSessionId);
  const completedIds = new Set(
    asStringArray(row.completedMicroCommitmentSessionIds),
  );

  let pathName = HARD_SEASONS_PATH.title;
  let pathSlug: string | undefined;

  if (row.pathId && typeof row.pathId === "object") {
    pathName = row.pathId.name ?? pathName;
    pathSlug = typeof row.pathId.slug === "string" ? row.pathId.slug : undefined;
  } else if (typeof row.pathId === "string") {
    pathSlug = row.pathId;
    pathName = getPathBySlug(pathSlug)?.title ?? pathName;
  }

  return mapFocusedSessions(focusedIds, pathName, pathSlug, completedIds).map((item) => ({
    ...item,
    enrollmentId: row.id,
  }));
}

async function tryFetchFromPathenrollmentTable(
  userId: string,
): Promise<MicroCommitmentItem[] | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("pathEnrollment")
    .select(
      "id, status, focusedMicroCommitmentSessionId, completedMicroCommitmentSessionIds, pathId",
    )
    .eq("userId", userId)
    .eq("status", PATH_ENROLLMENT_STATUS.ACTIVE)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  if (!data || typeof data !== "object") return [];
  return parsePathenrollmentRow(data as PathenrollmentRow);
}

/**
 * Bubble bTJGH binding: active pathenrollment1 → focusedMicroCommitmentSessionId list.
 * Prototype schema has no pathenrollment1/pathsession tables yet; falls back to onboardingData.
 */
export async function fetchMicroCommitments(
  userId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<MicroCommitmentItem[]> {
  const fromTable = await tryFetchFromPathenrollmentTable(userId);
  if (fromTable !== null) return fromTable;
  return deriveFromOnboardingData(onboardingData);
}

/** bTJGk workflow parity — mark session complete and remove from focused list. */
export async function markMicroCommitmentCompleted(
  userId: string,
  sessionId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<void> {
  const client = supabase as unknown as UntypedSupabase;
  const { data: enrollment, error: fetchError } = await client
    .from("pathEnrollment")
    .select("id, completedMicroCommitmentSessionIds, focusedMicroCommitmentSessionId")
    .eq("userId", userId)
    .eq("status", PATH_ENROLLMENT_STATUS.ACTIVE)
    .limit(1)
    .maybeSingle();

  if (!fetchError && enrollment && typeof enrollment === "object") {
    const row = enrollment as PathenrollmentRow;
    const completed = asStringArray(row.completedMicroCommitmentSessionIds);
    const focused = asStringArray(row.focusedMicroCommitmentSessionId).filter(
      (id) => id !== sessionId,
    );
    const nextCompleted = completed.includes(sessionId) ? completed : [...completed, sessionId];

    const { error: updateError } = await client
      .from("pathEnrollment")
      .update({
        completedMicroCommitmentSessionIds: nextCompleted,
        focusedMicroCommitmentSessionId: focused,
      })
      .eq("id", row.id);

    if (!updateError) return;
    if (!isSchemaUnavailable(updateError)) throw updateError;
  } else if (fetchError && !isSchemaUnavailable(fetchError)) {
    throw fetchError;
  }

  const existing = readEnrollmentState(onboardingData);
  const completed = [
    ...(existing.completedMicroCommitmentSessionIds ?? []),
  ];
  if (!completed.includes(sessionId)) completed.push(sessionId);
  const focused = (existing.focusedMicroCommitmentSessionId ?? []).filter(
    (id) => id !== sessionId,
  );

  const nextState: PathEnrollmentOnboardingState = {
    ...existing,
    status:
      existing.status ?? PATH_ENROLLMENT_STATUS.ACTIVE,
    completedMicroCommitmentSessionIds: completed,
    focusedMicroCommitmentSessionId: focused,
  };

  const { error } = await supabase
    .from("profiles")
    .update({
      onboardingData: {
        ...(onboardingData ?? {}),
        [PATH_ENROLLMENT_ONBOARDING_KEY]: nextState,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}
