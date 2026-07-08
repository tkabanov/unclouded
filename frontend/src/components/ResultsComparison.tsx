import { ArrowRight, ArrowUpRight, ArrowDownRight, Minus, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ResultsData } from "@/lib/classification";
import {
  computeScoreDeltas,
  summarizeProgress,
  reflectionQuestions,
  type ReflectionAnswers,
} from "@/lib/reassessment";

interface ResultsComparisonProps {
  firstName: string;
  first: ResultsData;
  second: ResultsData;
  reflections?: ReflectionAnswers | null;
  compact?: boolean;
}

function scoreColor(score: number) {
  return score < 3.2 ? "bg-destructive" : score < 3.8 ? "bg-amber-500" : "bg-emerald-500";
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta >= 0.2) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
        <ArrowUpRight className="h-3.5 w-3.5" /> +{delta.toFixed(1)}
      </span>
    );
  }
  if (delta <= -0.2) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-destructive">
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
}: {
  label: string;
  first: number;
  second: number;
  delta: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <DeltaBadge delta={delta} />
      </div>
      {/* First (baseline) */}
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-[11px] text-muted-foreground">Day 0</span>
        <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-muted-foreground/40"
            style={{ width: `${(first / 5) * 100}%` }}
          />
        </div>
        <span className="w-8 shrink-0 text-right font-mono text-xs text-muted-foreground">
          {first.toFixed(1)}
        </span>
      </div>
      {/* Second (now) */}
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-[11px] font-medium text-foreground">Day 90</span>
        <div className="h-2.5 flex-1 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-700", scoreColor(second))}
            style={{ width: `${(second / 5) * 100}%` }}
          />
        </div>
        <span className="w-8 shrink-0 text-right font-mono text-xs font-semibold text-foreground">
          {second.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

const ResultsComparison = ({
  firstName,
  first,
  second,
  reflections,
  compact,
}: ResultsComparisonProps) => {
  const deltas = computeScoreDeltas(first, second);
  const summary = summarizeProgress(first, second, firstName);
  const answeredReflections = reflectionQuestions.filter(
    (q) => (reflections?.[q.field] ?? "").trim().length > 0
  );

  return (
    <div className="space-y-6">
      {!compact && (
        <div className="rounded-xl bg-primary/10 border border-primary/20 p-5 flex items-start gap-3">
          <TrendingUp className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <p className="text-foreground text-base leading-relaxed">{summary.headline}</p>
        </div>
      )}

      {/* Summary chips */}
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
              ? "bg-emerald-600 hover:bg-emerald-600 text-white"
              : summary.overallDelta <= -0.2
              ? "bg-destructive hover:bg-destructive text-destructive-foreground"
              : "bg-muted text-foreground hover:bg-muted"
          )}
        >
          Overall {summary.overallDelta > 0 ? "+" : ""}
          {summary.overallDelta.toFixed(1)}
        </Badge>
      </div>

      {/* Score comparison bars */}
      <div className="space-y-5 rounded-xl border border-border bg-card p-5">
        {deltas.map((d) => (
          <CompareBar
            key={d.key}
            label={d.label}
            first={d.first}
            second={d.second}
            delta={d.delta}
          />
        ))}
      </div>

      {/* Classification change */}
      <div className="rounded-xl border border-border p-4 space-y-2">
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

      {/* Reflections */}
      {answeredReflections.length > 0 && (
        <div className="rounded-xl border border-border p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your progress reflections
          </p>
          <div className="space-y-3">
            {answeredReflections.map((q) => (
              <div key={q.field} className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">{q.question}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {reflections?.[q.field]}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsComparison;
