import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import {
  SessionCompletionForm,
  type JournalLetterDisposition,
  type PathSessionFormData,
} from "@/components/design-system/SessionCompletionForm";
import LockedFeatureUpgradeDialog from "@/components/subscription/LockedFeatureUpgradeDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { useLockedFeatureUpsell } from "@/hooks/useLockedFeatureUpsell";
import { useSessionCompletionRoute } from "@/hooks/useSessionCompletionRoute";
import { useUserProfile } from "@/lib/userProfile";
import { createJournalEntry } from "@/lib/journal/journalEntriesApi";
import { fetchPathSessionsByKey } from "@/lib/paths/pathsCatalogApi";
import {
  assembleUnsentLetterContent,
  buildUnsentLetterSections,
  fetchUserPathSessionAnswers,
  isDirectedWritingSubMode,
  isFinalDirectedWritingSession,
  UNSENT_LETTER_JOURNAL_TITLE,
} from "@/lib/paths/directedWritingHelpers";
import { TIER } from "@/lib/enums/tier";
import { userCanAccessPathTier } from "@/lib/paths/pathEnrollmentMatching";
import { isSuccessPlanPath, userCanAccessPathClient } from "@/lib/paths/successPlanAccess";
import { usePathsEnrollmentStore } from "@/lib/paths/pathsEnrollmentStore";
import {
  completePathSession,
  fetchPathSession,
  PathSessionUpgradeRequiredError,
} from "@/lib/paths/pathsSessionApi";
import { loadSubscriptionOverview } from "@/lib/subscription/subscriptionApi";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { toast } from "sonner";

type SessionCompletionRouteProps = {
  onReturnToMyPaths: () => void;
};

/** bTJAG/bTJAB mount — DS-04 session completion overlay on /paths. */
export default function SessionCompletionRoute({
  onReturnToMyPaths,
}: SessionCompletionRouteProps) {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const userTier = useEffectiveTier().tier;
  const { sessionId, isVisible, matchingEnrollment, clearSessionParam } =
    useSessionCompletionRoute();
  const { refresh } = usePathsEnrollmentStore();
  const [session, setSession] = useState<PathSessionFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [reflectionChecked, setReflectionChecked] = useState(false);
  const [journalDisposition, setJournalDisposition] =
    useState<JournalLetterDisposition | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasSuccessPlanAddon, setHasSuccessPlanAddon] = useState(false);

  const pathTier = matchingEnrollment?.tier ?? TIER.FREE;
  const successPlan = isSuccessPlanPath({
    subMode: matchingEnrollment?.subMode,
  });
  const needsUpgrade = Boolean(
    matchingEnrollment &&
      (successPlan
        ? !userCanAccessPathClient({
            isSuccessPlan: true,
            userTier,
            pathTier,
            hasSuccessPlanAddon,
            hasHrAssignment: matchingEnrollment.source === "hr_assign",
          })
        : !userCanAccessPathTier(userTier, pathTier)),
  );
  const lockedPathFeature = successPlan
    ? "successPlan"
    : pathTier === TIER.PREMIUM
      ? "premiumPath"
      : "proPath";
  const pathUpsell = useLockedFeatureUpsell(userTier);

  useEffect(() => {
    if (!successPlan || matchingEnrollment?.source === "hr_assign") {
      setHasSuccessPlanAddon(false);
      return;
    }
    let cancelled = false;
    void loadSubscriptionOverview()
      .then((overview) => {
        if (!cancelled) setHasSuccessPlanAddon(overview.successPlanAddon.active);
      })
      .catch(() => {
        if (!cancelled) setHasSuccessPlanAddon(false);
      });
    return () => {
      cancelled = true;
    };
  }, [successPlan, matchingEnrollment?.source]);

  const directedWriting = isDirectedWritingSubMode(matchingEnrollment?.subMode);
  const isFinalSession = isFinalDirectedWritingSession(session?.sessionIndex);

  useEffect(() => {
    if (!isVisible || !sessionId || needsUpgrade) {
      setSession(null);
      setAnswers({});
      setReflectionChecked(false);
      setJournalDisposition(null);
      setSubmitError(null);
      if (!isVisible || !sessionId) return;
      setLoading(false);
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
  }, [isVisible, sessionId, matchingEnrollment?.pathSlug, needsUpgrade]);

  const handleSubmit = useCallback(async () => {
    if (!sessionId || !matchingEnrollment || !session || submitting || !user) return;
    if (needsUpgrade) {
      pathUpsell.promptUpgrade(lockedPathFeature);
      return;
    }

    const missing = session.questions.filter(
      (question) => !(answers[question.id]?.trim()),
    );
    if (session.questions.length > 0 && missing.length > 0) {
      setSubmitError("Answer all reflection questions to complete this session.");
      return;
    }

    if (directedWriting && isFinalSession && !journalDisposition) {
      setSubmitError("Choose whether to save your letter to your journal or discard it.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const mappedAnswers = session.questions.map((question) => ({
        questionId: question.id,
        questionText: question.questionText,
        answerText: answers[question.id] ?? "",
      }));

      if (
        directedWriting &&
        isFinalSession &&
        journalDisposition === "save" &&
        matchingEnrollment.pathSlug
      ) {
        const pathSessions = await fetchPathSessionsByKey(matchingEnrollment.pathSlug);
        const priorAnswers = await fetchUserPathSessionAnswers(
          user.id,
          pathSessions.map((entry) => entry.id),
          profile?.onboardingData ?? null,
        );
        const currentAnswerText =
          mappedAnswers.map((answer) => answer.answerText.trim()).filter(Boolean).join("\n\n") ||
          "";
        const letterContent = assembleUnsentLetterContent(
          buildUnsentLetterSections(
            pathSessions,
            priorAnswers,
            sessionId,
            currentAnswerText,
          ),
        );

        if (letterContent.trim()) {
          await createJournalEntry(
            user.id,
            {
              title: UNSENT_LETTER_JOURNAL_TITLE,
              moodTag: null,
              content: letterContent,
            },
            profile?.onboardingData ?? null,
          );
        }
      }

      await completePathSession({
        sessionId,
        enrollmentId: matchingEnrollment.enrollmentId,
        answers: mappedAnswers,
        setAsFocus: directedWriting ? false : reflectionChecked,
        microCommitmentText: session.microCommitment,
        pathName: matchingEnrollment.pathName,
        sessionTitle: session.title,
        pathTier: matchingEnrollment.tier,
        subMode: matchingEnrollment.subMode,
        enrollmentSource: matchingEnrollment.source,
      });
      clearSessionParam();
      onReturnToMyPaths();
      await refresh();
      toast.success(
        directedWriting && isFinalSession && journalDisposition === "save"
          ? "Session completed — letter saved to your journal"
          : "Session completed",
      );
    } catch (error) {
      console.error("Failed to submit session completion", error);
      if (error instanceof PathSessionUpgradeRequiredError) {
        pathUpsell.promptUpgrade(lockedPathFeature);
        setSubmitError("Upgrade required to continue this path.");
        return;
      }
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
    journalDisposition,
    directedWriting,
    isFinalSession,
    submitting,
    user,
    profile?.onboardingData,
    needsUpgrade,
    lockedPathFeature,
    pathUpsell.promptUpgrade,
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
        {needsUpgrade ? (
          <div
            className="flex w-full flex-col gap-4 rounded-lg border border-border/60 bg-muted/20 p-6"
            data-testid="session-upgrade-wall"
            data-has-upgrade="true"
          >
            <h2 className="text-xl font-semibold text-foreground">
              {matchingEnrollment?.pathName ?? "Path"} — upgrade required
            </h2>
            <p className="text-sm text-muted-foreground">
              Your progress is saved, but continuing this{" "}
              {pathTier === TIER.PREMIUM ? "Premium" : "Pro"} path requires an
              upgraded plan. Session coaching content stays locked until you
              upgrade.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="cta"
                data-style-ref="Button_primary_"
                className={cn(bubbleStyle("Button_primary_"), "gap-1.5")}
                onClick={() => pathUpsell.promptUpgrade(lockedPathFeature)}
              >
                <Star className="h-4 w-4 shrink-0" aria-hidden />
                Upgrade Plan
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  clearSessionParam();
                  onReturnToMyPaths();
                }}
              >
                Back to My Paths
              </Button>
            </div>
          </div>
        ) : loading ? (
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
          <div className="flex w-full flex-col gap-3" data-has-upgrade="false">
            <SessionCompletionForm
              session={session}
              answers={answers}
              onAnswerChange={(questionId, value) => {
                setSubmitError(null);
                setAnswers((current) => ({ ...current, [questionId]: value }));
              }}
              reflectionChecked={reflectionChecked}
              onReflectionChange={setReflectionChecked}
              directedWriting={directedWriting}
              showFocusCheckbox={!directedWriting}
              journalDisposition={journalDisposition}
              onJournalDispositionChange={(value) => {
                setSubmitError(null);
                setJournalDisposition(value);
              }}
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

      <LockedFeatureUpgradeDialog
        open={pathUpsell.openFeature === lockedPathFeature}
        feature={lockedPathFeature}
        currentTier={userTier}
        onClose={pathUpsell.closeUpsell}
      />
    </div>
  );
}
