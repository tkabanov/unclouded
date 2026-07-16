import { supabase } from "@/integrations/supabase/client";
import type { ResultsData } from "@/lib/classification";
import { PATH_ENROLLMENT_STATUS } from "@/lib/enums/pathEnrollment";
import { TIER, type TierSlug } from "@/lib/enums/tier";
import { fetchPathSessions } from "@/lib/paths/pathsCatalogApi";
import {
  selectOnboardingEnrollmentPaths,
  type OnboardingEnrollmentContext,
  type PathEnrollmentCandidate,
} from "@/lib/paths/pathEnrollmentMatching";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

export interface AutoEnrollPathsInput {
  userId: string;
  primaryPillar: string;
  results: ResultsData;
  userTier?: TierSlug;
}

type PathRow = {
  id?: string;
  name?: string;
  tier?: string;
  pillar?: string;
  classifications?: string | null;
  triggerSignals?: string | null;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

function isTierSlug(value: string | undefined | null): value is TierSlug {
  return value === TIER.FREE || value === TIER.PRO || value === TIER.PREMIUM;
}

function mapPathRow(row: PathRow): PathEnrollmentCandidate | null {
  if (!row.id || !row.name || !row.pillar || !isTierSlug(row.tier)) return null;

  return {
    id: row.id,
    name: row.name,
    tier: row.tier,
    pillar: row.pillar,
    classifications: row.classifications?.trim() ?? "",
    triggerSignals: row.triggerSignals?.trim() ?? "",
  };
}

function buildEnrollmentContext(
  input: AutoEnrollPathsInput,
): OnboardingEnrollmentContext {
  return {
    primaryPillar: input.primaryPillar,
    classificationName: input.results.classification.name,
    recoveryModeActive: input.results.recovery_mode_active,
    griefModeActive: input.results.grief_mode_active,
    userTier: input.userTier ?? TIER.FREE,
  };
}

async function fetchPathCandidates(): Promise<PathEnrollmentCandidate[]> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("path")
    .select("id, name, tier, pillar, classifications, triggerSignals");

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }

  if (!Array.isArray(data)) return [];

  return data
    .map((row) => mapPathRow(row as PathRow))
    .filter((path): path is PathEnrollmentCandidate => path !== null);
}

async function fetchExistingEnrollmentPathIds(userId: string): Promise<Set<string>> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("pathEnrollment")
    .select("pathId, status")
    .eq("userId", userId);

  if (error) {
    if (isSchemaUnavailable(error)) return new Set();
    throw error;
  }

  if (!Array.isArray(data)) return new Set();

  return new Set(
    data
      .filter((row) => {
        const status = (row as { status?: string }).status;
        return status !== PATH_ENROLLMENT_STATUS.ABANDONED;
      })
      .map((row) => (row as { pathId?: string }).pathId)
      .filter((pathId): pathId is string => Boolean(pathId)),
  );
}

export async function createPathEnrollmentRow(
  userId: string,
  pathId: string,
  options?: { setAsPrimary?: boolean },
): Promise<string | null> {
  const sessions = await fetchPathSessions(pathId);
  const firstSessionId = sessions[0]?.id ?? null;
  const enrollmentId = crypto.randomUUID();

  const client = supabase as unknown as UntypedSupabase;
  const { error } = await client.from("pathEnrollment").insert({
    id: enrollmentId,
    userId,
    pathId,
    status: PATH_ENROLLMENT_STATUS.ACTIVE,
    completedSessionsCount: 0,
    currentSessionId: options?.setAsPrimary ? firstSessionId : null,
    // Focus is set only when the user opts in via "Set as My Focus" on session complete.
    focusedMicroCommitmentSessionId: null,
    isMicroCommitmentInFocus: false,
  } as never);

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return enrollmentId;
}

/**
 * Bubble onboarding completion workflow — auto-enroll matching guided paths.
 * Matches classification + primary pillar + health flags; uses path UUID in pathEnrollment.
 */
export async function autoEnrollPathsAfterOnboarding(
  input: AutoEnrollPathsInput,
): Promise<string[]> {
  const context = buildEnrollmentContext(input);
  const [paths, existingPathIds] = await Promise.all([
    fetchPathCandidates(),
    fetchExistingEnrollmentPathIds(input.userId),
  ]);

  const matches = selectOnboardingEnrollmentPaths(paths, context).filter(
    (path) => !existingPathIds.has(path.id),
  );

  const enrolledIds: string[] = [];

  for (const [index, path] of matches.entries()) {
    const enrollmentId = await createPathEnrollmentRow(input.userId, path.id, {
      setAsPrimary: index === 0,
    });
    if (enrollmentId) enrolledIds.push(enrollmentId);
  }

  return enrolledIds;
}
