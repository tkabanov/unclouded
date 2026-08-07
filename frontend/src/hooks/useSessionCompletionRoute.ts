import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { PATH_ENROLLMENT_STATUS } from "@/lib/enums/pathEnrollment";
import { usePathsEnrollmentStore } from "@/lib/paths/pathsEnrollmentStore";
import { SESSION_SEARCH_PARAM } from "@/lib/paths/routes";

export function useSessionCompletionRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionId = searchParams.get(SESSION_SEARCH_PARAM);
  const { enrollments, loading } = usePathsEnrollmentStore();

  const matchingEnrollment = useMemo(() => {
    if (!sessionId) return null;
    const matches = enrollments.filter(
      (enrollment) => enrollment.currentSessionId === sessionId,
    );
    if (matches.length === 0) return null;
    return (
      matches.find(
        (enrollment) =>
          enrollment.status === PATH_ENROLLMENT_STATUS.ACTIVE ||
          enrollment.status === PATH_ENROLLMENT_STATUS.PAUSED,
      ) ?? matches[0]
    );
  }, [enrollments, sessionId]);

  /** True when the session form can be shown (enrollment still points at this session). */
  const isVisible = Boolean(sessionId && matchingEnrollment && !loading);
  /**
   * Keep the completion route mounted whenever `?session=` is present — including after
   * refresh advances `currentSessionId`, so the path-closing three-part UI can still render.
   */
  const isRouteActive = Boolean(sessionId);

  const clearSessionParam = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(SESSION_SEARCH_PARAM);
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  return {
    sessionId,
    isVisible,
    isRouteActive,
    loading,
    matchingEnrollment,
    clearSessionParam,
  };
}
