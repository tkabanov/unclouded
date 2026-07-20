import type { DailyTrendPoint, StabilityBandPercentages } from "@/lib/employer/managerAggregateHelpers";

export type ManagerAggregateSnapshot = {
  directReportCount: number;
  cohortSize: number;
  optedInCount: number;
  suppressed: boolean;
  legalReviewRequired: true;
  teamPulseTrend30d: DailyTrendPoint[];
  averagePulse30d: number | null;
  stabilityBandPercentages: StabilityBandPercentages | null;
  averageSessionEngagement: number | null;
};
