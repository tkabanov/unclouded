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
      onboarding_data: {
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
  const { error } = await client.from("pathenrollment1").insert({
    user_user: userId,
    status_option_path_enrollment_status: PATH_ENROLLMENT_STATUS.ACTIVE,
    path_custom_path: pathSlug,
    completed_sessions_count_number: 0,
  });

  if (!error) return true;
  if (isSchemaUnavailable(error)) return null;
  throw error;
}

/**
 * Enroll current user in a path — pathenrollment1 row or onboarding_data fallback.
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
    status_option_path_enrollment_status: PATH_ENROLLMENT_STATUS.ACTIVE,
    path_slug: path.slug,
    completed_micro_commitment_session_list_list_custom_pathsession:
      existing.completed_micro_commitment_session_list_list_custom_pathsession ?? [],
    focused_m_commitment_custom_pathsession:
      existing.focused_m_commitment_custom_pathsession ?? [path.sessions[0]?.id].filter(Boolean),
  };

  await persistOnboardingEnrollment(userId, nextState, onboardingData);
}

async function tryUnenrollInPathenrollmentTable(
  userId: string,
  enrollmentId: string,
): Promise<boolean | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { error } = await client
    .from("pathenrollment1")
    .update({
      status_option_path_enrollment_status: PATH_ENROLLMENT_STATUS.ABANDONED,
    })
    .eq("id", enrollmentId)
    .eq("user_user", userId);

  if (!error) return true;
  if (isSchemaUnavailable(error)) return null;
  throw error;
}

/**
 * Unenroll from a path — updates pathenrollment1 status or onboarding_data fallback.
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
    status_option_path_enrollment_status: PATH_ENROLLMENT_STATUS.ABANDONED,
  };

  await persistOnboardingEnrollment(userId, nextState, onboardingData);
}
