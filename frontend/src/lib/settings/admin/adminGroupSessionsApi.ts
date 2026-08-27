import { supabase } from "@/integrations/supabase/client";
import { callRpc } from "@/lib/supabase/rpc";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

export type AdminGroupSessionRow = {
  id: string;
  seriesId: string | null;
  title: string;
  description: string;
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  status: string;
  meetLink: string | null;
  googleEventId: string | null;
  cancelledAt: string | null;
  createdAt: string;
  registeredCount: number;
  waitlistCount: number;
};

export type AdminGroupEnrollmentRow = {
  id: string;
  userId: string;
  status: string;
  periodMonth: string;
  waitlistedAt: string | null;
  registeredAt: string | null;
  claimExpiresAt: string | null;
  memberFirstName: string | null;
  memberEmail: string | null;
};

export async function listAdminGroupSessions(): Promise<AdminGroupSessionRow[]> {
  const { data, error } = await supabase
    .from("groupCoachingSession")
    .select(
      "id, seriesId, title, description, startsAt, durationMinutes, capacity, status, meetLink, googleEventId, cancelledAt, createdAt",
    )
    .order("startsAt", { ascending: false })
    .limit(100);

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }

  const rows = (data ?? []) as Omit<AdminGroupSessionRow, "registeredCount" | "waitlistCount">[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { data: enrollments } = await supabase
    .from("groupSessionEnrollment")
    .select("sessionId, status")
    .in("sessionId", ids);

  const registered = new Map<string, number>();
  const waitlist = new Map<string, number>();
  for (const e of enrollments ?? []) {
    const sid = (e as { sessionId?: string }).sessionId;
    const status = (e as { status?: string }).status;
    if (!sid || !status) continue;
    if (status === "registered") registered.set(sid, (registered.get(sid) ?? 0) + 1);
    if (status === "waitlisted" || status === "offered") {
      waitlist.set(sid, (waitlist.get(sid) ?? 0) + 1);
    }
  }

  return rows.map((row) => ({
    ...row,
    registeredCount: registered.get(row.id) ?? 0,
    waitlistCount: waitlist.get(row.id) ?? 0,
  }));
}

export async function listAdminGroupEnrollments(
  sessionId: string,
): Promise<AdminGroupEnrollmentRow[]> {
  const { data, error } = await supabase
    .from("groupSessionEnrollment")
    .select(
      "id, userId, status, periodMonth, waitlistedAt, registeredAt, claimExpiresAt",
    )
    .eq("sessionId", sessionId)
    .order("createdAt", { ascending: true });

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }

  const rows = (data ?? []) as Omit<
    AdminGroupEnrollmentRow,
    "memberFirstName" | "memberEmail"
  >[];
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => r.userId))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, firstName, email")
    .in("id", userIds);

  const byId = new Map(
    ((profiles ?? []) as { id: string; firstName: string | null; email: string | null }[]).map(
      (p) => [p.id, p],
    ),
  );

  return rows.map((row) => {
    const profile = byId.get(row.userId);
    return {
      ...row,
      memberFirstName: profile?.firstName ?? null,
      memberEmail: profile?.email ?? null,
    };
  });
}

export async function adminCreateGroupSessions(params: {
  title: string;
  description: string;
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  recurrenceWeeks: number;
}): Promise<{
  sessionIds: string[];
  meetFinalize: "ok" | "failed" | "skipped";
  meetDetail?: string;
}> {
  const { data, error } = await callRpc("admin_create_group_coaching_sessions", {
    p_title: params.title,
    p_description: params.description,
    p_starts_at: params.startsAt,
    p_duration_minutes: params.durationMinutes,
    p_capacity: params.capacity,
    p_recurrence_weeks: params.recurrenceWeeks,
  });

  if (error || !data || typeof data !== "object") {
    throw new Error("Couldn't create group sessions.");
  }
  const row = data as Record<string, unknown>;
  if (row.ok !== true) {
    throw new Error(
      (typeof row.error === "string" && row.error) || "Couldn't create group sessions.",
    );
  }

  const sessionIds = Array.isArray(row.sessionIds)
    ? (row.sessionIds as unknown[]).filter((id): id is string => typeof id === "string")
    : [];

  if (sessionIds.length > 0) {
    const { data: finalizeData, error: finalizeError } = await supabase.functions.invoke(
      "finalize-group-sessions",
      { body: { sessionIds } },
    );
    if (finalizeError) {
      return {
        sessionIds,
        meetFinalize: "failed" as const,
        meetDetail: finalizeError.message || "Meet/Calendar finalize failed.",
      };
    }
    const detail =
      finalizeData && typeof finalizeData === "object"
        ? JSON.stringify(finalizeData).slice(0, 200)
        : undefined;
    return { sessionIds, meetFinalize: "ok" as const, meetDetail: detail };
  }

  return { sessionIds, meetFinalize: "skipped" as const };
}

export async function adminCancelGroupSession(sessionId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("cancel-group-coaching-session", {
    body: { sessionId },
  });

  if (error) {
    throw new Error(error.message || "Couldn't cancel session.");
  }

  const row = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  if (!row || row.ok !== true) {
    throw new Error(
      (row && typeof row.error === "string" && row.error) || "Couldn't cancel session.",
    );
  }
}
