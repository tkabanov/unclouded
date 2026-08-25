import { supabase } from "@/integrations/supabase/client";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";
import { isPaidReferralProfile } from "@/lib/settings/admin/referralSignUpAnalytics";

export type ReferredUserTierFilter = "all" | "free" | "pro" | "premium";
export type ReferredUserStatusFilter = "all" | "active" | "canceled";

export type PartnerReferredUserRow = {
  userId: string;
  name: string;
  email: string | null;
  registrationDate: string | null;
  referralDate: string | null;
  tier: string;
  subscriptionStatus: string;
  conversionDate: string | null;
  cancellationDate: string | null;
  isPaid: boolean;
  everConverted: boolean;
};

export type PartnerReferralStats = {
  totalReferred: number;
  freeUsers: number;
  proUsers: number;
  premiumUsers: number;
  activeUsers: number;
  canceledUsers: number;
  paidConversions: number;
  currentlyPaid: number;
  conversionRate: number | null;
};

export type ProgramReferralMetrics = {
  totalPartners: number;
  activePartners: number;
  inactivePartners: number;
  totalReferredUsers: number;
  newReferralsInPeriod: number;
  freeUsers: number;
  proUsers: number;
  premiumUsers: number;
  activeUsers: number;
  canceledUsers: number;
};

type ProfileReferralRow = {
  id?: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  createdAt?: string | null;
  referredAt?: string | null;
  referralFirstPaidAt?: string | null;
  tier?: string | null;
  subscribed?: boolean | null;
  isActive?: boolean | null;
  deactivatedAt?: string | null;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

function displayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email: string | null | undefined,
): string {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || email?.trim() || "Unknown";
}

function normalizeTier(tier: string | null | undefined): string {
  const t = (tier ?? "free").trim().toLowerCase();
  if (t === "pro") return "pro";
  if (t === "premium") return "premium";
  return "free";
}

function resolveSubscriptionStatus(profile: ProfileReferralRow): string {
  if (profile.isActive === false) return "canceled";
  if (isPaidReferralProfile(profile)) return "active";
  return "non-active";
}

function toReferredRow(profile: ProfileReferralRow): PartnerReferredUserRow | null {
  if (!profile.id) return null;
  const tier = normalizeTier(profile.tier);
  const isPaid = isPaidReferralProfile(profile);
  const everConverted = Boolean(profile.referralFirstPaidAt) || isPaid;
  return {
    userId: profile.id,
    name: displayName(profile.firstName, profile.lastName, profile.email),
    email: profile.email ?? null,
    registrationDate: profile.createdAt ?? null,
    referralDate: profile.referredAt ?? profile.createdAt ?? null,
    tier,
    subscriptionStatus: resolveSubscriptionStatus(profile),
    conversionDate: profile.referralFirstPaidAt ?? null,
    cancellationDate: profile.deactivatedAt ?? null,
    isPaid,
    everConverted,
  };
}

export function aggregatePartnerStats(rows: PartnerReferredUserRow[]): PartnerReferralStats {
  let freeUsers = 0;
  let proUsers = 0;
  let premiumUsers = 0;
  let activeUsers = 0;
  let canceledUsers = 0;
  let paidConversions = 0;
  let currentlyPaid = 0;

  for (const row of rows) {
    if (row.tier === "pro") proUsers += 1;
    else if (row.tier === "premium") premiumUsers += 1;
    else freeUsers += 1;

    if (row.subscriptionStatus === "active") activeUsers += 1;
    if (
      row.subscriptionStatus === "canceled" ||
      row.subscriptionStatus === "non-active"
    ) {
      canceledUsers += 1;
    }
    if (row.everConverted) paidConversions += 1;
    if (row.isPaid) currentlyPaid += 1;
  }

  const totalReferred = rows.length;
  return {
    totalReferred,
    freeUsers,
    proUsers,
    premiumUsers,
    activeUsers,
    canceledUsers,
    paidConversions,
    currentlyPaid,
    conversionRate: totalReferred > 0 ? paidConversions / totalReferred : null,
  };
}

export function formatPartnerConversionRate(rate: number | null): string {
  if (rate == null) return "—";
  return `${Math.round(rate * 100)}%`;
}

export const PARTNER_CONVERSION_RATE_TOOLTIP =
  "Paid conversions (ever reached a paid plan, via referralFirstPaidAt or current paid tier) ÷ total referred users.";

const PROFILE_SELECT =
  "id, email, firstName, lastName, createdAt, referredAt, referralFirstPaidAt, tier, subscribed, isActive, deactivatedAt";

export async function fetchPartnerReferredUsers(
  partnerId: string,
): Promise<PartnerReferredUserRow[]> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("referralPartnerId", partnerId)
    .order("referredAt", { ascending: false });

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }

  return ((data ?? []) as ProfileReferralRow[])
    .map((p) => toReferredRow(p))
    .filter((row): row is PartnerReferredUserRow => row !== null);
}

export function filterPartnerReferredUsers(
  rows: PartnerReferredUserRow[],
  opts: {
    search?: string;
    tier?: ReferredUserTierFilter;
    status?: ReferredUserStatusFilter;
  },
): PartnerReferredUserRow[] {
  const search = opts.search?.trim().toLowerCase() ?? "";
  const tier = opts.tier ?? "all";
  const status = opts.status ?? "all";

  return rows.filter((row) => {
    if (search) {
      const hay = `${row.name} ${row.email ?? ""}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    if (tier !== "all" && row.tier !== tier) return false;
    if (status === "active" && row.subscriptionStatus !== "active") return false;
    if (
      status === "canceled" &&
      row.subscriptionStatus !== "canceled" &&
      row.subscriptionStatus !== "non-active"
    ) {
      return false;
    }
    return true;
  });
}

export async function fetchPartnerReferralStats(
  partnerId: string,
): Promise<PartnerReferralStats> {
  const rows = await fetchPartnerReferredUsers(partnerId);
  return aggregatePartnerStats(rows);
}

export async function fetchProgramReferralMetrics(opts?: {
  periodStart?: string | null;
  periodEnd?: string | null;
}): Promise<ProgramReferralMetrics> {
  const client = supabase as unknown as UntypedSupabase;

  const [partnersRes, profilesRes] = await Promise.all([
    client.from("referralPartner").select("id, status"),
    client
      .from("profiles")
      .select(PROFILE_SELECT)
      .not("referralPartnerId", "is", null),
  ]);

  if (partnersRes.error && !isSchemaUnavailable(partnersRes.error)) {
    throw partnersRes.error;
  }
  if (profilesRes.error && !isSchemaUnavailable(profilesRes.error)) {
    throw profilesRes.error;
  }

  const partners = (partnersRes.data ?? []) as Array<{ id?: string; status?: string }>;
  const rows = ((profilesRes.data ?? []) as ProfileReferralRow[])
    .map((p) => toReferredRow(p))
    .filter((row): row is PartnerReferredUserRow => row !== null);

  const periodStart = opts?.periodStart ? new Date(opts.periodStart).getTime() : null;
  const periodEnd = opts?.periodEnd ? new Date(opts.periodEnd).getTime() : null;

  let newReferralsInPeriod = 0;
  if (periodStart != null || periodEnd != null) {
    for (const row of rows) {
      const ts = new Date(row.referralDate ?? row.registrationDate ?? "").getTime();
      if (Number.isNaN(ts)) continue;
      if (periodStart != null && ts < periodStart) continue;
      if (periodEnd != null && ts > periodEnd) continue;
      newReferralsInPeriod += 1;
    }
  } else {
    newReferralsInPeriod = rows.length;
  }

  const stats = aggregatePartnerStats(rows);
  const activePartners = partners.filter((p) => p.status === "active").length;
  const inactivePartners = partners.filter((p) => p.status === "inactive").length;

  return {
    totalPartners: partners.length,
    activePartners,
    inactivePartners,
    totalReferredUsers: stats.totalReferred,
    newReferralsInPeriod,
    freeUsers: stats.freeUsers,
    proUsers: stats.proUsers,
    premiumUsers: stats.premiumUsers,
    activeUsers: stats.activeUsers,
    canceledUsers: stats.canceledUsers,
  };
}
