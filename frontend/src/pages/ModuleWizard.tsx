import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import ModuleIntroScreen from "@/components/modules/ModuleIntroScreen";
import ModuleMultiSelectScreen from "@/components/modules/ModuleMultiSelectScreen";
import ModuleQuestionScreen from "@/components/modules/ModuleQuestionScreen";
import ModuleResultsScreen from "@/components/modules/ModuleResultsScreen";
import ModuleWizardShell from "@/components/modules/ModuleWizardShell";
import { useModuleWizard } from "@/components/modules/useModuleWizard";
import { useAuth } from "@/hooks/useAuth";
import {
  completeModule,
  ModuleLockedError,
  ModuleRefreshNotAvailableError,
} from "@/lib/modules/completeModule";
import { getModuleDefinition } from "@/lib/modules/moduleConfigApi";
import { getModuleAvailability } from "@/lib/modules/moduleScheduler";
import { isModuleSlug } from "@/lib/modules/moduleSlugs";
import type { ModuleProfileInput } from "@/lib/modules/readModuleProfile";
import {
  fetchNewlyUnlockedPaths,
  type NewlyUnlockedPath,
} from "@/lib/modules/results/moduleUnlockedPaths";
import { resolveModuleResults, type ModuleResultsView } from "@/lib/modules/results/resolveModuleResults";
import { resolvePathsUserTier } from "@/lib/paths/resolvePathsUserTier";
import { useUserProfile } from "@/lib/userProfile";

export default function ModuleWizard() {
  const { moduleSlug } = useParams<{ moduleSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, refresh } = useUserProfile();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<ModuleResultsView | null>(null);
  const [unlockedPaths, setUnlockedPaths] = useState<NewlyUnlockedPath[]>([]);
  const profileBeforeRef = useRef<ModuleProfileInput | null>(null);

  const slug = moduleSlug && isModuleSlug(moduleSlug) ? moduleSlug : null;

  const definition = useMemo(() => (slug ? getModuleDefinition(slug) : null), [slug]);

  const wizard = useModuleWizard(slug ?? "identity");

  const availability = useMemo(() => {
    if (!profile || !slug) return null;
    return getModuleAvailability(profile, new Date())[slug];
  }, [profile, slug]);

  const isRefreshMode = availability?.status === "refresh_available";

  useEffect(() => {
    if (!slug || !profile || !availability) return;

    // Skip while the user is on the complete step of the wizard they are currently
    // finishing — submitAnswers' refresh() flips availability to "completed" mid-flow,
    // and that must not bounce them off the results screen they just earned.
    if (wizard.currentStep.kind === "complete" || submitted) return;

    if (!isModuleSlug(moduleSlug ?? "")) {
      navigate("/settings?tab=profile", { replace: true });
      return;
    }

    if (availability.status === "completed") {
      toast.info("You have already completed this module.");
      navigate("/settings?tab=profile", { replace: true });
      return;
    }

    if (availability.status === "locked") {
      toast.info(`This module is available in ${availability.daysUntilUnlock} day(s).`);
      navigate("/settings?tab=profile", { replace: true });
    }
  }, [slug, moduleSlug, profile, availability, navigate, wizard.currentStep.kind, submitted]);

  const handleSkip = useCallback(() => {
    navigate("/settings?tab=profile");
  }, [navigate]);

  const submitAnswers = useCallback(async () => {
    if (!user || !slug || submitting || submitted) return;

    // Snapshot before refresh() mutates the context profile — MRS-02 needs the before-state.
    profileBeforeRef.current = profile ?? {};
    setSubmitting(true);
    try {
      await completeModule(user.id, slug, wizard.answers, {
        mode: isRefreshMode ? "refresh" : "initial",
      });
      // Wait for the fresh profile to land in context before flipping `submitted` —
      // otherwise the results-resolving effect can fire on the stale pre-submit
      // profile and its `|| results` guard permanently locks in empty reflections.
      await refresh();
      setSubmitted(true);
      toast.success(
        isRefreshMode
          ? `${definition?.displayTitle ?? "Module"} refreshed.`
          : `${definition?.displayTitle ?? "Module"} saved.`,
      );
    } catch (error) {
      if (error instanceof ModuleLockedError || error instanceof ModuleRefreshNotAvailableError) {
        toast.error(error.message);
        navigate("/settings?tab=profile");
        return;
      }
      console.error(error);
      toast.error("Could not save your answers. Please try again.");
      wizard.goBack();
    } finally {
      setSubmitting(false);
    }
  }, [
    user,
    slug,
    submitting,
    submitted,
    wizard,
    refresh,
    profile,
    definition?.displayTitle,
    navigate,
    isRefreshMode,
  ]);

  // Once refresh() lands the updated profile in context, resolve results from it —
  // guarantees the completion view matches what Review (MRS-05) shows later.
  useEffect(() => {
    if (!submitted || !slug || !profile || results) return;

    setResults(resolveModuleResults(slug, profile));

    if (slug === "history") return;

    fetchNewlyUnlockedPaths({
      slug,
      profileBefore: profileBeforeRef.current ?? {},
      profileAfter: profile,
      userTier: resolvePathsUserTier(profile),
    })
      .then(setUnlockedPaths)
      .catch((error) => {
        console.error(error);
        setUnlockedPaths([]);
      });
  }, [submitted, slug, profile, results]);

  const handleQuestionContinue = useCallback(async () => {
    if (wizard.isLastQuestionStep) {
      wizard.goNext();
      return;
    }
    wizard.goNext();
  }, [wizard]);

  useEffect(() => {
    if (wizard.currentStep.kind === "complete" && !submitted && !submitting) {
      void submitAnswers();
    }
  }, [wizard.currentStep.kind, submitted, submitting, submitAnswers]);

  if (!slug || !definition) {
    return null;
  }

  const { currentStep, questions, answers, goBack, goNext, setAnswer, toggleMultiSelect } = wizard;

  return (
    <ModuleWizardShell
      moduleTitle={definition.displayTitle}
      showBack={currentStep.kind !== "intro"}
      onBack={currentStep.kind === "intro" ? handleSkip : goBack}
    >
      {currentStep.kind === "intro" ? (
        <ModuleIntroScreen
          definition={definition}
          onStart={goNext}
          onSkip={slug === "history" && !isRefreshMode ? handleSkip : undefined}
          subtitle={
            isRefreshMode
              ? "Refresh your answers — your previous completion stays on your profile."
              : undefined
          }
        />
      ) : null}

      {currentStep.kind === "question" ? (
        currentStep.question.kind === "multi_select" ? (
          <ModuleMultiSelectScreen
            question={currentStep.question}
            questionNumber={currentStep.index + 1}
            totalQuestions={questions.length}
            value={answers[currentStep.question.id]}
            onToggle={(optionSlug) => toggleMultiSelect(currentStep.question.id, optionSlug)}
            onContinue={() => void handleQuestionContinue()}
            canContinue={Array.isArray(answers[currentStep.question.id]) && (answers[currentStep.question.id] as unknown[]).length > 0}
          />
        ) : (
          <ModuleQuestionScreen
            question={currentStep.question}
            questionNumber={currentStep.index + 1}
            totalQuestions={questions.length}
            value={answers[currentStep.question.id]}
            onSelect={(optionSlug) => setAnswer(currentStep.question.id, optionSlug)}
            onContinue={() => void handleQuestionContinue()}
            canContinue={typeof answers[currentStep.question.id] === "string" && Boolean(answers[currentStep.question.id])}
          />
        )
      ) : null}

      {currentStep.kind === "complete" ? (
        <ModuleResultsScreen
          definition={definition}
          results={results ?? { headline: definition.displayTitle, lead: "", reflections: [], whatThisUnlocks: [] }}
          unlockedPaths={unlockedPaths}
          submitting={submitting || !submitted || !results}
          onFinish={() => navigate("/settings?tab=profile")}
        />
      ) : null}
    </ModuleWizardShell>
  );
}
