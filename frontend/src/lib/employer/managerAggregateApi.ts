import { supabase } from "@/integrations/supabase/client";
import { fetchEmployerMetrics, type EmployerMetricSnapshot } from "@/lib/employer/employerMetricsApi";

const MIN_COHORT_SIZE = 5;

export type ManagerAggregateSnapshot = EmployerMetricSnapshot & {
  optedInCount: number;
  managerOptInRequired: true;
};

/**
 * Team aggregate metrics for managers — requires member opt-in and min cohort of 5.
 */
export async function fetchManagerAggregate(workplaceId: string): Promise<ManagerAggregateSnapshot> {
  const client = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };

  const { data: optedInMembers, error } = await client
    .from("profiles")
    .select("id")
    .eq("workplaceId", workplaceId)
    .eq("managerAggregateOptIn", true);

  if (error) throw error;

  const optedInIds = (optedInMembers ?? [])
    .map((row) => (row as { id?: string }).id)
    .filter((id): id is string => typeof id === "string");

  if (optedInIds.length < MIN_COHORT_SIZE) {
    return {
      cohortSize: optedInIds.length,
      suppressed: true,
      averagePulse: null,
      activeUsersPercent: null,
      sessionsPerUser: null,
      optedInCount: optedInIds.length,
      managerOptInRequired: true,
    };
  }

  const base = await fetchEmployerMetrics(workplaceId);

  return {
    ...base,
    cohortSize: optedInIds.length,
    suppressed: base.suppressed || optedInIds.length < MIN_COHORT_SIZE,
    optedInCount: optedInIds.length,
    managerOptInRequired: true,
  };
}
