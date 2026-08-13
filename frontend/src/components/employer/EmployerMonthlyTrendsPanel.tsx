import EmployerTrendSparkline from "@/components/employer/EmployerTrendSparkline";
import { EMPLOYER_MIN_COHORT_SIZE, type EmployerMetricSnapshot } from "@/lib/employer/employerMetricsApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

type EmployerMonthlyTrendsPanelProps = {
  metrics: EmployerMetricSnapshot | null;
  loading?: boolean;
  className?: string;
};

function formatScore(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(1);
}

export default function EmployerMonthlyTrendsPanel({
  metrics,
  loading = false,
  className,
}: EmployerMonthlyTrendsPanelProps) {
  if (loading) {
    return (
      <div className={cn(bubbleStyle("Group_card_muted_"), "p-4 text-sm text-muted-foreground", className)}>
        Loading monthly trends…
      </div>
    );
  }

  if (!metrics) return null;

  const engagementPoints = (metrics.monthlyActiveTrend ?? []).map((row) => ({
    weekStart: `${row.month}-01`,
    value: row.suppressed || row.activePercent == null ? null : row.activePercent,
  }));

  const scoreRows = metrics.monthlyScoreTrend ?? [];
  const stabilityPoints = scoreRows.map((row) => ({
    weekStart: `${row.month}-01`,
    value: row.suppressed || row.avgStability == null ? null : row.avgStability,
  }));
  const performancePoints = scoreRows.map((row) => ({
    weekStart: `${row.month}-01`,
    value: row.suppressed || row.avgPerformance == null ? null : row.avgPerformance,
  }));
  const alignmentPoints = scoreRows.map((row) => ({
    weekStart: `${row.month}-01`,
    value: row.suppressed || row.avgAlignment == null ? null : row.avgAlignment,
  }));

  const scoreValues = scoreRows.flatMap((row) =>
    row.suppressed
      ? []
      : [row.avgStability, row.avgPerformance, row.avgAlignment].filter(
          (v): v is number => v != null && Number.isFinite(v),
        ),
  );
  const scoreMin = scoreValues.length > 0 ? Math.min(0, ...scoreValues) : 0;
  const scoreMax = scoreValues.length > 0 ? Math.max(100, ...scoreValues) : 100;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-3 p-4")}>
        <header className="space-y-1">
          <h3 className={bubbleStyle("Text_heading_3_")}>Workforce outcome scores</h3>
          <p className="text-xs text-muted-foreground">
            Cohort average Stability / Performance / Alignment by UTC month. Each month uses each
            employee&apos;s latest assessment on or before month end (carry-forward). Aggregates
            only — not individual performance management.
          </p>
        </header>

        {metrics.suppressed || scoreRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {metrics.suppressed
              ? `Cohort ${metrics.cohortSize} — trends hidden until ≥ ${EMPLOYER_MIN_COHORT_SIZE} enrolled.`
              : "Not enough assessment history yet for a monthly score trend."}
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">Stability</p>
                <EmployerTrendSparkline
                  points={stabilityPoints}
                  minValue={scoreMin}
                  maxValue={scoreMax}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">Performance</p>
                <EmployerTrendSparkline
                  points={performancePoints}
                  minValue={scoreMin}
                  maxValue={scoreMax}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">Alignment</p>
                <EmployerTrendSparkline
                  points={alignmentPoints}
                  minValue={scoreMin}
                  maxValue={scoreMax}
                />
              </div>
            </div>
            <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
              {scoreRows.map((row) => (
                <li key={row.month} className="tabular-nums">
                  {row.month}:{" "}
                  {row.suppressed
                    ? "suppressed"
                    : `S ${formatScore(row.avgStability)} · P ${formatScore(row.avgPerformance)} · A ${formatScore(row.avgAlignment)}`}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-3 p-4")}>
        <header className="space-y-1">
          <h3 className={bubbleStyle("Text_heading_3_")}>Monthly active trend</h3>
          <p className="text-xs text-muted-foreground">
            % of enrolled employees with ≥1 qualifying engagement event per UTC calendar month.
            No per-user points. Months below cohort threshold are suppressed.
          </p>
        </header>

        {metrics.suppressed || engagementPoints.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {metrics.suppressed
              ? `Cohort ${metrics.cohortSize} — trends hidden until ≥ ${EMPLOYER_MIN_COHORT_SIZE} enrolled.`
              : "Not enough history yet for a monthly trend."}
          </p>
        ) : (
          <>
            <EmployerTrendSparkline points={engagementPoints} minValue={0} maxValue={100} />
            <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
              {(metrics.monthlyActiveTrend ?? []).map((row) => (
                <li key={row.month} className="tabular-nums">
                  {row.month}:{" "}
                  {row.suppressed || row.activeCount == null
                    ? "suppressed"
                    : `${row.activeCount} (${row.activePercent ?? 0}%)`}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
