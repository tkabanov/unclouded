import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarClock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import CrisisBar from "@/components/CrisisBar";
import OnboardingStability from "@/components/OnboardingStability";
import OnboardingPerformance from "@/components/OnboardingPerformance";
import OnboardingAlignment from "@/components/OnboardingAlignment";
import OnboardingOrientation from "@/components/OnboardingOrientation";
import ReassessmentReflections from "@/components/ReassessmentReflections";
import ResultsComparison from "@/components/ResultsComparison";
import { computeResults } from "@/lib/classification";
import type { ReflectionAnswers } from "@/lib/reassessment";
import { useUserProfile } from "@/lib/userProfile";
import { toast } from "sonner";

const TOTAL_SCORED_STEPS = 4;

/** 90-day reassessment flow — lives on the onboarding page in Bubble (bTGNJ). */
export default function ReassessmentFlow() {
  const navigate = useNavigate();
  const { profile, loading, saveReassessment } = useUserProfile();

  const [step, setStep] = useState(0);
  const [stabilityScores, setStabilityScores] = useState<Record<string, number>>({});
  const [performanceScores, setPerformanceScores] = useState<Record<string, number>>({});
  const [alignmentScores, setAlignmentScores] = useState<Record<string, number>>({});
  const [orientationScore, setOrientationScore] = useState(0);
  const [reflections, setReflections] = useState<ReflectionAnswers>({});
  const [saved, setSaved] = useState(false);

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
    if (step === 6 && secondResults && !saved) {
      setSaved(true);
      saveReassessment({
        results: secondResults,
        reassessmentData: {
          stabilityScores,
          performanceScores,
          alignmentScores,
          orientationScore,
        },
        reflections,
      }).catch((err) => {
        console.error("Failed to save reassessment", err);
        toast.error("Couldn't save your reassessment. Please try again.");
      });
    }
  }, [
    step,
    secondResults,
    saved,
    saveReassessment,
    stabilityScores,
    performanceScores,
    alignmentScores,
    orientationScore,
    reflections,
  ]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!profile?.results || !profile.subscribed) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <CrisisBar />
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="max-w-md space-y-4 text-center">
            <h1 className="text-2xl font-bold text-foreground">Reassessment unavailable</h1>
            <p className="text-muted-foreground">
              The 90-day reassessment is available to subscribers who have completed their first
              assessment.
            </p>
            <Button variant="cta" onClick={() => navigate("/dashboard")}>
              Back to dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const firstName = profile.firstName;
  const scoredStepIndex = step;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CrisisBar />
      <main className="flex flex-1 flex-col">
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
                  It's been about 90 days since your first assessment. You'll answer the same 16
                  scored questions, then 4 optional reflections. At the end you'll see exactly how
                  your scores have changed.
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
                  your first and second results
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
            onNext={(answers) => {
              setReflections(answers);
              setStep(6);
            }}
          />
        )}

        {step === 6 && secondResults && (
          <div className="flex flex-1 items-start justify-center overflow-y-auto px-4 py-10">
            <div className="w-full max-w-2xl space-y-8 pb-12">
              <div className="space-y-2 text-center">
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  90-Day Reassessment · Complete
                </p>
                <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
                  Here's how far you've come, {firstName}
                </h1>
              </div>

              <ResultsComparison
                firstName={firstName}
                first={profile.results}
                second={secondResults}
                reflections={reflections}
              />

              <div className="pt-2 text-center">
                <Button
                  variant="cta"
                  size="lg"
                  onClick={() => navigate("/dashboard")}
                  className="group"
                >
                  Back to my dashboard
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
