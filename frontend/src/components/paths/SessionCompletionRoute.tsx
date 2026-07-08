import { useCallback, useEffect, useState } from "react";
import {
  SessionCompletionForm,
  type PathSessionFormData,
} from "@/components/design-system/SessionCompletionForm";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessionCompletionRoute } from "@/hooks/useSessionCompletionRoute";
import { usePathsEnrollmentStore } from "@/lib/paths/pathsEnrollmentStore";
import {
  PATHS_SESSION_COMPLETION_BUBBLE_ID,
  PATHS_SESSION_COMPLETION_MOUNT_BUBBLE_ID,
} from "@/lib/paths/routes";
import {
  fetchPathSession,
  schedulePathSessionCompletion,
} from "@/lib/paths/pathsSessionApi";
import { cn } from "@/lib/utils";

type SessionCompletionRouteProps = {
  onReturnToMyPaths: () => void;
};

/** bTJAG/bTJAB mount — DS-04 session completion overlay on /paths. */
export default function SessionCompletionRoute({
  onReturnToMyPaths,
}: SessionCompletionRouteProps) {
  const { sessionId, isVisible, matchingEnrollment, clearSessionParam } =
    useSessionCompletionRoute();
  const { refresh } = usePathsEnrollmentStore();
  const [session, setSession] = useState<PathSessionFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [reflectionChecked, setReflectionChecked] = useState(false);

  useEffect(() => {
    if (!isVisible || !sessionId) {
      setSession(null);
      setAnswers({});
      setReflectionChecked(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetchPathSession(sessionId, matchingEnrollment?.pathSlug)
      .then((data) => {
        if (!cancelled) {
          setSession(data);
        }
      })
      .catch((error) => {
        console.error("Failed to load path session", error);
        if (!cancelled) {
          setSession(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isVisible, sessionId, matchingEnrollment?.pathSlug]);

  const handleSubmit = useCallback(async () => {
    if (!sessionId || !matchingEnrollment || submitting) return;

    setSubmitting(true);
    try {
      await schedulePathSessionCompletion(sessionId, matchingEnrollment.enrollmentId);
      clearSessionParam();
      onReturnToMyPaths();
      await refresh();
    } catch (error) {
      console.error("Failed to submit session completion", error);
    } finally {
      setSubmitting(false);
    }
  }, [
    sessionId,
    matchingEnrollment,
    submitting,
    clearSessionParam,
    onReturnToMyPaths,
    refresh,
  ]);

  if (!isVisible) return null;

  return (
    <div
      data-bubble-id={PATHS_SESSION_COMPLETION_MOUNT_BUBBLE_ID}
      className="flex w-full flex-col"
    >
      <div
        data-bubble-id={PATHS_SESSION_COMPLETION_BUBBLE_ID}
        className={cn("w-full", submitting && "pointer-events-none opacity-70")}
      >
        {loading ? (
          <div className="flex w-full flex-col gap-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : session ? (
          <SessionCompletionForm
            session={session}
            answers={answers}
            onAnswerChange={(questionId, value) =>
              setAnswers((current) => ({ ...current, [questionId]: value }))
            }
            reflectionChecked={reflectionChecked}
            onReflectionChange={setReflectionChecked}
            onSubmit={() => void handleSubmit()}
          />
        ) : null}
      </div>
    </div>
  );
}
