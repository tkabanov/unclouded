import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { usePathsEnrollmentStore } from "@/lib/paths/pathsEnrollmentStore";
import { SESSION_SEARCH_PARAM } from "@/lib/paths/routes";

export function useSessionCompletionRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionId = searchParams.get(SESSION_SEARCH_PARAM);
  const { enrollments, loading } = usePathsEnrollmentStore();

  const matchingEnrollment = useMemo(() => {
    if (!sessionId) return null;
    return enrollments.find((enrollment) => enrollment.currentSessionId === sessionId) ?? null;
  }, [enrollments, sessionId]);

  const isVisible = Boolean(sessionId && matchingEnrollment && !loading);

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
    matchingEnrollment,
    clearSessionParam,
  };
}
