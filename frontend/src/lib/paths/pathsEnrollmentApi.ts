/**
 * Paths enrollment API — wraps dashboard pathenrollment1 fetch/mutations for MOD-DRSAM-PATHS.
 * Bubble bTItY / ai_RNbBHYHn bindings share this list shape.
 */
import { supabase } from "@/integrations/supabase/client";
import { PATH_ENROLLMENT_STATUS } from "@/lib/enums/pathEnrollment";
import { getPathBySlug, HARD_SEASONS_PATH } from "@/lib/paths";
import {
  PATH_ENROLLMENT_ONBOARDING_KEY,
  type PathEnrollmentOnboardingState,
} from "@/lib/dashboard/microCommitmentsApi";

export {
  fetchPathEnrollments,
  type PathEnrollmentListItem,
} from "@/lib/dashboard/pathEnrollmentApi";

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

function readEnrollmentState(
  onboardingData: Record<string, unknown> | null | undefined,
): PathEnrollmentOnboardingState {
  const raw = onboardingData?.[PATH_ENROLLMENT_ONBOARDING_KEY];
  if (!raw || typeof raw !== "object") return {};
  return raw as PathEnrollmentOnboardingState;
}

async function persistOnboardingEnrollment(
  userId: string,
  state: PathEnrollmentOnboardingState,
  onboardingData?: Record<string, unknown> | null,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      onboardingData: {
        ...(onboardingData ?? {}),
        [PATH_ENROLLMENT_ONBOARDING_KEY]: state,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}

function resolvePathSlug(pathSlug?: string): string {
  return pathSlug ?? HARD_SEASONS_PATH.slug;
}

async function tryEnrollInPathenrollmentTable(
  userId: string,
  pathSlug: string,
): Promise<boolean | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { error } = await client.from("pathEnrollment").insert({
    userId: userId,
    status: PATH_ENROLLMENT_STATUS.ACTIVE,
    pathId: pathSlug,
    completedSessionsCount: 0,
  });

  if (!error) return true;
  if (isSchemaUnavailable(error)) return null;
  throw error;
}

/**
 * Enroll current user in a path — pathenrollment1 row or onboardingData fallback.
 */
export async function enrollInPath(
  userId: string,
  pathSlug: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<void> {
  const slug = resolvePathSlug(pathSlug);
  const fromTable = await tryEnrollInPathenrollmentTable(userId, slug);
  if (fromTable !== null) return;

  const path = getPathBySlug(slug) ?? HARD_SEASONS_PATH;
  const existing = readEnrollmentState(onboardingData);
  const nextState: PathEnrollmentOnboardingState = {
    ...existing,
    enrollment_id: existing.enrollment_id ?? crypto.randomUUID(),
    status: PATH_ENROLLMENT_STATUS.ACTIVE,
    path_slug: path.slug,
    completedMicroCommitmentSessionIds:
      existing.completedMicroCommitmentSessionIds ?? [],
    focusedMicroCommitmentSessionId:
      existing.focusedMicroCommitmentSessionId ?? [path.sessions[0]?.id].filter(Boolean),
  };

  await persistOnboardingEnrollment(userId, nextState, onboardingData);
}

async function tryUnenrollInPathenrollmentTable(
  userId: string,
  enrollmentId: string,
): Promise<boolean | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { error } = await client
    .from("pathEnrollment")
    .update({
      status: PATH_ENROLLMENT_STATUS.ABANDONED,
    })
    .eq("id", enrollmentId)
    .eq("userId", userId);

  if (!error) return true;
  if (isSchemaUnavailable(error)) return null;
  throw error;
}

/**
 * Unenroll from a path — updates pathenrollment1 status or onboardingData fallback.
 */
export async function unenrollFromPath(
  userId: string,
  enrollmentId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<void> {
  const fromTable = await tryUnenrollInPathenrollmentTable(userId, enrollmentId);
  if (fromTable !== null) return;

  const existing = readEnrollmentState(onboardingData);
  if (!existing.enrollment_id || existing.enrollment_id !== enrollmentId) {
    throw new Error("Enrollment not found");
  }

  const nextState: PathEnrollmentOnboardingState = {
    ...existing,
    status: PATH_ENROLLMENT_STATUS.ABANDONED,
  };

  await persistOnboardingEnrollment(userId, nextState, onboardingData);
}
