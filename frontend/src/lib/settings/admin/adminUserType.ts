import { TIER, type TierSlug } from "@/lib/enums/tier";
import { normalizeStatus, normalizeTier } from "@/lib/subscription/subscriptionState";

/** Admin user table Type column (Admin Account Set-Up.md). */
export type AdminUserTypeSlug = "free" | "pro" | "premium" | "canceled";

export type AdminUserTypeInput = {
  accountType?: string | null;
  enterpriseTier?: string | null;
  tier?: string | null;
  subscribed?: boolean | null;
  subscriptionStatus?: string | null;
  subscriptionPlanTier?: string | null;
};

/**
 * Maps profile + subscription snapshot to admin list Type.
 * Enterprise uses contract tier; canceled = inactive subscription; else effective paid/free.
 */
export function resolveAdminUserType(input: AdminUserTypeInput): AdminUserTypeSlug {
  if ((input.accountType ?? "").toLowerCase() === "enterprise") {
    const et = (input.enterpriseTier ?? "").toLowerCase();
    if (et === TIER.PREMIUM) return "premium";
    return "pro";
  }

  const status = normalizeStatus(input.subscriptionStatus);
  if (status === "inactive") return "canceled";

  const planTier =
    normalizeTier(input.subscriptionPlanTier) ??
    normalizeTier(input.tier) ??
    TIER.FREE;

  if (
    status === "active" ||
    status === "scheduledToCancel" ||
    status === "scheduledToDowngrade" ||
    status === "pastDue"
  ) {
    if (planTier === TIER.PREMIUM) return "premium";
    if (planTier === TIER.PRO) return "pro";
  }

  if (input.subscribed === true) {
    const t = normalizeTier(input.tier);
    if (t === TIER.PREMIUM) return "premium";
    return "pro";
  }

  return "free";
}

export function adminUserTypeLabel(type: AdminUserTypeSlug): string {
  switch (type) {
    case "free":
      return "Free";
    case "pro":
      return "Pro";
    case "premium":
      return "Premium";
    case "canceled":
      return "Canceled";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export type AdminUserListItem = {
  userId: string;
  name: string;
  email: string | null;
  type: AdminUserTypeSlug;
  dateJoined: string | null;
  status: "Active" | "Deactivated";
  isActive: boolean;
  /** Present when listing org-scoped users. */
  enterpriseTier?: string | null;
  enrollmentDate?: string | null;
  workplaceRoles?: string[];
};

export type AdminUserPathEnrollment = {
  enrollmentId: string;
  pathId: string | null;
  pathName: string;
  tier: string | null;
  status: string | null;
  createdAt: string | null;
  completedSessionsCount: number;
  currentSessionId: string | null;
};

export type AdminUserSessionLog = {
  id: string;
  kind: "one_on_one" | "group";
  status: string | null;
  scheduledAt: string | null;
  createdAt: string | null;
};

export type AdminUserDetail = {
  userId: string;
  name: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  type: AdminUserTypeSlug;
  dateJoined: string | null;
  status: "Active" | "Deactivated";
  isActive: boolean;
  deactivatedAt: string | null;
  accountType: string;
  /** Customer coaching / profile role label (Lovable “Role type”). */
  customerRoleType?: string | null;
  /** profiles.primaryPillar (Lovable “Primary pillar”). */
  primaryPillar?: string | null;
  enterpriseTier: string | null;
  enrollmentDate: string | null;
  workplaceId: string | null;
  timezone: string | null;
  aboutYou: Record<string, unknown> | null;
  subscription: {
    planTier: string | null;
    status: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean | null;
  } | null;
  paths: AdminUserPathEnrollment[];
  bookings: { oneOnOne: number; group: number };
  sessionLogs?: {
    oneOnOne: AdminUserSessionLog[];
    group: AdminUserSessionLog[];
  };
  creditsBalance: number;
  creditLedger: Array<{
    id: string;
    delta: number;
    reason: string;
    note: string | null;
    createdAt: string;
    coachBookingId: string | null;
    stripeInvoiceId: string | null;
  }>;
  assessments: Array<{
    id: string;
    isInitial: boolean;
    assessmentDate: string;
    classification: string | null;
    trajectoryType: string | null;
    stabilityScore: number | null;
    performanceScore: number | null;
    alignmentScore: number | null;
  }>;
  fingerprintStatus: { present: boolean; summary: string | null };
  crisisTriggered: boolean;
  griefModeActive: boolean;
  recoveryModeActive: boolean;
  activity: {
    lastJournalAt: string | null;
    lastChatSessionAt: string | null;
    lastCoachBookingAt: string | null;
    journaling: boolean;
    chatting: boolean;
    sessions: boolean;
  };
};

export function isPaidTierSlug(value: string | null | undefined): value is TierSlug {
  return value === TIER.PRO || value === TIER.PREMIUM;
}
