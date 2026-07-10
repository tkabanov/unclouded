export const ADMIN_SUB_TAB = {
  PATHS: "paths",
  RESOURCES: "resources",
  PLANS: "plans",
  WORKPLACES: "workplaces",
  ANALYTICS: "analytics",
} as const;

export type AdminSubTabSlug = (typeof ADMIN_SUB_TAB)[keyof typeof ADMIN_SUB_TAB];

export const ADMIN_SUB_TAB_ORDER: readonly AdminSubTabSlug[] = [
  ADMIN_SUB_TAB.PATHS,
  ADMIN_SUB_TAB.RESOURCES,
  ADMIN_SUB_TAB.PLANS,
  ADMIN_SUB_TAB.WORKPLACES,
  ADMIN_SUB_TAB.ANALYTICS,
];

export const ADMIN_SUB_TAB_LABELS: Record<AdminSubTabSlug, string> = {
  paths: "Paths",
  resources: "Resources",
  plans: "Plans",
  workplaces: "Workplaces",
  analytics: "Analytics",
};
