import { supabase } from "@/integrations/supabase/client";

import { EMPLOYER_MIN_COHORT_SIZE } from "@/lib/employer/employerMetricsHelpers";
import {
  EMPTY_EMPLOYER_ASSESSMENT_BASELINE,
  type EmployerMetricSnapshot,
} from "@/lib/employer/employerMetricsApi.types";
import { isValidUuid } from "@/lib/uuid/isValidUuid";

export type { EmployerMetricSnapshot } from "@/lib/employer/employerMetricsApi.types";
export { EMPLOYER_MIN_COHORT_SIZE };

type EmployerMetricsResponse = {
  ok?: boolean;
  metrics?: EmployerMetricSnapshot;
  error?: string;
};

/**
 * REQ-10 continuous utilization metrics — server-aggregated via edge fn (HR portal + admin).
 */
export async function fetchEmployerMetrics(workplaceId: string): Promise<EmployerMetricSnapshot> {
  if (!isValidUuid(workplaceId)) {
    throw new Error(
      "This workplace is not linked to the database yet. Recreate it in Admin → Workplaces to load metrics.",
    );
  }

  const { data, error } = await supabase.functions.invoke("employer-metrics", {
    body: { workplaceId },
  });

  if (error) {
    throw error;
  }

  const payload = data as EmployerMetricsResponse | null;
  if (!payload?.metrics) {
    throw new Error(payload?.error ?? "Invalid employer metrics response");
  }

  return {
    ...payload.metrics,
    dau: payload.metrics.dau ?? null,
    dauPercent: payload.metrics.dauPercent ?? null,
    wau: payload.metrics.wau ?? null,
    wauPercent: payload.metrics.wauPercent ?? null,
    mau: payload.metrics.mau ?? null,
    mauPercent: payload.metrics.mauPercent ?? null,
    monthlyActiveTrend: payload.metrics.monthlyActiveTrend ?? [],
    monthlyScoreTrend: payload.metrics.monthlyScoreTrend ?? [],
    assessmentBaseline:
      payload.metrics.assessmentBaseline ?? EMPTY_EMPLOYER_ASSESSMENT_BASELINE,
  };
}
