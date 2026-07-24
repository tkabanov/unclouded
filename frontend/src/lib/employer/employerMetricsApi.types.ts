import type { WeeklyTrendPoint } from "@/lib/employer/employerMetricsHelpers";

export type ClassificationDistributionRow = {
  key: string;
  label: string;
  percent: number;
  count: number;
  suppressed: boolean;
};

export type EmployerAssessmentBaseline = {
  stabilityBands: {
    high: number;
    moderate: number;
    low: number;
  } | null;
  avgStability: number | null;
  avgPerformance: number | null;
  avgAlignment: number | null;
  classificationDistribution: ClassificationDistributionRow[];
  hasSuppressedClassificationCells: boolean;
};

export const EMPTY_EMPLOYER_ASSESSMENT_BASELINE: EmployerAssessmentBaseline = {
  stabilityBands: null,
  avgStability: null,
  avgPerformance: null,
  avgAlignment: null,
  classificationDistribution: [],
  hasSuppressedClassificationCells: false,
};

export type EmployerMetricSnapshot = {
  cohortSize: number;
  suppressed: boolean;
  averagePulse: number | null;
  pulseByWeek: WeeklyTrendPoint[];
  sessionsPerActiveUserByWeek: WeeklyTrendPoint[];
  pathEngagementPercent: number | null;
  activeUsersPercent: number | null;
  sessionsPerUser: number | null;
  assessmentBaseline: EmployerAssessmentBaseline;
};
