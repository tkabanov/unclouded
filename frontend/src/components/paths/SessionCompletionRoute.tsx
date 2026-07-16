import { useCallback, useEffect, useState } from "react";
import {
  SessionCompletionForm,
  type PathSessionFormData,
} from "@/components/design-system/SessionCompletionForm";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessionCompletionRoute } from "@/hooks/useSessionCompletionRoute";
import { usePathsEnrollmentStore } from "@/lib/paths/pathsEnrollmentStore";
import {
  completePathSession,
  fetchPathSession,
} from "@/lib/paths/pathsSessionApi";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isVisible || !sessionId) {
      setSession(null);
      setAnswers({});
      setReflectionChecked(false);
      setSubmitError(null);
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
    if (!sessionId || !matchingEnrollment || !session || submitting) return;

    const missing = session.questions.filter(
      (question) => !(answers[question.id]?.trim()),
    );
    if (session.questions.length > 0 && missing.length > 0) {
      setSubmitError("Answer all reflection questions to complete this session.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await completePathSession({
        sessionId,
        enrollmentId: matchingEnrollment.enrollmentId,
        answers: session.questions.map((question) => ({
          questionId: question.id,
          questionText: question.questionText,
          answerText: answers[question.id] ?? "",
        })),
        setAsFocus: reflectionChecked,
        microCommitmentText: session.microCommitment,
        pathName: matchingEnrollment.pathName,
        sessionTitle: session.title,
      });
      clearSessionParam();
      onReturnToMyPaths();
      await refresh();
      toast.success("Session completed");
    } catch (error) {
      console.error("Failed to submit session completion", error);
      const message =
        error instanceof Error
          ? error.message
          : "Could not complete this session. Please try again.";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [
    sessionId,
    matchingEnrollment,
    session,
    answers,
    reflectionChecked,
    submitting,
    clearSessionParam,
    onReturnToMyPaths,
    refresh,
  ]);

  if (!isVisible) return null;

  const isComingSoon =
    Boolean(session) &&
    !session?.coachingText.trim() &&
    (session?.questions.length ?? 0) === 0;

  return (
    <div className="flex w-full flex-col">
      <div className={cn("w-full", submitting && "pointer-events-none opacity-70")}>
        {loading ? (
          <div className="flex w-full flex-col gap-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isComingSoon ? (
          <div className="flex w-full flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-6">
            <h2 className="text-xl font-semibold text-foreground">
              {session?.title || "Session coming soon"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Session content is coming soon. Check back after this path step is
              published.
            </p>
          </div>
        ) : session ? (
          <div className="flex w-full flex-col gap-3">
            <SessionCompletionForm
              session={session}
              answers={answers}
              onAnswerChange={(questionId, value) => {
                setSubmitError(null);
                setAnswers((current) => ({ ...current, [questionId]: value }));
              }}
              reflectionChecked={reflectionChecked}
              onReflectionChange={setReflectionChecked}
              onSubmit={() => void handleSubmit()}
            />
            {submitError ? (
              <p className="text-sm text-destructive" role="alert">
                {submitError}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            This session could not be loaded.
          </p>
        )}
      </div>
    </div>
  );
}
