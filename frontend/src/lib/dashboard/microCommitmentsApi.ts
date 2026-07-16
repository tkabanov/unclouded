import { supabase } from "@/integrations/supabase/client";
import { PATH_ENROLLMENT_STATUS } from "@/lib/enums/pathEnrollment";
import { fetchPathSessionsByIds } from "@/lib/paths/pathsCatalogApi";

/** Bubble pathenrollment1 field keys stored in profiles.onboardingData when DB tables are absent. */
export const PATH_ENROLLMENT_ONBOARDING_KEY = "path_enrollment1" as const;

export interface PathEnrollmentOnboardingState {
  enrollment_id?: string;
  status?: string;
  path_slug?: string;
  /** Current session to continue — advanced on reflection-question submit. */
  currentSessionId?: string;
  /** Session progress source of truth (independent of micro-commitments). */
  completedSessionsCount?: number;
  completedSessionIds?: string[];
  focusedMicroCommitmentSessionId?: string[];
  /** Optional micro-commitment tracker — does not gate path session progress. */
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
  completedSessionsCount?: number | string | null;
  focusedMicroCommitmentSessionId?: unknown;
  completedMicroCommitmentSessionIds?: unknown;
  isMicroCommitmentInFocus?: boolean | null;
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
  if (typeof value === "string" && value.trim()) return [value.trim()];
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

function mapFocusedSessions(
  focusedIds: string[],
  pathName: string,
  sessionsById: Map<string, { index: number; microCommitment: string; id: string }>,
  completedIds: Set<string>,
): MicroCommitmentItem[] {
  return focusedIds
    .map((sessionId) => {
      const session = sessionsById.get(sessionId);
      if (!session) return null;
      return {
        id: session.id,
        pathName,
        sessionIndex: session.index,
        microCommitmentText: session.microCommitment,
        isCompleted: completedIds.has(session.id),
      };
    })
    .filter((item): item is MicroCommitmentItem => item !== null);
}

function mapCompletedOnlySessions(
  completedIds: string[],
  focusedIds: string[],
  pathName: string,
  sessionsById: Map<string, { index: number; microCommitment: string; id: string }>,
): MicroCommitmentItem[] {
  const focused = new Set(focusedIds);
  return completedIds
    .filter((sessionId) => !focused.has(sessionId))
    .map((sessionId) => {
      const session = sessionsById.get(sessionId);
      if (!session || !session.microCommitment.trim()) return null;
      return {
        id: session.id,
        pathName,
        sessionIndex: session.index,
        microCommitmentText: session.microCommitment,
        isCompleted: true,
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

async function deriveFromOnboardingData(
  onboardingData: Record<string, unknown> | null | undefined,
): Promise<MicroCommitmentItem[]> {
  const state = readEnrollmentState(onboardingData);
  if (state.status === PATH_ENROLLMENT_STATUS.COMPLETED) {
    return [];
  }

  const focusedIds = state.focusedMicroCommitmentSessionId ?? [];
  const completedIds = state.completedMicroCommitmentSessionIds ?? [];
  if (focusedIds.length === 0 && completedIds.length === 0) return [];

  const completedSet = new Set(completedIds);
  const lookupIds = [...new Set([...focusedIds, ...completedIds])];
  const sessionsById = await fetchPathSessionsByIds(lookupIds);
  const sessionMap = new Map(
    [...sessionsById.values()].map((session) => [
      session.id,
      {
        id: session.id,
        index: session.index,
        microCommitment: session.microCommitment,
      },
    ]),
  );

  const pathName = state.path_slug ?? "Path";
  return [
    ...mapFocusedSessions(focusedIds, pathName, sessionMap, completedSet),
    ...mapCompletedOnlySessions(completedIds, focusedIds, pathName, sessionMap),
  ];
}

async function parsePathenrollmentRow(
  row: PathenrollmentRow,
): Promise<MicroCommitmentItem[]> {
  if (row.status === PATH_ENROLLMENT_STATUS.COMPLETED) {
    return [];
  }

  const focusedIds =
    row.isMicroCommitmentInFocus === true
      ? asStringArray(row.focusedMicroCommitmentSessionId)
      : [];
  const completedIds = asStringArray(row.completedMicroCommitmentSessionIds);
  if (focusedIds.length === 0 && completedIds.length === 0) return [];

  const completedSet = new Set(completedIds);

  let pathName = "Path";
  if (row.pathId && typeof row.pathId === "object") {
    pathName = row.pathId.name ?? pathName;
  }

  const lookupIds = [...new Set([...focusedIds, ...completedIds])];
  const sessionsById = await fetchPathSessionsByIds(lookupIds);
  const sessionMap = new Map(
    [...sessionsById.values()].map((session) => [
      session.id,
      {
        id: session.id,
        index: session.index,
        microCommitment: session.microCommitment,
      },
    ]),
  );

  return [
    ...mapFocusedSessions(focusedIds, pathName, sessionMap, completedSet),
    ...mapCompletedOnlySessions(completedIds, focusedIds, pathName, sessionMap),
  ].map((item) => ({
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
      "id, status, focusedMicroCommitmentSessionId, completedMicroCommitmentSessionIds, isMicroCommitmentInFocus, pathId",
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
        focusedMicroCommitmentSessionId: focused[0] ?? null,
        isMicroCommitmentInFocus: focused.length > 0,
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
