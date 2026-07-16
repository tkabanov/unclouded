import { supabase } from "@/integrations/supabase/client";
import {
  fetchPathCatalog,
  fetchPathCatalogEntry,
  slugifyPathName,
  type PathCatalogEntry,
  type PathSessionSummary,
} from "@/lib/paths/pathsCatalogApi";
import {
  PATH_ENROLLMENT_ONBOARDING_KEY,
  type PathEnrollmentOnboardingState,
} from "@/lib/dashboard/microCommitmentsApi";
import { PATH_RESPONSES_ONBOARDING_KEY } from "@/lib/chat/pathsReflectionApi";

type EmbeddedPathRef = {
  id?: string;
  name?: string;
  slug?: string;
  tier?: string;
  pillar?: string;
  subMode?: string;
  sessionsCount?: number | string | null;
};

function readEnrollmentState(
  onboardingData: Record<string, unknown> | null | undefined,
): PathEnrollmentOnboardingState {
  const raw = onboardingData?.[PATH_ENROLLMENT_ONBOARDING_KEY];
  if (!raw || typeof raw !== "object") return {};
  return raw as PathEnrollmentOnboardingState;
}

function pathNameFromOnboardingResponses(
  onboardingData: Record<string, unknown> | null | undefined,
): string | undefined {
  const raw = onboardingData?.[PATH_RESPONSES_ONBOARDING_KEY];
  if (!Array.isArray(raw)) return undefined;

  for (let index = raw.length - 1; index >= 0; index -= 1) {
    const entry = raw[index];
    if (!entry || typeof entry !== "object") continue;
    const pathName = (entry as { pathName?: string }).pathName?.trim();
    if (pathName) return pathName;
  }

  return undefined;
}

function pathKeyFromEmbedded(pathRef: EmbeddedPathRef | null | undefined): string | undefined {
  if (!pathRef) return undefined;
  if (typeof pathRef.id === "string" && pathRef.id.trim()) return pathRef.id.trim();
  if (typeof pathRef.slug === "string" && pathRef.slug.trim()) return pathRef.slug.trim();
  if (typeof pathRef.name === "string" && pathRef.name.trim()) return pathRef.name.trim();
  return undefined;
}

export function resolvePathKeyFromEnrollment(
  pathId: string | EmbeddedPathRef | null | undefined,
  onboardingData?: Record<string, unknown> | null,
): string | undefined {
  if (typeof pathId === "string" && pathId.trim()) return pathId.trim();
  const embeddedKey = pathKeyFromEmbedded(
    pathId && typeof pathId === "object" ? pathId : undefined,
  );
  if (embeddedKey) return embeddedKey;

  const state = readEnrollmentState(onboardingData);
  if (state.path_slug?.trim()) return state.path_slug.trim();

  const responsePathName = pathNameFromOnboardingResponses(onboardingData);
  if (responsePathName) return responsePathName;

  return undefined;
}

export async function resolveEnrollmentPathCatalog(
  pathId: string | EmbeddedPathRef | null | undefined,
  onboardingData?: Record<string, unknown> | null,
): Promise<PathCatalogEntry | null> {
  const candidates = new Set<string>();

  if (typeof pathId === "string" && pathId.trim()) {
    candidates.add(pathId.trim());
  }
  if (pathId && typeof pathId === "object") {
    const embeddedKey = pathKeyFromEmbedded(pathId);
    if (embeddedKey) candidates.add(embeddedKey);
  }

  const state = readEnrollmentState(onboardingData);
  if (state.path_slug?.trim()) candidates.add(state.path_slug.trim());

  const responsePathName = pathNameFromOnboardingResponses(onboardingData);
  if (responsePathName) candidates.add(responsePathName);

  for (const key of candidates) {
    const catalog = await fetchPathCatalogEntry(key);
    if (catalog) return catalog;
  }

  const catalog = await fetchPathCatalog();
  if (responsePathName) {
    const byName = catalog.find(
      (entry) => entry.name.toLowerCase() === responsePathName.toLowerCase(),
    );
    if (byName) return byName;
  }

  const slugCandidate = state.path_slug?.trim();
  if (slugCandidate) {
    const normalized = slugifyPathName(slugCandidate);
    const bySlug = catalog.find((entry) => entry.slug === normalized);
    if (bySlug) return bySlug;
  }

  return null;
}

export function remapSessionToCatalog(
  sessionId: string | undefined,
  sessionTitle: string | undefined,
  sessions: PathSessionSummary[],
  completedSessionsCount: number,
): string | undefined {
  if (sessions.length === 0) return sessionId;

  if (sessionId && sessions.some((session) => session.id === sessionId)) {
    return sessionId;
  }

  if (sessionTitle?.trim()) {
    const normalizedTitle = sessionTitle.trim().toLowerCase();
    const byTitle = sessions.find(
      (session) => session.title.trim().toLowerCase() === normalizedTitle,
    );
    if (byTitle) return byTitle.id;
  }

  const nextIndex = Math.min(
    Math.max(0, completedSessionsCount),
    Math.max(0, sessions.length - 1),
  );
  return sessions[nextIndex]?.id ?? sessions[0]?.id;
}

export async function tryRepairEnrollmentPathId(
  enrollmentId: string,
  storedPathId: string | null | undefined,
  resolvedPathId: string,
): Promise<void> {
  if (!resolvedPathId || storedPathId === resolvedPathId) return;

  const client = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };

  const { error } = await client
    .from("pathEnrollment")
    .update({ pathId: resolvedPathId })
    .eq("id", enrollmentId);

  if (error) {
    console.warn("Could not repair stale pathEnrollment.pathId", error);
  }
}

/**
 * When pathEnrollment.pathId was nulled (seed DELETE + ON DELETE SET NULL),
 * recover the path by matching pathResponse question text to pathQuestion rows.
 */
export async function recoverPathIdFromPathResponses(
  userId: string,
): Promise<string | null> {
  const client = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };

  const { data: responses, error } = await client
    .from("pathResponse")
    .select("questionText, sessionId")
    .eq("userId", userId)
    .order("createdAt", { ascending: false })
    .limit(20);

  if (error || !Array.isArray(responses) || responses.length === 0) {
    return null;
  }

  for (const entry of responses) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as { questionText?: string | null; sessionId?: string | null };
    if (typeof row.sessionId === "string" && row.sessionId.trim()) {
      const { data: session } = await client
        .from("pathSession")
        .select("pathId")
        .eq("id", row.sessionId)
        .maybeSingle();
      const pathId =
        session && typeof session === "object"
          ? (session as { pathId?: string }).pathId
          : null;
      if (typeof pathId === "string" && pathId.trim()) return pathId.trim();
    }

    const questionText = typeof row.questionText === "string" ? row.questionText.trim() : "";
    if (!questionText) continue;

    const { data: questions } = await client
      .from("pathQuestion")
      .select("sessionId, questionText")
      .limit(500);

    if (!Array.isArray(questions)) continue;
    const prefix = questionText.slice(0, 80);
    const match = questions.find((question) => {
      if (!question || typeof question !== "object") return false;
      const text = (question as { questionText?: string }).questionText ?? "";
      return text.slice(0, 80) === prefix;
    });
    if (!match || typeof match !== "object") continue;
    const sessionId = (match as { sessionId?: string }).sessionId;
    if (typeof sessionId !== "string" || !sessionId) continue;

    const { data: session } = await client
      .from("pathSession")
      .select("pathId")
      .eq("id", sessionId)
      .maybeSingle();
    const pathId =
      session && typeof session === "object"
        ? (session as { pathId?: string }).pathId
        : null;
    if (typeof pathId === "string" && pathId.trim()) return pathId.trim();
  }

  return null;
}
