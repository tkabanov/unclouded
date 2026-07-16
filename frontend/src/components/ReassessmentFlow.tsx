import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarClock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import CrisisBar from "@/components/CrisisBar";
import OnboardingStability from "@/components/OnboardingStability";
import OnboardingPerformance from "@/components/OnboardingPerformance";
import OnboardingAlignment from "@/components/OnboardingAlignment";
import OnboardingOrientation from "@/components/OnboardingOrientation";
import ReassessmentReflections from "@/components/ReassessmentReflections";
import ResultsComparison, {
  type PdfDownloadState,
} from "@/components/ResultsComparison";
import { computeResults, type ResultsData } from "@/lib/classification";
import type { ReflectionAnswers } from "@/lib/reassessment";
import { PATH_ADAPTIVE_QUESTION_SLOT, reflectionQuestions } from "@/lib/reassessment";
import { getPriorAssessmentResult } from "@/lib/reassessment/assessmentResultApi";
import { canAccessReassessment } from "@/lib/reassessment/reassessmentEntitlements";
import { fetchPathAdaptiveReflectionQuestion } from "@/lib/reassessment/pathAdaptiveReflectionApi";
import type { CompleteReassessmentResult } from "@/lib/reassessment/completeReassessment";
import {
  downloadPupPdf,
  pupPdfFilename,
} from "@/lib/reassessment/pdf/downloadPupPdf";
import { generateAndPersistPupPdf } from "@/lib/reassessment/pdf/generateAndPersistPupPdf";
import type { GeneratedPupPdf } from "@/lib/reassessment/pdf/generateAndPersistPupPdf";
import { resolveCurrentTier } from "@/lib/settings/subscriptionApi";
import { TIER } from "@/lib/enums/tier";
import { useUserProfile } from "@/lib/userProfile";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const TOTAL_SCORED_STEPS = 4;

/** 90-day reassessment flow — lives on the onboarding page in Bubble (bTGNJ). */
export default function ReassessmentFlow() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading, saveReassessment } = useUserProfile();

  const [step, setStep] = useState(0);
  const [stabilityScores, setStabilityScores] = useState<Record<string, number>>({});
  const [performanceScores, setPerformanceScores] = useState<Record<string, number>>({});
  const [alignmentScores, setAlignmentScores] = useState<Record<string, number>>({});
  const [orientationScore, setOrientationScore] = useState(0);
  const [reflections, setReflections] = useState<ReflectionAnswers>({});
  const [pathAdaptiveQ, setPathAdaptiveQ] = useState<string | null>(null);
  const [adaptiveQuestions, setAdaptiveQuestions] = useState(reflectionQuestions);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [completeResult, setCompleteResult] = useState<CompleteReassessmentResult | null>(null);
  const [pdfState, setPdfState] = useState<PdfDownloadState>("idle");
  const [generatedPdf, setGeneratedPdf] = useState<GeneratedPupPdf | null>(null);

  // Snapshot baseline at flow start so comparison survives promote of profile.results.
  const [firstResultsSnapshot, setFirstResultsSnapshot] = useState<ResultsData | null>(null);
  const [priorAssessmentDate, setPriorAssessmentDate] = useState<string | null>(null);
  const [baselineReady, setBaselineReady] = useState(false);

  const tier = resolveCurrentTier(!!profile?.subscribed, profile?.tier);
  const accessAllowed = canAccessReassessment({
    tier,
    lastAssessmentDate: profile?.lastAssessmentDate ?? null,
    nextReassessmentDate: profile?.nextReassessmentDate ?? null,
    onboardingCompletedAt: profile?.onboardingCompletedAt ?? null,
    canReassessOnDemand: profile?.canReassessOnDemand,
    reassessmentCompletedAt: profile?.reassessmentCompletedAt ?? null,
  });
  /** After save, profile dates advance +90d — keep showing results until the user leaves. */
  const flowInProgress = step > 0 || saved;

  useEffect(() => {
    if (!user?.id || !profile || baselineReady) return;
    let cancelled = false;

    (async () => {
      try {
        const prior = await getPriorAssessmentResult(user.id);
        if (cancelled) return;
        const fromHistory = prior?.rawResults ?? null;
        setFirstResultsSnapshot(fromHistory ?? profile.results ?? null);
        setPriorAssessmentDate(
          prior?.assessmentDate ??
            profile.lastAssessmentDate ??
            profile.onboardingCompletedAt ??
            null,
        );
      } catch (err) {
        console.warn("Prior assessment lookup failed; using profile.results", err);
        if (cancelled) return;
        setFirstResultsSnapshot(profile.results ?? null);
        setPriorAssessmentDate(
          profile.lastAssessmentDate ?? profile.onboardingCompletedAt ?? null,
        );
      } finally {
        if (!cancelled) setBaselineReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, profile, baselineReady]);

  const priorSignals = useMemo(() => {
    const data = (profile?.onboardingData ?? {}) as Record<string, unknown>;
    return {
      loadSignals: (data.loadSignals as Record<string, string>) ?? {},
      stateSignals: (data.stateSignals as Record<string, string>) ?? {},
      behavioralPatterns: (data.behavioralPatterns as Record<string, string>) ?? {},
      healthFlags:
        (data.healthFlags as {
          recovery_mode_active: boolean;
          grief_mode_active: boolean;
          selected_flags: string[];
        }) ?? { recovery_mode_active: false, grief_mode_active: false, selected_flags: [] },
    };
  }, [profile]);

  const secondResults = useMemo(() => {
    if (step < 6) return null;
    return computeResults(
      stabilityScores,
      performanceScores,
      alignmentScores,
      orientationScore,
      priorSignals.loadSignals,
      priorSignals.stateSignals,
      priorSignals.behavioralPatterns,
      priorSignals.healthFlags,
    );
  }, [step, stabilityScores, performanceScores, alignmentScores, orientationScore, priorSignals]);

  useEffect(() => {
    if (step < 5 || !user?.id) return;
    let cancelled = false;
    fetchPathAdaptiveReflectionQuestion(user.id)
      .then((adaptive) => {
        if (cancelled || !adaptive) return;
        setPathAdaptiveQ(adaptive.question);
        setAdaptiveQuestions((prev) => {
          const next = [...prev];
          next[PATH_ADAPTIVE_QUESTION_SLOT] = {
            ...next[PATH_ADAPTIVE_QUESTION_SLOT],
            question: adaptive.question,
            placeholder: `Reflecting on ${adaptive.pathName}…`,
          };
          return next;
        });
      })
      .catch((err) => console.warn("Path-adaptive reflection lookup failed", err));
    return () => {
      cancelled = true;
    };
  }, [step, user?.id]);

  const reflectionQuestionsForStep = useMemo(() => adaptiveQuestions, [adaptiveQuestions]);

  const runPdfGeneration = useCallback(
    async (assessmentId: string, force = false) => {
      if (!user?.id) return;
      if (tier !== TIER.PRO && tier !== TIER.PREMIUM) return;
      setPdfState("generating");
      try {
        const generated = await generateAndPersistPupPdf({
          userId: user.id,
          assessmentResultId: assessmentId,
          force,
        });
        setGeneratedPdf(generated);
        setPdfState("ready");
      } catch (err) {
        console.error("Failed to generate PuP PDF", err);
        setPdfState("error");
        toast.error("Couldn't prepare your PuP 360 PDF. You can retry from the button.");
      }
    },
    [tier, user?.id],
  );

  useEffect(() => {
    if (step === 6 && secondResults && !saved && !saveError && firstResultsSnapshot) {
      setSaved(true);
      const adaptiveField = reflectionQuestions[PATH_ADAPTIVE_QUESTION_SLOT]?.field;
      const adaptiveAns =
        pathAdaptiveQ && adaptiveField
          ? (reflections[adaptiveField] ?? "").trim() || null
          : null;

      saveReassessment({
        results: secondResults,
        firstResults: firstResultsSnapshot,
        reassessmentData: {
          stabilityScores,
          performanceScores,
          alignmentScores,
          orientationScore,
        },
        reflections,
        pathAdaptiveQ,
        pathAdaptiveAnswer: adaptiveAns,
      })
        .then((result) => {
          setCompleteResult(result);
          void runPdfGeneration(result.assessmentId);
        })
        .catch((err) => {
          console.error("Failed to save reassessment", err);
          setSaved(false);
          setSaveError(true);
          toast.error("Couldn't save your reassessment. Please try again.");
        });
    }
  }, [
    step,
    secondResults,
    saved,
    saveError,
    saveReassessment,
    stabilityScores,
    performanceScores,
    alignmentScores,
    orientationScore,
    reflections,
    pathAdaptiveQ,
    firstResultsSnapshot,
    runPdfGeneration,
  ]);

  const handleDownloadPdf = useCallback(async () => {
    if (!generatedPdf) return;
    try {
      await downloadPupPdf({
        bytes: generatedPdf.bytes,
        storagePath: generatedPdf.storagePath,
        filename: pupPdfFilename(
          generatedPdf.payload.tier,
          generatedPdf.payload.assessmentDate,
        ),
      });
    } catch (err) {
      console.error(err);
      toast.error("Couldn't download your PDF.");
    }
  }, [generatedPdf]);

  const handleRetryPdf = useCallback(() => {
    if (!completeResult?.assessmentId) return;
    void runPdfGeneration(completeResult.assessmentId, true);
  }, [completeResult?.assessmentId, runPdfGeneration]);

  if (loading && !flowInProgress) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!flowInProgress && (!profile?.results || !accessAllowed)) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <CrisisBar />
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="max-w-md space-y-4 text-center">
            <h1 className="text-2xl font-bold text-foreground">Reassessment unavailable</h1>
            <p className="text-muted-foreground">
              {!profile?.results
                ? "Complete your first assessment before retaking the PuP 360."
                : tier === "free"
                  ? "The 90-day reassessment is available on Pro and Premium plans."
                  : tier === "premium"
                    ? "Premium on-demand reassessment unlocks 30 days after your last assessment."
                    : "Your next 90-day reassessment isn’t due yet. We’ll notify you when it’s ready."}
            </p>
            <Button variant="cta" onClick={() => navigate("/dashboard")}>
              Back to dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const firstName = profile?.firstName ?? "";
  const scoredStepIndex = step;
  const baseline = firstResultsSnapshot ?? profile?.results ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CrisisBar />
      <main className="min-h-0 flex-1 overflow-y-auto">
        {scoredStepIndex >= 1 && scoredStepIndex <= TOTAL_SCORED_STEPS && (
          <div className="px-4 pt-4">
            <div className="mx-auto max-w-2xl">
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium uppercase tracking-wide">90-Day Reassessment</span>
                <span>
                  Section {scoredStepIndex} of {TOTAL_SCORED_STEPS}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${(scoredStepIndex / TOTAL_SCORED_STEPS) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {step === 0 && (
          <div className="flex flex-1 items-center justify-center px-4 py-12">
            <div className="w-full max-w-lg space-y-6 text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <CalendarClock className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
                  Your 90-day reassessment, {firstName}
                </h1>
                <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
                  You&apos;ll answer the same scored questions as onboarding, then 4 optional
                  reflections. At the end you&apos;ll see exactly how your scores have changed.
                </p>
              </div>
              <div className="space-y-1.5 rounded-xl border border-border bg-card p-4 text-left text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-primary" /> 16 scored questions across
                  Stability, Performance & Alignment
                </p>
                <p className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-primary" /> 4 optional progress
                  reflections (not scored)
                </p>
                <p className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-primary" /> A side-by-side comparison of
                  your first and latest results
                </p>
              </div>
              <Button variant="cta" size="lg" onClick={() => setStep(1)} className="group">
                Start reassessment
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <OnboardingStability
            onNext={(scores) => {
              setStabilityScores(scores);
              setStep(2);
            }}
          />
        )}
        {step === 2 && (
          <OnboardingPerformance
            onNext={(scores) => {
              setPerformanceScores(scores);
              setStep(3);
            }}
          />
        )}
        {step === 3 && (
          <OnboardingAlignment
            onNext={(scores) => {
              setAlignmentScores(scores);
              setStep(4);
            }}
          />
        )}
        {step === 4 && (
          <OnboardingOrientation
            onNext={(score) => {
              setOrientationScore(score);
              setStep(5);
            }}
          />
        )}
        {step === 5 && (
          <ReassessmentReflections
            firstName={firstName}
            questions={reflectionQuestionsForStep}
            onNext={(answers) => {
              setReflections(answers);
              setStep(6);
            }}
          />
        )}

        {step === 6 && secondResults && baseline && (
          <div className="flex flex-1 items-start justify-center overflow-y-auto px-4 py-10">
            <div className="w-full max-w-2xl space-y-8 pb-12">
              <div className="space-y-2 text-center">
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  90-Day Reassessment · Complete
                </p>
                <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
                  Here&apos;s how far you&apos;ve come, {firstName}
                </h1>
              </div>

              <ResultsComparison
                firstName={firstName}
                first={baseline}
                second={secondResults}
                reflections={reflections}
                tier={tier}
                showWhatIsNext
                priorAssessmentDate={priorAssessmentDate}
                modeChanged={completeResult?.modeChanged}
                previousMode={completeResult?.previousMode}
                newMode={completeResult?.newMode}
                recommendedPaths={completeResult?.recommendedPaths}
                nextFocusText={completeResult?.nextFocusText}
                pdfState={
                  tier === TIER.PRO || tier === TIER.PREMIUM ? pdfState : "idle"
                }
                onDownloadPdf={() => void handleDownloadPdf()}
                onRetryPdf={handleRetryPdf}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
