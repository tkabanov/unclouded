import { useMemo } from "react";
import { ArrowRight, Shield, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { computeResults } from "@/lib/classification";
import {
  computeOnboardingModulePreview,
  type OnboardingModulePreview,
} from "@/lib/modules/moduleScheduler";

interface OnboardingResultsProps {
  firstName: string;
  stabilityScores: Record<string, number>;
  performanceScores: Record<string, number>;
  alignmentScores: Record<string, number>;
  orientationScore: number;
  loadSignals: Record<string, string>;
  stateSignals: Record<string, string>;
  behavioralPatterns: Record<string, string>;
  healthFlags: {
    recovery_mode_active: boolean;
    grief_mode_active: boolean;
    health_flag3?: boolean;
    health_flag4?: boolean;
    health_flag5?: boolean;
    health_flag6?: boolean;
    health_none_of_the_above?: boolean;
    selected_flags: string[];
  };
  modulePreview?: OnboardingModulePreview;
  onComplete: () => void;
}

function ScoreGauge({ label, score }: { label: string; score: number }) {
  const pct = (score / 5) * 100;
  const color =
    score < 3.2
      ? "bg-red-500"
      : score < 3.8
      ? "bg-amber-500"
      : "bg-primary";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground font-mono">{score.toFixed(1)}</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const OnboardingResults = ({
  firstName,
  stabilityScores,
  performanceScores,
  alignmentScores,
  orientationScore,
  loadSignals,
  stateSignals,
  behavioralPatterns,
  healthFlags,
  modulePreview: modulePreviewProp,
  onComplete,
}: OnboardingResultsProps) => {
  const results = useMemo(
    () =>
      computeResults(
        stabilityScores,
        performanceScores,
        alignmentScores,
        orientationScore,
        loadSignals,
        stateSignals,
        behavioralPatterns,
        healthFlags
      ),
    [
      stabilityScores,
      performanceScores,
      alignmentScores,
      orientationScore,
      loadSignals,
      stateSignals,
      behavioralPatterns,
      healthFlags,
    ]
  );

  const modulePreview = useMemo(() => {
    if (modulePreviewProp) return modulePreviewProp;
    const anchorDate = new Date();
    return computeOnboardingModulePreview(
      {
        stabilityScores,
        performanceScores,
        alignmentScores,
        loadSignals,
        stateSignals,
        behavioralPatterns,
        healthFlags,
      },
      anchorDate,
      anchorDate,
    ).preview;
  }, [
    modulePreviewProp,
    stabilityScores,
    performanceScores,
    alignmentScores,
    loadSignals,
    stateSignals,
    behavioralPatterns,
    healthFlags,
  ]);

  const nextSteps = [
    "Your dashboard will be personalized to your profile",
    "AI coaching will adapt to your patterns and preferences",
    "Path recommendations will match your classification",
    "Full reassessment in 90 days to track your growth",
  ];

  return (
    <div className="flex flex-1 items-start justify-center px-4 py-10 overflow-y-auto">
      <div className="max-w-2xl w-full space-y-8 pb-12">
        <div className="space-y-4 text-center">
          <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
            Step 12 of 12
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight tracking-tight">
            Here's what we're seeing, {firstName}.
          </h1>
        </div>

        <div className="space-y-4 bg-card border border-border rounded-xl p-5">
          <ScoreGauge label="Stability" score={results.stability_score} />
          <ScoreGauge label="Performance" score={results.performance_score} />
          <ScoreGauge label="Alignment" score={results.alignment_score} />
        </div>

        {/* Pressure Profile Pill (bTIHk) */}
        <div className="flex justify-center">
          <Badge
            variant="secondary"
            className="text-sm px-4 py-1.5 font-medium"
          >
            {results.pressure_profile}
          </Badge>
        </div>

        {/* Tradeoff Statement (bTIHq) */}
        <div
          className="bg-primary/10 border border-primary/20 rounded-xl p-5"
        >
          <p className="text-foreground text-base md:text-lg leading-relaxed italic">
            "{results.tradeoff_statement}"
          </p>
        </div>

        {/* Recovery / Grief Pills */}
        {(results.recovery_mode_active || results.grief_mode_active) && (
          <div className="flex flex-wrap gap-2 justify-center">
            {results.recovery_mode_active && (
              <Badge
                className="bg-primary hover:bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium gap-1.5"
              >
                <Shield className="h-3.5 w-3.5" />
                Recovery Mode Active
              </Badge>
            )}
            {results.grief_mode_active && (
              <Badge
                className="bg-sky-500 hover:bg-sky-500 text-white px-4 py-1.5 text-sm font-medium gap-1.5"
              >
                <Heart className="h-3.5 w-3.5" />
                Grief-Informed Coaching Active
              </Badge>
            )}
          </div>
        )}

        {/* Classification Card (bTIKI) */}
        <div
          className="bg-card border border-border rounded-xl p-6 space-y-4"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Your Classification
            </p>
            <h2 className="text-2xl font-bold text-foreground">
              {results.classification.name}
            </h2>
          </div>
          <p className="text-muted-foreground text-base leading-relaxed">
            {results.classification.description}
          </p>
          <div className="space-y-2 pt-1">
            <p className="text-sm font-semibold text-foreground">
              Your focus areas:
            </p>
            <ul className="space-y-1.5">
              {results.classification.focusAreas.map((area, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  {area}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground text-center">What happens next</h3>
          <ul className="space-y-2 max-w-md mx-auto">
            {nextSteps.map((step, i) => (
              <li key={step} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        </div>

        {/* Module Preview */}
        <div className="bg-muted/50 border border-border rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Your first deep-dive:{" "}
            <span className="font-semibold text-foreground">
              {modulePreview.displayTitle}
            </span>{" "}
            — available in{" "}
            <span className="font-semibold text-foreground">
              {modulePreview.daysUntilUnlock}{" "}
              {modulePreview.daysUntilUnlock === 1 ? "day" : "days"}
            </span>
          </p>
        </div>

        {/* CTA (bTIQe) */}
        <div className="text-center pt-2">
          <Button
            variant="cta"
            size="lg"
            onClick={onComplete}
            className="group"
          >
            Go to my dashboard
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingResults;
