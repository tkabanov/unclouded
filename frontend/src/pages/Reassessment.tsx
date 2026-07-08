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

const TOTAL_SCORED_STEPS = 4; // Stability, Performance, Alignment, Orientation (16 scored questions)

const Reassessment = () => {
  const navigate = useNavigate();
  const { profile, loading, saveReassessment } = useUserProfile();

  const [step, setStep] = useState(0);
  const [stabilityScores, setStabilityScores] = useState<Record<string, number>>({});
  const [performanceScores, setPerformanceScores] = useState<Record<string, number>>({});
  const [alignmentScores, setAlignmentScores] = useState<Record<string, number>>({});
  const [orientationScore, setOrientationScore] = useState(0);
  const [reflections, setReflections] = useState<ReflectionAnswers>({});
  const [saved, setSaved] = useState(false);

  // Signals from the first assessment are reused so the pressure profile and
  // classification can be recomputed from the fresh scored answers.
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
      priorSignals.healthFlags
    );
  }, [step, stabilityScores, performanceScores, alignmentScores, orientationScore, priorSignals]);

  // Persist the reassessment once we reach the comparison step.
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
  }, [step, secondResults, saved, saveReassessment, stabilityScores, performanceScores, alignmentScores, orientationScore, reflections]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  // Guard: reassessment is for subscribers who already have a first assessment.
  if (!profile?.results || !profile.subscribed) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <CrisisBar />
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="max-w-md text-center space-y-4">
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
  const scoredStepIndex = step; // 1..4 map to scored screens

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <CrisisBar />
      <main className="flex flex-1 flex-col">
        {/* Progress bar for scored section */}
        {scoredStepIndex >= 1 && scoredStepIndex <= TOTAL_SCORED_STEPS && (
          <div className="px-4 pt-4">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span className="font-medium uppercase tracking-wide">90-Day Reassessment</span>
                <span>Section {scoredStepIndex} of {TOTAL_SCORED_STEPS}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
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
            <div className="max-w-lg w-full text-center space-y-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
                <CalendarClock className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight tracking-tight">
                  Your 90-day reassessment, {firstName}
                </h1>
                <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                  It's been about 90 days since your first assessment. You'll answer the same 16
                  scored questions, then 4 optional reflections. At the end you'll see exactly how
                  your scores have changed.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 text-left text-sm text-muted-foreground space-y-1.5">
                <p className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" /> 16 scored questions across
                  Stability, Performance & Alignment
                </p>
                <p className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" /> 4 optional progress
                  reflections (not scored)
                </p>
                <p className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" /> A side-by-side comparison of
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
          <OnboardingStability onNext={(s) => { setStabilityScores(s); setStep(2); }} />
        )}
        {step === 2 && (
          <OnboardingPerformance onNext={(s) => { setPerformanceScores(s); setStep(3); }} />
        )}
        {step === 3 && (
          <OnboardingAlignment onNext={(s) => { setAlignmentScores(s); setStep(4); }} />
        )}
        {step === 4 && (
          <OnboardingOrientation onNext={(s) => { setOrientationScore(s); setStep(5); }} />
        )}
        {step === 5 && (
          <ReassessmentReflections
            firstName={firstName}
            onNext={(answers) => { setReflections(answers); setStep(6); }}
          />
        )}

        {step === 6 && secondResults && (
          <div className="flex flex-1 items-start justify-center px-4 py-10 overflow-y-auto">
            <div className="max-w-2xl w-full space-y-8 pb-12">
              <div className="space-y-2 text-center">
                <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
                  90-Day Reassessment · Complete
                </p>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight tracking-tight">
                  Here's how far you've come, {firstName}
                </h1>
              </div>

              <ResultsComparison
                firstName={firstName}
                first={profile.results}
                second={secondResults}
                reflections={reflections}
              />

              <div className="text-center pt-2">
                <Button variant="cta" size="lg" onClick={() => navigate("/dashboard")} className="group">
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
};

export default Reassessment;
