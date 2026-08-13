import EmployerTrendSparkline from "@/components/employer/EmployerTrendSparkline";
import { EMPLOYER_MIN_COHORT_SIZE, type EmployerMetricSnapshot } from "@/lib/employer/employerMetricsApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

type EmployerMonthlyTrendsPanelProps = {
  metrics: EmployerMetricSnapshot | null;
  loading?: boolean;
  className?: string;
};

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

  const points = (metrics.monthlyActiveTrend ?? []).map((row) => ({
    weekStart: `${row.month}-01`,
    value: row.suppressed || row.activePercent == null ? null : row.activePercent,
  }));

  return (
    <div className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-3 p-4", className)}>
      <header className="space-y-1">
        <h3 className={bubbleStyle("Text_heading_3_")}>Monthly active trend</h3>
        <p className="text-xs text-muted-foreground">
          % of enrolled employees with ≥1 qualifying engagement event per UTC calendar month.
          No per-user points. Months below cohort threshold are suppressed.
        </p>
      </header>

      {metrics.suppressed || points.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {metrics.suppressed
            ? `Cohort ${metrics.cohortSize} — trends hidden until ≥ ${EMPLOYER_MIN_COHORT_SIZE} enrolled.`
            : "Not enough history yet for a monthly trend."}
        </p>
      ) : (
        <>
          <EmployerTrendSparkline points={points} minValue={0} maxValue={100} />
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
  );
}
