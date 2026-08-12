import {
  ADMIN_SUB_TAB,
  ADMIN_SUB_TAB_LABELS,
  type AdminSubTabSlug,
} from "@/lib/settings/admin/adminTabStore";

/** Primary nav — mirrors Lovable admin sidebar order. */
export const ADMIN_PRIMARY_NAV = [
  ADMIN_SUB_TAB.OVERVIEW,
  ADMIN_SUB_TAB.USERS,
  ADMIN_SUB_TAB.PATHS,
  ADMIN_SUB_TAB.WORKPLACES,
] as const satisfies readonly AdminSubTabSlug[];

/** Extra ops sections kept beyond Lovable — shown under “More”. */
export const ADMIN_MORE_NAV = [
  ADMIN_SUB_TAB.ANALYTICS,
  ADMIN_SUB_TAB.RESOURCES,
  ADMIN_SUB_TAB.INSIGHTS,
  ADMIN_SUB_TAB.PLANS,
  ADMIN_SUB_TAB.OUTREACH,
  ADMIN_SUB_TAB.COACH_BOOKINGS,
  ADMIN_SUB_TAB.REASSESSMENTS,
  ADMIN_SUB_TAB.PROMPT_TESTS,
] as const satisfies readonly AdminSubTabSlug[];

export const ADMIN_NAV_PATH: Record<AdminSubTabSlug, string> = {
  overview: "/admin",
  users: "/admin/users",
  paths: "/admin/paths",
  workplaces: "/admin/organizations",
  analytics: "/admin/analytics",
  resources: "/admin/resources",
  insights: "/admin/insights",
  plans: "/admin/plans",
  outreach: "/admin/outreach",
  coach_bookings: "/admin/coach-bookings",
  reassessments: "/admin/reassessments",
  prompt_tests: "/admin/prompt-tests",
};

export function adminNavLabel(tab: AdminSubTabSlug): string {
  if (tab === ADMIN_SUB_TAB.WORKPLACES) return "Organizations";
  return ADMIN_SUB_TAB_LABELS[tab];
}

export function resolveAdminSubTab(pathname: string): AdminSubTabSlug {
  if (pathname.startsWith("/admin/users")) return ADMIN_SUB_TAB.USERS;
  if (pathname.startsWith("/admin/paths")) return ADMIN_SUB_TAB.PATHS;
  if (
    pathname.startsWith("/admin/organizations") ||
    pathname.startsWith("/admin/workplaces")
  ) {
    return ADMIN_SUB_TAB.WORKPLACES;
  }
  if (pathname.startsWith("/admin/analytics")) return ADMIN_SUB_TAB.ANALYTICS;
  if (pathname.startsWith("/admin/resources")) return ADMIN_SUB_TAB.RESOURCES;
  if (pathname.startsWith("/admin/insights")) return ADMIN_SUB_TAB.INSIGHTS;
  if (pathname.startsWith("/admin/plans")) return ADMIN_SUB_TAB.PLANS;
  if (pathname.startsWith("/admin/outreach")) return ADMIN_SUB_TAB.OUTREACH;
  if (pathname.startsWith("/admin/coach-bookings")) return ADMIN_SUB_TAB.COACH_BOOKINGS;
  if (pathname.startsWith("/admin/reassessments")) return ADMIN_SUB_TAB.REASSESSMENTS;
  if (pathname.startsWith("/admin/prompt-tests")) return ADMIN_SUB_TAB.PROMPT_TESTS;
  return ADMIN_SUB_TAB.OVERVIEW;
}
