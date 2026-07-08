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
  /** pathenrollment1.current_session_custom_pathsession — PATHS-07 URL session matching. */
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
  status_option_path_enrollment_status?: string;
  completed_sessions_count_number?: number | string | null;
  completed_micro_commitment_session_list_list_custom_pathsession?: unknown;
  current_session_custom_pathsession?:
    | { id?: string; title_text?: string }
    | string
    | null;
  focused_m_commitment_custom_pathsession?: unknown;
  path_custom_path?:
    | {
        name_text?: string;
        slug?: string;
        sessions_count_number?: number | string;
        tier_option_tier_os?: string;
        pillar_option_customer_pillar_os?: string;
        sub_mode_text?: string;
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
  currentSession: PathenrollmentRow["current_session_custom_pathsession"],
  pathSlug: string | undefined,
  focusedSessionIds: string[],
  completedSessionIds: string[],
): string | null {
  if (currentSession && typeof currentSession === "object") {
    if (typeof currentSession.title_text === "string" && currentSession.title_text.trim()) {
      return currentSession.title_text;
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
  if (row.status_option_path_enrollment_status === PATH_ENROLLMENT_STATUS.COMPLETED) {
    return null;
  }

  let pathName = HARD_SEASONS_PATH.title;
  let pathSlug: string | undefined;
  let totalSessions = HARD_SEASONS_PATH.sessions.length;

  if (row.path_custom_path && typeof row.path_custom_path === "object") {
    pathName = row.path_custom_path.name_text ?? pathName;
    pathSlug =
      typeof row.path_custom_path.slug === "string" ? row.path_custom_path.slug : undefined;
    const sessionsCount = toNumber(row.path_custom_path.sessions_count_number);
    if (sessionsCount !== null && sessionsCount > 0) {
      totalSessions = sessionsCount;
    } else if (pathSlug) {
      totalSessions = resolvePathFromSlug(pathSlug).sessions.length;
    }
  } else if (typeof row.path_custom_path === "string") {
    pathSlug = row.path_custom_path;
    const path = getPathBySlug(pathSlug);
    if (path) {
      pathName = path.title;
      totalSessions = path.sessions.length;
    }
  }

  const completedFromField = toNumber(row.completed_sessions_count_number);
  const completedIds = asStringArray(
    row.completed_micro_commitment_session_list_list_custom_pathsession,
  );
  const completedCount =
    completedFromField !== null ? completedFromField : completedIds.length;

  const focusedIds = asStringArray(row.focused_m_commitment_custom_pathsession);
  const nextStepTitle = resolveNextStepTitle(
    row.current_session_custom_pathsession,
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
    !state.status_option_path_enrollment_status ||
    state.status_option_path_enrollment_status === PATH_ENROLLMENT_STATUS.COMPLETED
  ) {
    return EMPTY_ENROLLMENT;
  }

  const path = resolvePathFromSlug(state.path_slug);
  const completedIds =
    state.completed_micro_commitment_session_list_list_custom_pathsession ?? [];
  const focusedIds = state.focused_m_commitment_custom_pathsession ?? [];

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
    .from("pathenrollment1")
    .select(
      "id, status_option_path_enrollment_status, completed_sessions_count_number, completed_micro_commitment_session_list_list_custom_pathsession, current_session_custom_pathsession, focused_m_commitment_custom_pathsession, path_custom_path",
    )
    .eq("user_user", userId)
    .eq("status_option_path_enrollment_status", PATH_ENROLLMENT_STATUS.ACTIVE)
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
 * Prototype schema may lack pathenrollment1; falls back to profiles.onboarding_data.path_enrollment1.
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
  pathObject?: PathenrollmentRow["path_custom_path"],
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
    pathName = pathObject.name_text ?? pathName;
    pathSlug =
      typeof pathObject.slug === "string" ? pathObject.slug : pathSlug;
    if (isTierSlug(pathObject.tier_option_tier_os)) {
      tier = pathObject.tier_option_tier_os;
    }
    if (typeof pathObject.pillar_option_customer_pillar_os === "string") {
      pillarLabel = pathObject.pillar_option_customer_pillar_os;
    }
    if (typeof pathObject.sub_mode_text === "string") {
      subMode = pathObject.sub_mode_text;
    }
    const sessionsCount = toNumber(pathObject.sessions_count_number);
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
  const currentSession = row.current_session_custom_pathsession;
  if (currentSession && typeof currentSession === "object") {
    const currentSessionId =
      typeof currentSession.id === "string" ? currentSession.id : undefined;
    const titleFromRow =
      typeof currentSession.title_text === "string" && currentSession.title_text.trim()
        ? currentSession.title_text
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
  const completedFromField = toNumber(row.completed_sessions_count_number);
  const completedIds = asStringArray(
    row.completed_micro_commitment_session_list_list_custom_pathsession,
  );
  const completedCount =
    completedFromField !== null ? completedFromField : completedIds.length;
  return computeProgressPercent(completedCount, totalSessions);
}

function toListItem(row: PathenrollmentRow): PathEnrollmentListItem | null {
  if (!row.id) return null;

  let pathSlug: string | undefined;
  if (typeof row.path_custom_path === "string") {
    pathSlug = row.path_custom_path;
  } else if (row.path_custom_path && typeof row.path_custom_path === "object") {
    pathSlug =
      typeof row.path_custom_path.slug === "string"
        ? row.path_custom_path.slug
        : undefined;
  }

  const meta = resolvePathMeta(pathSlug, row.path_custom_path);

  const status = row.status_option_path_enrollment_status;
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
  if (!state.status_option_path_enrollment_status || !state.enrollment_id) return [];

  const path = resolvePathFromSlug(state.path_slug);
  const status = state.status_option_path_enrollment_status;
  const completedIds =
    state.completed_micro_commitment_session_list_list_custom_pathsession ?? [];
  const focusedIds = state.focused_m_commitment_custom_pathsession ?? [];
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
    .from("pathenrollment1")
    .select(
      "id, status_option_path_enrollment_status, path_custom_path, completed_sessions_count_number, completed_micro_commitment_session_list_list_custom_pathsession, current_session_custom_pathsession",
    )
    .eq("user_user", userId);

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
