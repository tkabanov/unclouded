import {
  STABILITY_BAND_LABELS,
  type StabilityBand,
} from "@/lib/employer/managerAggregateHelpers";
import {
  EMPTY_EMPLOYER_ASSESSMENT_BASELINE,
  type EmployerMetricSnapshot,
} from "@/lib/employer/employerMetricsApi.types";
import { EMPLOYER_MIN_COHORT_SIZE } from "@/lib/employer/employerMetricsApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

const STABILITY_BAND_ORDER: StabilityBand[] = ["high", "moderate", "low"];

type EmployerAssessmentBaselinePanelProps = {
  metrics: EmployerMetricSnapshot | null;
  loading?: boolean;
  className?: string;
};

export default function EmployerAssessmentBaselinePanel({
  metrics,
  loading = false,
  className,
}: EmployerAssessmentBaselinePanelProps) {
  if (loading) {
    return (
      <div className={cn(bubbleStyle("Group_card_muted_"), "p-4 text-sm text-muted-foreground", className)}>
        Loading assessment baseline…
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const baseline = metrics.assessmentBaseline ?? EMPTY_EMPLOYER_ASSESSMENT_BASELINE;

  return (
    <div className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-4 p-4", className)}>
      <header className="space-y-1">
        <h3 className={bubbleStyle("Text_heading_3_")}>Assessment baseline</h3>
        <p className="text-xs text-muted-foreground">
          Workforce assessment snapshot from onboarding and reassessments — aggregated only, never
          individual identities.
        </p>
      </header>

      {metrics.suppressed ? (
        <p className="text-sm text-muted-foreground">
          Cohort {metrics.cohortSize} — baseline hidden until ≥ {EMPLOYER_MIN_COHORT_SIZE} enrolled
          employees.
        </p>
      ) : (
        <>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Avg stability</dt>
              <dd className="font-medium text-foreground">{baseline.avgStability ?? "n/a"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Avg performance</dt>
              <dd className="font-medium text-foreground">{baseline.avgPerformance ?? "n/a"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Avg alignment</dt>
              <dd className="font-medium text-foreground">{baseline.avgAlignment ?? "n/a"}</dd>
            </div>
          </dl>

          {baseline.stabilityBands ? (
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Stability bands</p>
              <div className="grid grid-cols-3 gap-2">
                {STABILITY_BAND_ORDER.map((band) => (
                  <div
                    key={band}
                    className="rounded-md border border-border bg-background/60 px-3 py-2 text-center"
                  >
                    <p className="text-xs text-muted-foreground">{STABILITY_BAND_LABELS[band]}</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {baseline.stabilityBands?.[band] ?? 0}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {baseline.classificationDistribution.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Classification distribution</p>
              <ul className="space-y-2">
                {baseline.classificationDistribution.map((row) => (
                  <li key={row.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-foreground">{row.label}</span>
                    {row.suppressed ? (
                      <span className="text-xs text-muted-foreground">Hidden (small cell)</span>
                    ) : (
                      <span className="font-medium tabular-nums">{row.percent}%</span>
                    )}
                  </li>
                ))}
              </ul>
              {baseline.hasSuppressedClassificationCells ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Buckets with fewer than 2 employees are hidden to protect individual privacy.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Classification distribution unavailable until cohort members complete assessment.
            </p>
          )}
        </>
      )}
    </div>
  );
}
