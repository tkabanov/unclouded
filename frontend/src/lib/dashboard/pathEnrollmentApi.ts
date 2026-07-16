import { supabase } from "@/integrations/supabase/client";
import {
  PATH_ENROLLMENT_STATUS,
  type PathEnrollmentStatusSlug,
} from "@/lib/enums/pathEnrollment";
import { TIER, type TierSlug } from "@/lib/enums/tier";
import {
  fetchPathSessionTitle,
  fetchPathSessions,
  type PathSessionSummary,
} from "@/lib/paths/pathsCatalogApi";
import {
  remapSessionToCatalog,
  recoverPathIdFromPathResponses,
  resolveEnrollmentPathCatalog,
  resolvePathKeyFromEnrollment,
  tryRepairEnrollmentPathId,
} from "@/lib/paths/enrollmentPathResolver";
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
  /** Opens session completion form at /paths?session= */
  currentSessionId?: string;
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

function resolvePathKey(
  pathSlug: string | undefined,
  pathObject?: PathenrollmentRow["pathId"],
  onboardingData?: Record<string, unknown> | null,
): string | undefined {
  return resolvePathKeyFromEnrollment(pathObject ?? pathSlug, onboardingData);
}

async function resolvePathMetaFromDb(
  pathKey: string | undefined,
  pathObject?: PathenrollmentRow["pathId"],
  onboardingData?: Record<string, unknown> | null,
): Promise<ReturnType<typeof resolvePathMeta>> {
  const catalog = await resolveEnrollmentPathCatalog(pathObject ?? pathKey ?? null, onboardingData);
  if (catalog) {
    return {
      pathName: catalog.name,
      pathSlug: catalog.slug,
      tier: catalog.tier,
      pillarLabel: catalog.pillar,
      subMode: catalog.subMode,
      totalSessions: catalog.sessionsCount,
    };
  }

  return resolvePathMeta(pathKey, pathObject);
}

async function sessionTitleFromId(
  sessionId: string | undefined,
): Promise<string | null> {
  if (!sessionId) return null;
  return fetchPathSessionTitle(sessionId);
}

async function resolveNextStepTitle(
  currentSession: PathenrollmentRow["currentSessionId"],
  completedSessionsCount: number,
  sessions: PathSessionSummary[],
): Promise<string | null> {
  if (currentSession && typeof currentSession === "object") {
    if (typeof currentSession.title === "string" && currentSession.title.trim()) {
      return currentSession.title;
    }
    return sessionTitleFromId(currentSession.id);
  }

  if (typeof currentSession === "string") {
    return sessionTitleFromId(currentSession);
  }

  // Progress is session-based (answered questions), not micro-commitment based.
  const nextByCount = sessions[Math.max(0, completedSessionsCount)];
  return nextByCount?.title ?? sessions[0]?.title ?? null;
}

function resolveCurrentSessionId(
  currentSession: PathenrollmentRow["currentSessionId"],
  completedSessionsCount: number,
  completedSessionIds: string[],
  sessions: PathSessionSummary[],
  sessionTitleHint?: string,
): string | undefined {
  let sessionId: string | undefined;
  let sessionTitle = sessionTitleHint;

  if (currentSession && typeof currentSession === "object") {
    sessionId = typeof currentSession.id === "string" ? currentSession.id : undefined;
    if (typeof currentSession.title === "string" && currentSession.title.trim()) {
      sessionTitle = currentSession.title;
    }
  } else if (typeof currentSession === "string" && currentSession.trim()) {
    sessionId = currentSession;
  }

  // Prefer an explicit currentSessionId when it still exists in the catalog.
  if (sessionId && sessions.some((session) => session.id === sessionId)) {
    return sessionId;
  }

  // Use completed session IDs when available; otherwise fall back to count index.
  if (completedSessionIds.length > 0) {
    const completed = new Set(completedSessionIds);
    const nextUnanswered = sessions.find((session) => !completed.has(session.id));
    if (nextUnanswered) return nextUnanswered.id;
  }

  return remapSessionToCatalog(sessionId, sessionTitle, sessions, completedSessionsCount);
}

function computeProgressPercent(
  completedCount: number,
  totalSessions: number,
): number {
  if (totalSessions <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completedCount / totalSessions) * 100)));
}

function storedPathIdFromRow(row: PathenrollmentRow): string | null {
  if (typeof row.pathId === "string" && row.pathId.trim()) return row.pathId.trim();
  if (row.pathId && typeof row.pathId === "object" && typeof row.pathId.id === "string") {
    return row.pathId.id;
  }
  return null;
}

async function resolveCatalogForEnrollmentRow(
  row: PathenrollmentRow,
  userId?: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<Awaited<ReturnType<typeof resolveEnrollmentPathCatalog>>> {
  let catalog = await resolveEnrollmentPathCatalog(row.pathId ?? null, onboardingData);

  if (!catalog && userId) {
    const recoveredPathId = await recoverPathIdFromPathResponses(userId);
    if (recoveredPathId) {
      catalog = await resolveEnrollmentPathCatalog(recoveredPathId, onboardingData);
      if (catalog && row.id) {
        await tryRepairEnrollmentPathId(row.id, storedPathIdFromRow(row), catalog.id);
      }
    }
  }

  return catalog;
}

async function parsePathenrollmentRow(
  row: PathenrollmentRow,
  onboardingData?: Record<string, unknown> | null,
  userId?: string,
): Promise<CurrentPathEnrollment | null> {
  if (row.status === PATH_ENROLLMENT_STATUS.COMPLETED) {
    return null;
  }

  const catalog = await resolveCatalogForEnrollmentRow(row, userId, onboardingData);
  const sessions = catalog ? await fetchPathSessions(catalog.id) : [];

  if (catalog && row.id) {
    const storedPathId = storedPathIdFromRow(row);
    if (storedPathId !== catalog.id) {
      await tryRepairEnrollmentPathId(row.id, storedPathId, catalog.id);
    }
  }

  const embeddedMeta = resolvePathMeta(
    undefined,
    row.pathId && typeof row.pathId === "object" ? row.pathId : undefined,
  );

  const pathName = catalog?.name ?? embeddedMeta.pathName;
  const pathSlug = catalog?.slug ?? embeddedMeta.pathSlug;
  const totalSessions = catalog?.sessionsCount || embeddedMeta.totalSessions || sessions.length;

  const completedCount = toNumber(row.completedSessionsCount) ?? 0;
  const currentSessionId = resolveCurrentSessionId(
    row.currentSessionId,
    completedCount,
    [],
    sessions,
  );
  const nextStepTitle = await resolveNextStepTitle(
    row.currentSessionId ?? currentSessionId ?? null,
    completedCount,
    sessions,
  );

  return {
    enrollmentId: row.id,
    pathName,
    pathSlug,
    progressPercent: computeProgressPercent(completedCount, totalSessions),
    nextStepTitle,
    currentSessionId,
    hasActiveEnrollment: true,
  };
}

async function deriveFromOnboardingData(
  onboardingData: Record<string, unknown> | null | undefined,
): Promise<CurrentPathEnrollment> {
  const state = readEnrollmentState(onboardingData);
  if (
    !state.status ||
    state.status === PATH_ENROLLMENT_STATUS.COMPLETED
  ) {
    return EMPTY_ENROLLMENT;
  }

  const catalog = await resolveEnrollmentPathCatalog(state.path_slug ?? null, onboardingData);
  const sessions = catalog ? await fetchPathSessions(catalog.id) : [];
  const completedSessionIds = state.completedSessionIds ?? [];
  const completedCount = Math.max(
    toNumber(state.completedSessionsCount) ?? 0,
    completedSessionIds.length,
  );
  const currentSessionId = resolveCurrentSessionId(
    state.currentSessionId ?? null,
    completedCount,
    completedSessionIds,
    sessions,
  );

  return {
    enrollmentId: state.enrollment_id,
    pathName: catalog?.name ?? "Path",
    pathSlug: catalog?.slug ?? state.path_slug,
    progressPercent: computeProgressPercent(
      completedCount,
      catalog?.sessionsCount ?? sessions.length,
    ),
    nextStepTitle: await resolveNextStepTitle(
      currentSessionId ?? null,
      completedCount,
      sessions,
    ),
    currentSessionId,
    hasActiveEnrollment: true,
  };
}

async function tryFetchFromPathenrollmentTable(
  userId: string,
  onboardingData?: Record<string, unknown> | null,
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
  return (
    (await parsePathenrollmentRow(data as PathenrollmentRow, onboardingData, userId)) ??
    EMPTY_ENROLLMENT
  );
}

/**
 * Bubble bTIrY binding: pathenrollment1 search for current user → path name, progress, next step.
 * Prototype schema may lack pathenrollment1; falls back to profiles.onboardingData.path_enrollment1.
 */
export async function fetchCurrentPathEnrollment(
  userId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<CurrentPathEnrollment> {
  const fromTable = await tryFetchFromPathenrollmentTable(userId, onboardingData);
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
  let pathName = "Path";
  let tier: TierSlug = TIER.FREE;
  let pillarLabel = "";
  let subMode: string | undefined;
  let totalSessions = 0;

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

  return { pathName, pathSlug, tier, pillarLabel, subMode, totalSessions };
}

async function resolveCurrentSessionFields(
  row: PathenrollmentRow,
): Promise<Pick<PathEnrollmentListItem, "currentSessionId" | "currentSessionTitle">> {
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
        titleFromRow ?? (await sessionTitleFromId(currentSessionId)) ?? undefined,
    };
  }

  if (typeof currentSession === "string") {
    return {
      currentSessionId: currentSession,
      currentSessionTitle: (await sessionTitleFromId(currentSession)) ?? undefined,
    };
  }

  return {};
}

function progressFromRow(
  row: PathenrollmentRow,
  totalSessions: number,
): number {
  // Session progress comes from answered reflection questions, not micro-commitments.
  const completedCount = toNumber(row.completedSessionsCount) ?? 0;
  return computeProgressPercent(completedCount, totalSessions);
}

async function toListItem(
  row: PathenrollmentRow,
  onboardingData?: Record<string, unknown> | null,
  userId?: string,
): Promise<PathEnrollmentListItem | null> {
  if (!row.id) return null;

  const catalog = await resolveCatalogForEnrollmentRow(row, userId, onboardingData);
  const meta = catalog
    ? {
        pathName: catalog.name,
        pathSlug: catalog.slug,
        tier: catalog.tier,
        pillarLabel: catalog.pillar,
        subMode: catalog.subMode,
        totalSessions: catalog.sessionsCount || 0,
      }
    : await resolvePathMetaFromDb(
        resolvePathKey(
          typeof row.pathId === "string" ? row.pathId : undefined,
          row.pathId,
          onboardingData,
        ),
        row.pathId,
        onboardingData,
      );

  if (catalog) {
    await tryRepairEnrollmentPathId(row.id, storedPathIdFromRow(row), catalog.id);
  }

  const status = row.status;
  if (
    status !== PATH_ENROLLMENT_STATUS.ACTIVE &&
    status !== PATH_ENROLLMENT_STATUS.PAUSED &&
    status !== PATH_ENROLLMENT_STATUS.COMPLETED &&
    status !== PATH_ENROLLMENT_STATUS.ABANDONED
  ) {
    return null;
  }

  const sessions = catalog ? await fetchPathSessions(catalog.id) : [];
  const completedCount = toNumber(row.completedSessionsCount) ?? 0;
  const sessionFields = await resolveCurrentSessionFields(row);
  if (sessions.length > 0) {
    const inferredId = resolveCurrentSessionId(
      row.currentSessionId ?? sessionFields.currentSessionId ?? null,
      completedCount,
      [],
      sessions,
      sessionFields.currentSessionTitle,
    );
    if (inferredId) {
      sessionFields.currentSessionId = inferredId;
      sessionFields.currentSessionTitle =
        sessions.find((session) => session.id === inferredId)?.title ??
        (await sessionTitleFromId(inferredId)) ??
        sessionFields.currentSessionTitle;
    }
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
    ...sessionFields,
  };
}

async function deriveListFromOnboardingData(
  onboardingData: Record<string, unknown> | null | undefined,
): Promise<PathEnrollmentListItem[]> {
  const state = readEnrollmentState(onboardingData);
  if (!state.status || !state.enrollment_id) return [];

  const catalog = await resolveEnrollmentPathCatalog(state.path_slug ?? null, onboardingData);
  const sessions = catalog ? await fetchPathSessions(catalog.id) : [];
  const status = state.status;
  const completedSessionIds = state.completedSessionIds ?? [];
  const completedCount = Math.max(
    toNumber(state.completedSessionsCount) ?? 0,
    completedSessionIds.length,
  );
  const currentSessionId = resolveCurrentSessionId(
    state.currentSessionId ?? null,
    completedCount,
    completedSessionIds,
    sessions,
  );
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
      pathName: catalog?.name ?? "Path",
      pathSlug: catalog?.slug ?? state.path_slug,
      status,
      progressPercent: computeProgressPercent(
        completedCount,
        catalog?.sessionsCount ?? sessions.length,
      ),
      tier: catalog?.tier ?? TIER.FREE,
      pillarLabel: catalog?.pillar ?? "",
      subMode: catalog?.subMode,
      currentSessionId,
      currentSessionTitle: currentSessionId
        ? (await sessionTitleFromId(currentSessionId)) ?? undefined
        : undefined,
    },
  ];
}

async function tryFetchPathEnrollmentsFromTable(
  userId: string,
  onboardingData?: Record<string, unknown> | null,
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

  const items = await Promise.all(
    data.map((row) => toListItem(row as PathenrollmentRow, onboardingData, userId)),
  );

  return items.filter((item): item is PathEnrollmentListItem => item !== null);
}

/** Bubble bTJEQ binding: pathenrollment1 search for current user → services floating panel list. */
export async function fetchPathEnrollments(
  userId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<PathEnrollmentListItem[]> {
  const fromTable = await tryFetchPathEnrollmentsFromTable(userId, onboardingData);
  if (fromTable !== null) return fromTable;
  return deriveListFromOnboardingData(onboardingData);
}