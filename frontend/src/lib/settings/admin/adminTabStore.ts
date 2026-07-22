export const ADMIN_SUB_TAB = {
  PATHS: "paths",
  RESOURCES: "resources",
  INSIGHTS: "insights",
  PLANS: "plans",
  WORKPLACES: "workplaces",
  ANALYTICS: "analytics",
  OUTREACH: "outreach",
  COACH_BOOKINGS: "coach_bookings",
  REASSESSMENTS: "reassessments",
  PROMPT_TESTS: "prompt_tests",
} as const;

export type AdminSubTabSlug = (typeof ADMIN_SUB_TAB)[keyof typeof ADMIN_SUB_TAB];

export const ADMIN_SUB_TAB_ORDER: readonly AdminSubTabSlug[] = [
  ADMIN_SUB_TAB.PATHS,
  ADMIN_SUB_TAB.RESOURCES,
  ADMIN_SUB_TAB.INSIGHTS,
  ADMIN_SUB_TAB.PLANS,
  ADMIN_SUB_TAB.WORKPLACES,
  ADMIN_SUB_TAB.ANALYTICS,
  ADMIN_SUB_TAB.OUTREACH,
  ADMIN_SUB_TAB.COACH_BOOKINGS,
  ADMIN_SUB_TAB.REASSESSMENTS,
  ADMIN_SUB_TAB.PROMPT_TESTS,
];

export const ADMIN_SUB_TAB_LABELS: Record<AdminSubTabSlug, string> = {
  paths: "Paths",
  resources: "Resources",
  insights: "Insights",
  plans: "Plans",
  workplaces: "Workplaces",
  analytics: "Analytics",
  outreach: "Outreach",
  coach_bookings: "Coach briefs",
  reassessments: "Reassessments",
  prompt_tests: "Prompt Tests",
};
