export const ADMIN_SUB_TAB = {
  OVERVIEW: "overview",
  USERS: "users",
  PATHS: "paths",
  RESOURCES: "resources",
  INSIGHTS: "insights",
  PLANS: "plans",
  WORKPLACES: "workplaces",
  ANALYTICS: "analytics",
  OUTREACH: "outreach",
  SPECIALISTS: "specialists",
  SCHEDULING: "scheduling",
  BOOKINGS: "bookings",
  /** @deprecated Redirect alias — use BOOKINGS */
  COACH_BOOKINGS: "coach_bookings",
  /** @deprecated Redirect alias — use BOOKINGS */
  GROUP_SESSIONS: "group_sessions",
  REASSESSMENTS: "reassessments",
  PROMPT_TESTS: "prompt_tests",
  REFERRAL_PARTNERS: "referral_partners",
} as const;

export type AdminSubTabSlug = (typeof ADMIN_SUB_TAB)[keyof typeof ADMIN_SUB_TAB];

export const ADMIN_SUB_TAB_ORDER: readonly AdminSubTabSlug[] = [
  ADMIN_SUB_TAB.OVERVIEW,
  ADMIN_SUB_TAB.USERS,
  ADMIN_SUB_TAB.PATHS,
  ADMIN_SUB_TAB.WORKPLACES,
  ADMIN_SUB_TAB.ANALYTICS,
  ADMIN_SUB_TAB.RESOURCES,
  ADMIN_SUB_TAB.INSIGHTS,
  ADMIN_SUB_TAB.PLANS,
  ADMIN_SUB_TAB.OUTREACH,
  ADMIN_SUB_TAB.SPECIALISTS,
  ADMIN_SUB_TAB.SCHEDULING,
  ADMIN_SUB_TAB.BOOKINGS,
  ADMIN_SUB_TAB.REASSESSMENTS,
  ADMIN_SUB_TAB.PROMPT_TESTS,
  ADMIN_SUB_TAB.REFERRAL_PARTNERS,
];

export const ADMIN_SUB_TAB_LABELS: Record<AdminSubTabSlug, string> = {
  overview: "Overview",
  users: "Users",
  paths: "Paths",
  resources: "Resources",
  insights: "Insights",
  plans: "Plans",
  workplaces: "Workplaces",
  analytics: "Analytics",
  outreach: "Outreach",
  specialists: "Specialists",
  scheduling: "Scheduling",
  bookings: "Bookings",
  coach_bookings: "Bookings",
  group_sessions: "Bookings",
  reassessments: "Reassessments",
  prompt_tests: "Prompt Tests",
  referral_partners: "Referral Partners",
};
