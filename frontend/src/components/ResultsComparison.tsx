import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, ArrowDownRight, Minus, TrendingUp, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ResultsData } from "@/lib/classification";
import {
  computeScoreDeltas,
  summarizeProgress,
  reflectionQuestions,
  NINETY_DAYS_MS,
  type ReflectionAnswers,
} from "@/lib/reassessment";
import {
  computeTrajectoryType,
  trajectoryLanguage,
} from "@/lib/reassessment/trajectory";
import type { RecommendedPath } from "@/lib/reassessment/recommendPathsAfterReassessment";
import {
  AI_COACHING_MODE_LABELS,
  type AiCoachingModeSlug,
} from "@/lib/enums/coachingMode";
import { TIER, type TierSlug } from "@/lib/enums/tier";

export type PdfDownloadState = "idle" | "generating" | "ready" | "error";

interface ResultsComparisonProps {
  firstName: string;
  first: ResultsData;
  second: ResultsData;
  reflections?: ReflectionAnswers | null;
  compact?: boolean;
  tier?: TierSlug;
  showWhatIsNext?: boolean;
  /** ISO date of the baseline assessment (for label: 90 days ago vs Last assessment). */
  priorAssessmentDate?: string | null;
  modeChanged?: boolean;
  previousMode?: string | null;
  newMode?: string | null;
  recommendedPaths?: RecommendedPath[];
  nextFocusText?: string | null;
  pdfState?: PdfDownloadState;
  onDownloadPdf?: () => void;
  onRetryPdf?: () => void;
}

function scoreColor(score: number) {
  return score < 3.2 ? "bg-destructive" : score < 3.8 ? "bg-amber-500" : "bg-primary";
}

function formatModeLabel(mode: string | null | undefined): string {
  if (!mode) return "updated";
  if (mode in AI_COACHING_MODE_LABELS) {
    const label = AI_COACHING_MODE_LABELS[mode as AiCoachingModeSlug];
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  return mode;
}

function resolvePriorLabel(priorAssessmentDate: string | null | undefined): string {
  if (!priorAssessmentDate) return "90 days ago";
  const priorMs = new Date(priorAssessmentDate).getTime();
  if (Number.isNaN(priorMs)) return "90 days ago";
  const gap = Date.now() - priorMs;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  // Scheduled cycle ≈ 90 days (±7); Premium on-demand uses a different label.
  if (gap >= NINETY_DAYS_MS - sevenDays && gap <= NINETY_DAYS_MS + sevenDays) {
    return "90 days ago";
  }
  return "Last assessment";
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta >= 0.2) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary">
        <ArrowUpRight className="h-3.5 w-3.5" /> +{delta.toFixed(1)}
      </span>
    );
  }
  if (delta <= -0.2) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-600">
        <ArrowDownRight className="h-3.5 w-3.5" /> {delta.toFixed(1)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-muted-foreground">
      <Minus className="h-3.5 w-3.5" /> {delta > 0 ? "+" : ""}
      {delta.toFixed(1)}
    </span>
  );
}

function CompareBar({
  label,
  first,
  second,
  delta,
  priorLabel,
}: {
  label: string;
  first: number;
  second: number;
  delta: number;
  priorLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <DeltaBadge delta={delta} />
      </div>
      <div className="flex items-center gap-2">
        <span className="w-28 shrink-0 text-[11px] text-muted-foreground">{priorLabel}</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-muted-foreground/40"
            style={{ width: `${(first / 5) * 100}%` }}
          />
        </div>
        <span className="w-8 shrink-0 text-right font-mono text-xs text-muted-foreground">
          {first.toFixed(1)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-28 shrink-0 text-[11px] font-medium text-foreground">Today</span>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all duration-700", scoreColor(second))}
            style={{ width: `${(second / 5) * 100}%` }}
          />
        </div>
        <span className="w-8 shrink-0 text-right font-mono text-xs font-semibold text-foreground">
          {second.toFixed(1)}
        </span>
      </div>
      {delta <= -0.2 ? (
        <p className="text-xs text-amber-700 dark:text-amber-500">
          Hard seasons show up in data. This is information, not failure.
        </p>
      ) : null}
      {delta > -0.2 && delta < 0.2 ? (
        <p className="text-xs text-muted-foreground">Holding steady is not nothing.</p>
      ) : null}
    </div>
  );
}

const ResultsComparison = ({
  firstName,
  first,
  second,
  reflections,
  compact,
  tier,
  showWhatIsNext,
  priorAssessmentDate,
  modeChanged,
  previousMode,
  newMode,
  recommendedPaths = [],
  nextFocusText,
  pdfState = "idle",
  onDownloadPdf,
  onRetryPdf,
}: ResultsComparisonProps) => {
  const deltas = computeScoreDeltas(first, second);
  const summary = summarizeProgress(first, second, firstName);
  const trajectory = computeTrajectoryType(first, second);
  const trajectoryCopy = trajectoryLanguage(trajectory);
  const answeredReflections = reflectionQuestions.filter(
    (q) => (reflections?.[q.field] ?? "").trim().length > 0
  );
  const isPremium = tier === TIER.PREMIUM;
  const isPro = tier === TIER.PRO;
  const showPdfButton = isPremium || isPro;
  const priorLabel = resolvePriorLabel(priorAssessmentDate);
  const pdfLabel = isPremium
    ? "Download my PuP 360 report"
    : "Download my PuP 360 summary";
  const pdfBusy = pdfState === "generating" || pdfState === "idle";
  const pdfReady = pdfState === "ready";
  const pdfFailed = pdfState === "error";

  return (
    <div className="space-y-6">
      {!compact && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/10 p-5">
          <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-2">
            <p className="text-base leading-relaxed text-foreground">{summary.headline}</p>
            {trajectoryCopy ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Trajectory · </span>
                {trajectoryCopy}
              </p>
            ) : null}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="text-xs">
          {summary.improved} improved
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {summary.steady} steady
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {summary.declined} declined
        </Badge>
        <Badge
          className={cn(
            "text-xs",
            summary.overallDelta >= 0.2
              ? "bg-primary text-primary-foreground hover:bg-primary"
              : summary.overallDelta <= -0.2
                ? "bg-amber-600 text-white hover:bg-amber-600"
                : "bg-muted text-foreground hover:bg-muted"
          )}
        >
          Overall {summary.overallDelta > 0 ? "+" : ""}
          {summary.overallDelta.toFixed(1)}
        </Badge>
      </div>

      <div className="space-y-5 rounded-xl border border-border bg-card p-5">
        {deltas.map((d) => (
          <CompareBar
            key={d.key}
            label={d.label}
            first={d.first}
            second={d.second}
            delta={d.delta}
            priorLabel={priorLabel}
          />
        ))}
      </div>

      <div className="space-y-2 rounded-xl border border-border p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Classification
        </p>
        {summary.classificationChanged ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground line-through">
              {first.classification.name}
            </span>
            <ArrowRight className="h-4 w-4 text-primary" />
            <span className="font-semibold text-primary">{second.classification.name}</span>
          </div>
        ) : (
          <p className="text-sm text-foreground">
            Still <span className="font-semibold text-primary">{second.classification.name}</span> —
            your core pattern is consistent.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
          <span>Pressure:</span>
          <span>{first.pressure_profile}</span>
          <ArrowRight className="h-3 w-3" />
          <span className="font-medium text-foreground">{second.pressure_profile}</span>
        </div>
      </div>

      {answeredReflections.length > 0 && (
        <div className="space-y-3 rounded-xl border border-border p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your progress reflections
          </p>
          <div className="space-y-3">
            {answeredReflections.map((q) => (
              <div key={q.field} className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">{q.question}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {reflections?.[q.field]}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showWhatIsNext ? (
        <div className="space-y-4 rounded-xl border border-border p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            What is next
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {summary.classificationChanged ? (
              <li>
                Your classification changed — new path recommendations are being surfaced based on{" "}
                <span className="font-medium text-foreground">{second.classification.name}</span>.
              </li>
            ) : (
              <li>Your classification held — continue the work that is already underway.</li>
            )}
            {modeChanged ? (
              <li>
                Your coaching mode updated
                {previousMode || newMode ? (
                  <>
                    {" "}
                    {previousMode ? (
                      <>
                        from{" "}
                        <span className="font-medium text-foreground">
                          {formatModeLabel(previousMode)}
                        </span>{" "}
                        to{" "}
                      </>
                    ) : (
                      " to "
                    )}
                    <span className="font-medium text-foreground">{formatModeLabel(newMode)}</span>
                    .
                  </>
                ) : (
                  "."
                )}
              </li>
            ) : null}
            <li>Your reflection answers are stored for your next coaching session.</li>
            {nextFocusText ? (
              <li>
                Next 90-day focus:{" "}
                <span className="font-medium text-foreground">{nextFocusText}</span>
              </li>
            ) : null}
          </ul>

          {recommendedPaths.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-border/80 bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recommended paths
              </p>
              <ul className="space-y-1 text-sm">
                {recommendedPaths.map((path) => (
                  <li key={path.id}>
                    <Link
                      to="/paths"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {path.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-center">
            <Button variant="cta" size="lg" asChild className="group">
              <Link to="/chat">
                Continue coaching
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            {showPdfButton ? (
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                disabled={pdfBusy && !pdfFailed}
                onClick={() => {
                  if (pdfFailed) {
                    onRetryPdf?.();
                    return;
                  }
                  if (pdfReady) onDownloadPdf?.();
                }}
              >
                <FileText className="h-4 w-4" />
                {pdfFailed
                  ? "Retry PDF"
                  : pdfReady
                    ? pdfLabel
                    : "Preparing PDF…"}
              </Button>
            ) : null}
          </div>
          <div className="text-center">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">Back to my dashboard</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ResultsComparison;
