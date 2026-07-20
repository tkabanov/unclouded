import type { WeeklyTrendPoint } from "@/lib/employer/employerMetricsHelpers";

export type EmployerMetricSnapshot = {
  cohortSize: number;
  suppressed: boolean;
  averagePulse: number | null;
  pulseByWeek: WeeklyTrendPoint[];
  sessionsPerActiveUserByWeek: WeeklyTrendPoint[];
  pathEngagementPercent: number | null;
  activeUsersPercent: number | null;
  sessionsPerUser: number | null;
};
