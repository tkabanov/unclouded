import { supabase } from "@/integrations/supabase/client";
import { PATH_ENROLLMENT_STATUS } from "@/lib/enums/pathEnrollment";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

export interface PathAdaptiveReflection {
  pathId: string;
  pathName: string;
  question: string;
  sessionId: string;
}

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

/**
 * If the user completed ≥1 path, return the final session's
 * reassessmentReflectionQuestion for the most recently completed path.
 */
export async function fetchPathAdaptiveReflectionQuestion(
  userId: string,
): Promise<PathAdaptiveReflection | null> {
  const client = supabase as unknown as UntypedSupabase;

  const { data: enrollments, error: enrollError } = await client
    .from("pathEnrollment")
    .select("pathId, status, updatedAt, completedSessionsCount")
    .eq("userId", userId)
    .eq("status", PATH_ENROLLMENT_STATUS.COMPLETED)
    .order("updatedAt", { ascending: false })
    .limit(1);

  if (enrollError) {
    if (isSchemaUnavailable(enrollError)) return null;
    throw enrollError;
  }

  const enrollment = Array.isArray(enrollments) ? enrollments[0] : null;
  const pathId = (enrollment as { pathId?: string } | null)?.pathId;
  if (!pathId) return null;

  const { data: pathRow } = await client.from("path").select("id, name").eq("id", pathId).maybeSingle();

  const { data: sessions, error: sessionError } = await client
    .from("pathSession")
    .select("id, index, reassessmentReflectionQuestion")
    .eq("pathId", pathId)
    .order("index", { ascending: false })
    .limit(5);

  if (sessionError) {
    if (isSchemaUnavailable(sessionError)) return null;
    throw sessionError;
  }

  if (!Array.isArray(sessions)) return null;

  for (const session of sessions) {
    const row = session as {
      id?: string;
      reassessmentReflectionQuestion?: string | null;
    };
    const question = row.reassessmentReflectionQuestion?.trim();
    if (question && row.id) {
      return {
        pathId,
        pathName: (pathRow as { name?: string } | null)?.name?.trim() || "your path",
        question,
        sessionId: row.id,
      };
    }
  }

  return null;
}
