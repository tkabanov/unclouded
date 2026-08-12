import { supabase } from "@/integrations/supabase/client";
import {
  ADMIN_MODULE_ANALYTICS_SELECT_COLUMNS,
  aggregateClassificationDistribution,
  countTierUsers,
  type AdminAnalyticsProfileRow,
} from "@/lib/settings/admin/adminAnalyticsApi";
import { fetchAdminPaths } from "@/lib/settings/admin/adminPathsApi";
import {
  fetchAdminWorkplaceActiveSeats,
  fetchAdminWorkplaces,
} from "@/lib/settings/admin/adminWorkplacesApi";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

export type CrisisRange = "day" | "week" | "month";

export type AdminOverviewSnapshot = {
  totalUsers: number;
  dau: number;
  mau: number;
  stickinessPercent: number;
  medianSessions30d: number;
  pathCompletionPercent: number;
  pathStarted: number;
  pathCompleted: number;
  enterpriseSeatsPurchased: number;
  enterpriseSeatsUsed: number;
  enterpriseContractsActive: number;
  subscriptionDistribution: Array<{ name: string; value: number }>;
  classificationDistribution: Array<{ label: string; count: number }>;
  crisisSeries: Array<{ label: string; count: number }>;
  crisisTotal: number;
  assessmentTrends: {
    reassessedMembers: number;
    stabilityDelta: number | null;
    performanceDelta: number | null;
    alignmentDelta: number | null;
  };
  publishedPaths: number;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

function startOfDay(d: Date): Date {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatMmDd(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

function formatHour(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:00`;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[mid - 1]! + sorted[mid]!) / 2) * 10) / 10;
  }
  return sorted[mid]!;
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

async function fetchSessionRows(
  cutoffIso: string,
): Promise<Array<{ userId: string; finalizedAt: string; hadCrisisEscalation: boolean }>> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("coachingSessionArchive")
    .select("userId, finalizedAt, hadCrisisEscalation")
    .gte("finalizedAt", cutoffIso);

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      userId: String(r.userId ?? ""),
      finalizedAt: String(r.finalizedAt ?? ""),
      hadCrisisEscalation: r.hadCrisisEscalation === true,
    };
  }).filter((row) => row.userId && row.finalizedAt);
}

async function fetchPathEnrollmentCounts(): Promise<{ started: number; completed: number }> {
  const client = supabase as unknown as UntypedSupabase;
  const [allRes, completedRes] = await Promise.all([
    client.from("pathEnrollment").select("id", { count: "exact", head: true }),
    client
      .from("pathEnrollment")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed"),
  ]);

  if (allRes.error) {
    if (isSchemaUnavailable(allRes.error)) return { started: 0, completed: 0 };
    throw allRes.error;
  }
  if (completedRes.error) {
    if (isSchemaUnavailable(completedRes.error)) return { started: 0, completed: 0 };
    throw completedRes.error;
  }

  return {
    started: allRes.count ?? 0,
    completed: completedRes.count ?? 0,
  };
}

function buildCrisisSeries(
  sessions: Array<{ finalizedAt: string; hadCrisisEscalation: boolean }>,
  range: CrisisRange,
): Array<{ label: string; count: number }> {
  const now = new Date();

  if (range === "day") {
    const buckets: Array<{ label: string; count: number; start: Date }> = [];
    for (let i = 23; i >= 0; i -= 1) {
      const start = new Date(now);
      start.setMinutes(0, 0, 0);
      start.setHours(start.getHours() - i);
      buckets.push({ label: formatHour(start), count: 0, start });
    }
    for (const session of sessions) {
      if (!session.hadCrisisEscalation) continue;
      const at = new Date(session.finalizedAt);
      if (Number.isNaN(at.getTime())) continue;
      const idx = buckets.findIndex((b, i) => {
        const next = buckets[i + 1]?.start ?? new Date(b.start.getTime() + 60 * 60 * 1000);
        return at >= b.start && at < next;
      });
      if (idx >= 0) buckets[idx]!.count += 1;
    }
    return buckets.map(({ label, count }) => ({ label, count }));
  }

  const dayCount = range === "week" ? 7 : 30;
  const buckets: Array<{ label: string; count: number; day: string }> = [];
  for (let i = dayCount - 1; i >= 0; i -= 1) {
    const day = startOfDay(new Date(now));
    day.setDate(day.getDate() - i);
    buckets.push({
      label: formatMmDd(day),
      count: 0,
      day: day.toISOString().slice(0, 10),
    });
  }

  for (const session of sessions) {
    if (!session.hadCrisisEscalation) continue;
    const at = new Date(session.finalizedAt);
    if (Number.isNaN(at.getTime())) continue;
    const key = startOfDay(at).toISOString().slice(0, 10);
    const bucket = buckets.find((b) => b.day === key);
    if (bucket) bucket.count += 1;
  }

  return buckets.map(({ label, count }) => ({ label, count }));
}

async function fetchAssessmentTrends(): Promise<AdminOverviewSnapshot["assessmentTrends"]> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("assessmentResult")
    .select(
      "userId, isInitial, assessmentDate, stabilityScore, performanceScore, alignmentScore",
    )
    .order("assessmentDate", { ascending: true });

  if (error) {
    if (isSchemaUnavailable(error)) {
      return {
        reassessedMembers: 0,
        stabilityDelta: null,
        performanceDelta: null,
        alignmentDelta: null,
      };
    }
    throw error;
  }

  const byUser = new Map<
    string,
    {
      initial: {
        stabilityScore: number | null;
        performanceScore: number | null;
        alignmentScore: number | null;
      } | null;
      latestReassessment: {
        stabilityScore: number | null;
        performanceScore: number | null;
        alignmentScore: number | null;
      } | null;
    }
  >();

  for (const raw of data ?? []) {
    const row = raw as Record<string, unknown>;
    const userId = typeof row.userId === "string" ? row.userId : null;
    if (!userId) continue;
    const entry = byUser.get(userId) ?? { initial: null, latestReassessment: null };
    const scores = {
      stabilityScore: typeof row.stabilityScore === "number" ? row.stabilityScore : null,
      performanceScore: typeof row.performanceScore === "number" ? row.performanceScore : null,
      alignmentScore: typeof row.alignmentScore === "number" ? row.alignmentScore : null,
    };
    if (row.isInitial === true) {
      if (!entry.initial) entry.initial = scores;
    } else {
      entry.latestReassessment = scores;
    }
    byUser.set(userId, entry);
  }

  let reassessedMembers = 0;
  let stabilitySum = 0;
  let performanceSum = 0;
  let alignmentSum = 0;
  let stabilityN = 0;
  let performanceN = 0;
  let alignmentN = 0;

  for (const entry of byUser.values()) {
    if (!entry.initial || !entry.latestReassessment) continue;
    reassessedMembers += 1;
    if (entry.initial.stabilityScore != null && entry.latestReassessment.stabilityScore != null) {
      stabilitySum += entry.latestReassessment.stabilityScore - entry.initial.stabilityScore;
      stabilityN += 1;
    }
    if (
      entry.initial.performanceScore != null &&
      entry.latestReassessment.performanceScore != null
    ) {
      performanceSum +=
        entry.latestReassessment.performanceScore - entry.initial.performanceScore;
      performanceN += 1;
    }
    if (entry.initial.alignmentScore != null && entry.latestReassessment.alignmentScore != null) {
      alignmentSum += entry.latestReassessment.alignmentScore - entry.initial.alignmentScore;
      alignmentN += 1;
    }
  }

  const avg = (sum: number, n: number) =>
    n > 0 ? Math.round((sum / n) * 100) / 100 : null;

  return {
    reassessedMembers,
    stabilityDelta: avg(stabilitySum, stabilityN),
    performanceDelta: avg(performanceSum, performanceN),
    alignmentDelta: avg(alignmentSum, alignmentN),
  };
}

function buildSubscriptionDistribution(
  profiles: AdminAnalyticsProfileRow[],
): Array<{ name: string; value: number }> {
  let enterprise = 0;
  const nonEnterprise: AdminAnalyticsProfileRow[] = [];

  for (const profile of profiles) {
    if ((profile.accountType ?? "").toLowerCase() === "enterprise") {
      enterprise += 1;
    } else {
      nonEnterprise.push(profile);
    }
  }

  const pro = countTierUsers(nonEnterprise, "pro");
  const premium = countTierUsers(nonEnterprise, "premium");
  const free = Math.max(0, nonEnterprise.length - pro - premium);

  return [
    { name: "Free", value: free },
    { name: "Pro", value: pro },
    { name: "Premium", value: premium },
    { name: "Enterprise", value: enterprise },
  ].filter((row) => row.value > 0);
}

export async function fetchAdminOverview(
  userId: string,
  crisisRange: CrisisRange = "week",
): Promise<AdminOverviewSnapshot> {
  const lookbackDays = crisisRange === "month" ? 30 : crisisRange === "week" ? 7 : 1;
  const sessionCutoff = daysAgoIso(Math.max(30, lookbackDays));

  const [profilesResult, sessions, pathCounts, workplaces, paths, assessmentTrends] =
    await Promise.all([
      supabase.from("profiles").select(ADMIN_MODULE_ANALYTICS_SELECT_COLUMNS),
      fetchSessionRows(sessionCutoff),
      fetchPathEnrollmentCounts(),
      fetchAdminWorkplaces(userId),
      fetchAdminPaths(userId),
      fetchAssessmentTrends(),
    ]);

  if (profilesResult.error) throw profilesResult.error;
  const profiles = (profilesResult.data ?? []) as AdminAnalyticsProfileRow[];
  const totalUsers = profiles.length;

  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const dauUsers = new Set<string>();
  const mauUsers = new Set<string>();
  const sessionsByUser30d = new Map<string, number>();

  for (const session of sessions) {
    const at = new Date(session.finalizedAt).getTime();
    if (Number.isNaN(at)) continue;
    const age = now - at;
    if (age <= 30 * oneDayMs) {
      mauUsers.add(session.userId);
      sessionsByUser30d.set(
        session.userId,
        (sessionsByUser30d.get(session.userId) ?? 0) + 1,
      );
    }
    if (age <= oneDayMs) dauUsers.add(session.userId);
  }

  const dau = dauUsers.size;
  const mau = mauUsers.size;
  const stickinessPercent = mau > 0 ? Math.round((dau / mau) * 100) : 0;
  const medianSessions30d = median([...sessionsByUser30d.values()]);

  const pathStarted = pathCounts.started;
  const pathCompleted = pathCounts.completed;
  const pathCompletionPercent =
    pathStarted > 0 ? Math.round((pathCompleted / pathStarted) * 100) : 0;

  const activeWorkplaces = workplaces.workplaces.filter((w) => w.isActive);
  const enterpriseSeatsPurchased = activeWorkplaces.reduce((sum, w) => sum + w.seatCount, 0);
  const seatCounts = await Promise.all(
    activeWorkplaces.map((w) => fetchAdminWorkplaceActiveSeats(w.id).catch(() => 0)),
  );
  const enterpriseSeatsUsed = seatCounts.reduce((sum, n) => sum + n, 0);

  const crisisLookbackSessions = sessions.filter((s) => {
    const at = new Date(s.finalizedAt).getTime();
    if (Number.isNaN(at)) return false;
    return now - at <= lookbackDays * oneDayMs + (crisisRange === "day" ? oneDayMs : 0);
  });
  const crisisSeries = buildCrisisSeries(
    crisisRange === "day" ? sessions : crisisLookbackSessions,
    crisisRange,
  );
  const crisisTotal = crisisSeries.reduce((sum, row) => sum + row.count, 0);

  return {
    totalUsers,
    dau,
    mau,
    stickinessPercent,
    medianSessions30d,
    pathCompletionPercent,
    pathStarted,
    pathCompleted,
    enterpriseSeatsPurchased,
    enterpriseSeatsUsed,
    enterpriseContractsActive: activeWorkplaces.length,
    subscriptionDistribution: buildSubscriptionDistribution(profiles),
    classificationDistribution: aggregateClassificationDistribution(profiles),
    crisisSeries,
    crisisTotal,
    assessmentTrends,
    publishedPaths: paths.filter((p) => p.isActive).length,
  };
}

export function formatDelta(value: number | null): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}
