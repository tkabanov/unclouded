import EmployerTrendSparkline from "@/components/employer/EmployerTrendSparkline";
import { EMPLOYER_MIN_COHORT_SIZE, type EmployerMetricSnapshot } from "@/lib/employer/employerMetricsApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

type EmployerContinuousMetricsPanelProps = {
  workplaceName?: string;
  metrics: EmployerMetricSnapshot | null;
  loading?: boolean;
  className?: string;
};

export default function EmployerContinuousMetricsPanel({
  workplaceName,
  metrics,
  loading = false,
  className,
}: EmployerContinuousMetricsPanelProps) {
  if (loading) {
    return (
      <div className={cn(bubbleStyle("Group_card_muted_"), "p-4 text-sm text-muted-foreground", className)}>
        Loading continuous metrics…
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-4 p-4", className)}>
      <header className="space-y-1">
        <h3 className={bubbleStyle("Text_heading_3_")}>Continuous utilization</h3>
        {workplaceName ? (
          <p className="text-sm text-muted-foreground">{workplaceName}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Anonymized workforce trends — updated from live check-ins, sessions, and paths. Individual
          data is never shown.
        </p>
      </header>

      {metrics.suppressed ? (
        <p className="text-sm text-muted-foreground">
          Cohort {metrics.cohortSize} — metrics hidden until ≥ {EMPLOYER_MIN_COHORT_SIZE} enrolled
          employees.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-sm font-medium text-foreground">Avg check-in pulse by week</p>
              <EmployerTrendSparkline
                points={metrics.pulseByWeek}
                minValue={1}
                maxValue={10}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                30-day avg {metrics.averagePulse ?? "n/a"}
              </p>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-foreground">
                Sessions per active user / week
              </p>
              <EmployerTrendSparkline
                points={metrics.sessionsPerActiveUserByWeek}
                minValue={0}
                maxValue={5}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                30-day enrolled avg {metrics.sessionsPerUser ?? "n/a"}
              </p>
            </div>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Path engagement</dt>
              <dd className="font-medium text-foreground">
                {metrics.pathEngagementPercent ?? "n/a"}%
              </dd>
              <dd className="text-xs text-muted-foreground">
                Enrolled employees with at least one path in progress
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Active in last 30 days</dt>
              <dd className="font-medium text-foreground">
                {metrics.activeUsersPercent ?? "n/a"}%
              </dd>
              <dd className="text-xs text-muted-foreground">
                Enrolled employees with at least one session
              </dd>
            </div>
          </dl>
        </>
      )}
    </div>
  );
}
