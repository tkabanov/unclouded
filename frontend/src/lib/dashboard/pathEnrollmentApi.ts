import { supabase } from "@/integrations/supabase/client";
import {
  PATH_ENROLLMENT_STATUS,
  type PathEnrollmentStatusSlug,
} from "@/lib/enums/pathEnrollment";
import { TIER, type TierSlug } from "@/lib/enums/tier";
import { getPathBySlug, HARD_SEASONS_PATH } from "@/lib/paths";
import {
  PATH_ENROLLMENT_ONBOARDING_KEY,
  type PathEnrollmentOnboardingState,
} from "@/lib/dashboard/microCommitmentsApi";

/** Row in FG-services RG - PathEnrollment (bTJEQ) and paths grid RG (bTItY). */
export interface PathEnrollmentListItem {
  enrollmentId: string;
  pathName: string;
  pathSlug?: string;
  status: PathEnrollmentStatusSlug;
  progressPercent: number;
  tier: TierSlug;
  pillarLabel: string;
  subMode?: string;
  /** pathenrollment1.currentSessionId — PATHS-07 URL session matching. */
  currentSessionId?: string;
  currentSessionTitle?: string;
}

/** Active pathenrollment1 row surfaced in dashboard current-path card (Bubble bTIrY RG). */
export interface CurrentPathEnrollment {
  enrollmentId?: string;
  pathName: string;
  pathSlug?: string;
  progressPercent: number;
  nextStepTitle: string | null;
  hasActiveEnrollment: boolean;
}

const EMPTY_ENROLLMENT: CurrentPathEnrollment = {
  pathName: "",
  progressPercent: 0,
  nextStepTitle: null,
  hasActiveEnrollment: false,
};

type PathenrollmentRow = {
  id?: string;
  status?: string;
  completedSessionsCount?: number | string | null;
  completedMicroCommitmentSessionIds?: unknown;
  currentSessionId?:
    | { id?: string; title?: string }
    | string
    | null;
  focusedMicroCommitmentSessionId?: unknown;
  pathId?:
    | {
        name?: string;
        slug?: string;
        sessionsCount?: number | string;
        tier?: string;
        pillar?: string;
        subMode?: string;
      }
    | string
    | null;
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

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readEnrollmentState(
  onboardingData: Record<string, unknown> | null | undefined,
): PathEnrollmentOnboardingState {
  const raw = onboardingData?.[PATH_ENROLLMENT_ONBOARDING_KEY];
  if (!raw || typeof raw !== "object") return {};
  return raw as PathEnrollmentOnboardingState;
}

function resolvePathFromSlug(slug: string | undefined) {
  if (slug) {
    return getPathBySlug(slug) ?? HARD_SEASONS_PATH;
  }
  return HARD_SEASONS_PATH;
}

function sessionTitleFromId(sessionId: string | undefined, pathSlug: string | undefined): string | null {
  if (!sessionId) return null;
  const path = resolvePathFromSlug(pathSlug);
  return path.sessions.find((session) => session.id === sessionId)?.title ?? null;
}

function resolveNextStepTitle(
  currentSession: PathenrollmentRow["currentSessionId"],
  pathSlug: string | undefined,
  focusedSessionIds: string[],
  completedSessionIds: string[],
): string | null {
  if (currentSession && typeof currentSession === "object") {
    if (typeof currentSession.title === "string" && currentSession.title.trim()) {
      return currentSession.title;
    }
    return sessionTitleFromId(currentSession.id, pathSlug);
  }

  if (typeof currentSession === "string") {
    return sessionTitleFromId(currentSession, pathSlug);
  }

  const path = resolvePathFromSlug(pathSlug);
  const completed = new Set(completedSessionIds);
  const focusedId = focusedSessionIds.find(Boolean);
  if (focusedId) {
    return sessionTitleFromId(focusedId, pathSlug);
  }

  const nextSession = path.sessions.find((session) => !completed.has(session.id));
  return nextSession?.title ?? path.sessions[0]?.title ?? null;
}

function computeProgressPercent(
  completedCount: number,
  totalSessions: number,
): number {
  if (totalSessions <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completedCount / totalSessions) * 100)));
}

function parsePathenrollmentRow(row: PathenrollmentRow): CurrentPathEnrollment | null {
  if (row.status === PATH_ENROLLMENT_STATUS.COMPLETED) {
    return null;
  }

  let pathName = HARD_SEASONS_PATH.title;
  let pathSlug: string | undefined;
  let totalSessions = HARD_SEASONS_PATH.sessions.length;

  if (row.pathId && typeof row.pathId === "object") {
    pathName = row.pathId.name ?? pathName;
    pathSlug =
      typeof row.pathId.slug === "string" ? row.pathId.slug : undefined;
    const sessionsCount = toNumber(row.pathId.sessionsCount);
    if (sessionsCount !== null && sessionsCount > 0) {
      totalSessions = sessionsCount;
    } else if (pathSlug) {
      totalSessions = resolvePathFromSlug(pathSlug).sessions.length;
    }
  } else if (typeof row.pathId === "string") {
    pathSlug = row.pathId;
    const path = getPathBySlug(pathSlug);
    if (path) {
      pathName = path.title;
      totalSessions = path.sessions.length;
    }
  }

  const completedFromField = toNumber(row.completedSessionsCount);
  const completedIds = asStringArray(
    row.completedMicroCommitmentSessionIds,
  );
  const completedCount =
    completedFromField !== null ? completedFromField : completedIds.length;

  const focusedIds = asStringArray(row.focusedMicroCommitmentSessionId);
  const nextStepTitle = resolveNextStepTitle(
    row.currentSessionId,
    pathSlug,
    focusedIds,
    completedIds,
  );

  return {
    enrollmentId: row.id,
    pathName,
    pathSlug,
    progressPercent: computeProgressPercent(completedCount, totalSessions),
    nextStepTitle,
    hasActiveEnrollment: true,
  };
}

function deriveFromOnboardingData(
  onboardingData: Record<string, unknown> | null | undefined,
): CurrentPathEnrollment {
  const state = readEnrollmentState(onboardingData);
  if (
    !state.status ||
    state.status === PATH_ENROLLMENT_STATUS.COMPLETED
  ) {
    return EMPTY_ENROLLMENT;
  }

  const path = resolvePathFromSlug(state.path_slug);
  const completedIds =
    state.completedMicroCommitmentSessionIds ?? [];
  const focusedIds = state.focusedMicroCommitmentSessionId ?? [];

  return {
    enrollmentId: state.enrollment_id,
    pathName: path.title,
    pathSlug: state.path_slug,
    progressPercent: computeProgressPercent(completedIds.length, path.sessions.length),
    nextStepTitle: resolveNextStepTitle(null, state.path_slug, focusedIds, completedIds),
    hasActiveEnrollment: true,
  };
}

async function tryFetchFromPathenrollmentTable(
  userId: string,
): Promise<CurrentPathEnrollment | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("pathEnrollment")
    .select(
      "id, status, completedSessionsCount, completedMicroCommitmentSessionIds, currentSessionId, focusedMicroCommitmentSessionId, pathId",
    )
    .eq("userId", userId)
    .eq("status", PATH_ENROLLMENT_STATUS.ACTIVE)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  if (!data || typeof data !== "object") return EMPTY_ENROLLMENT;
  return parsePathenrollmentRow(data as PathenrollmentRow) ?? EMPTY_ENROLLMENT;
}

/**
 * Bubble bTIrY binding: pathenrollment1 search for current user → path name, progress, next step.
 * Prototype schema may lack pathenrollment1; falls back to profiles.onboardingData.path_enrollment1.
 */
export async function fetchCurrentPathEnrollment(
  userId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<CurrentPathEnrollment> {
  const fromTable = await tryFetchFromPathenrollmentTable(userId);
  if (fromTable !== null) return fromTable;
  return deriveFromOnboardingData(onboardingData);
}

function isTierSlug(value: string | undefined): value is TierSlug {
  return value === TIER.FREE || value === TIER.PRO || value === TIER.PREMIUM;
}

function resolvePathMeta(
  pathSlug: string | undefined,
  pathObject?: PathenrollmentRow["pathId"],
): {
  pathName: string;
  pathSlug?: string;
  tier: TierSlug;
  pillarLabel: string;
  subMode?: string;
  totalSessions: number;
} {
  let pathName = HARD_SEASONS_PATH.title;
  let tier: TierSlug = HARD_SEASONS_PATH.tier;
  let pillarLabel = HARD_SEASONS_PATH.pillar;
  let subMode = HARD_SEASONS_PATH.subMode;
  let totalSessions = HARD_SEASONS_PATH.sessions.length;

  if (pathObject && typeof pathObject === "object") {
    pathName = pathObject.name ?? pathName;
    pathSlug =
      typeof pathObject.slug === "string" ? pathObject.slug : pathSlug;
    if (isTierSlug(pathObject.tier)) {
      tier = pathObject.tier;
    }
    if (typeof pathObject.pillar === "string") {
      pillarLabel = pathObject.pillar;
    }
    if (typeof pathObject.subMode === "string") {
      subMode = pathObject.subMode;
    }
    const sessionsCount = toNumber(pathObject.sessionsCount);
    if (sessionsCount !== null && sessionsCount > 0) {
      totalSessions = sessionsCount;
    }
  }

  if (pathSlug) {
    const path = getPathBySlug(pathSlug);
    if (path) {
      pathName = path.title;
      tier = path.tier;
      pillarLabel = path.pillar;
      subMode = path.subMode ?? subMode;
      totalSessions = path.sessions.length;
    }
  }

  return { pathName, pathSlug, tier, pillarLabel, subMode, totalSessions };
}

function resolveCurrentSessionFields(
  row: PathenrollmentRow,
  pathSlug: string | undefined,
): Pick<PathEnrollmentListItem, "currentSessionId" | "currentSessionTitle"> {
  const currentSession = row.currentSessionId;
  if (currentSession && typeof currentSession === "object") {
    const currentSessionId =
      typeof currentSession.id === "string" ? currentSession.id : undefined;
    const titleFromRow =
      typeof currentSession.title === "string" && currentSession.title.trim()
        ? currentSession.title
        : undefined;
    return {
      currentSessionId,
      currentSessionTitle:
        titleFromRow ?? sessionTitleFromId(currentSessionId, pathSlug) ?? undefined,
    };
  }

  if (typeof currentSession === "string") {
    return {
      currentSessionId: currentSession,
      currentSessionTitle: sessionTitleFromId(currentSession, pathSlug) ?? undefined,
    };
  }

  return {};
}

function progressFromRow(
  row: PathenrollmentRow,
  totalSessions: number,
): number {
  const completedFromField = toNumber(row.completedSessionsCount);
  const completedIds = asStringArray(
    row.completedMicroCommitmentSessionIds,
  );
  const completedCount =
    completedFromField !== null ? completedFromField : completedIds.length;
  return computeProgressPercent(completedCount, totalSessions);
}

function toListItem(row: PathenrollmentRow): PathEnrollmentListItem | null {
  if (!row.id) return null;

  let pathSlug: string | undefined;
  if (typeof row.pathId === "string") {
    pathSlug = row.pathId;
  } else if (row.pathId && typeof row.pathId === "object") {
    pathSlug =
      typeof row.pathId.slug === "string"
        ? row.pathId.slug
        : undefined;
  }

  const meta = resolvePathMeta(pathSlug, row.pathId);

  const status = row.status;
  if (
    status !== PATH_ENROLLMENT_STATUS.ACTIVE &&
    status !== PATH_ENROLLMENT_STATUS.PAUSED &&
    status !== PATH_ENROLLMENT_STATUS.COMPLETED &&
    status !== PATH_ENROLLMENT_STATUS.ABANDONED
  ) {
    return null;
  }

  return {
    enrollmentId: row.id,
    pathName: meta.pathName,
    pathSlug: meta.pathSlug,
    status,
    progressPercent: progressFromRow(row, meta.totalSessions),
    tier: meta.tier,
    pillarLabel: meta.pillarLabel,
    subMode: meta.subMode,
    ...resolveCurrentSessionFields(row, meta.pathSlug),
  };
}

function deriveListFromOnboardingData(
  onboardingData: Record<string, unknown> | null | undefined,
): PathEnrollmentListItem[] {
  const state = readEnrollmentState(onboardingData);
  if (!state.status || !state.enrollment_id) return [];

  const path = resolvePathFromSlug(state.path_slug);
  const status = state.status;
  const completedIds =
    state.completedMicroCommitmentSessionIds ?? [];
  const focusedIds = state.focusedMicroCommitmentSessionId ?? [];
  const completedSet = new Set(completedIds);
  const currentSessionId =
    focusedIds.find((id) => !completedSet.has(id)) ??
    path.sessions.find((session) => !completedSet.has(session.id))?.id;
  if (
    status !== PATH_ENROLLMENT_STATUS.ACTIVE &&
    status !== PATH_ENROLLMENT_STATUS.PAUSED &&
    status !== PATH_ENROLLMENT_STATUS.COMPLETED &&
    status !== PATH_ENROLLMENT_STATUS.ABANDONED
  ) {
    return [];
  }

  return [
    {
      enrollmentId: state.enrollment_id,
      pathName: path.title,
      pathSlug: state.path_slug,
      status,
      progressPercent: computeProgressPercent(completedIds.length, path.sessions.length),
      tier: path.tier,
      pillarLabel: path.pillar,
      subMode: path.subMode,
      currentSessionId,
      currentSessionTitle: currentSessionId
        ? sessionTitleFromId(currentSessionId, state.path_slug) ?? undefined
        : undefined,
    },
  ];
}

async function tryFetchPathEnrollmentsFromTable(
  userId: string,
): Promise<PathEnrollmentListItem[] | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("pathEnrollment")
    .select(
      "id, status, pathId, completedSessionsCount, completedMicroCommitmentSessionIds, currentSessionId",
    )
    .eq("userId", userId);

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  if (!Array.isArray(data)) return [];

  return data
    .map((row) => toListItem(row as PathenrollmentRow))
    .filter((item): item is PathEnrollmentListItem => item !== null);
}

/** Bubble bTJEQ binding: pathenrollment1 search for current user → services floating panel list. */
export async function fetchPathEnrollments(
  userId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<PathEnrollmentListItem[]> {
  const fromTable = await tryFetchPathEnrollmentsFromTable(userId);
  if (fromTable !== null) return fromTable;
  return deriveListFromOnboardingData(onboardingData);
}
