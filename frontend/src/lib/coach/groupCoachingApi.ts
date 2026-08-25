import { callRpc } from "@/lib/supabase/rpc";

export type UpcomingGroupSession = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  status: string;
  meetLink: string | null;
  registeredCount: number;
  waitlistCount: number;
  myEnrollmentStatus: string | null;
  myClaimExpiresAt: string | null;
};

export type MyGroupEnrollment = {
  enrollmentId: string;
  status: string;
  periodMonth: string;
  registeredAt: string | null;
  waitlistedAt: string | null;
  claimExpiresAt: string | null;
  cancelledAt: string | null;
  sessionId: string;
  title: string;
  description: string;
  startsAt: string;
  durationMinutes: number;
  meetLink: string | null;
  sessionStatus: string;
};

function asSessions(data: unknown): UpcomingGroupSession[] {
  if (!Array.isArray(data)) return [];
  return data.filter((row): row is UpcomingGroupSession => {
    return Boolean(row && typeof row === "object" && typeof (row as { id?: string }).id === "string");
  });
}

function asEnrollments(data: unknown): MyGroupEnrollment[] {
  if (!Array.isArray(data)) return [];
  return data.filter((row): row is MyGroupEnrollment => {
    return Boolean(
      row &&
        typeof row === "object" &&
        typeof (row as { enrollmentId?: string }).enrollmentId === "string",
    );
  });
}

export async function listUpcomingGroupSessions(): Promise<UpcomingGroupSession[]> {
  const { data, error } = await callRpc("list_upcoming_group_coaching_sessions");
  if (error) return [];
  return asSessions(data);
}

export async function listMyGroupEnrollments(): Promise<MyGroupEnrollment[]> {
  const { data, error } = await callRpc("list_my_group_coaching_enrollments");
  if (error) return [];
  return asEnrollments(data);
}

export type GroupJoinResult =
  | { status: "ok"; enrollmentStatus: string }
  | { status: "blocked"; code: string; message: string };

export async function joinGroupSession(sessionId: string): Promise<GroupJoinResult> {
  const { data, error } = await callRpc("join_group_coaching_session", {
    p_session_id: sessionId,
  });
  if (error || !data || typeof data !== "object") {
    return {
      status: "blocked",
      code: "request_failed",
      message: "Could not join this session. Please try again.",
    };
  }
  const row = data as Record<string, unknown>;
  if (row.ok !== true) {
    return {
      status: "blocked",
      code: (typeof row.code === "string" && row.code) || "request_failed",
      message:
        (typeof row.error === "string" && row.error) ||
        "Could not join this session. Please try again.",
    };
  }
  return {
    status: "ok",
    enrollmentStatus: (typeof row.status === "string" && row.status) || "registered",
  };
}

export async function cancelGroupEnrollment(sessionId: string): Promise<GroupJoinResult> {
  const { data, error } = await callRpc("cancel_group_coaching_enrollment", {
    p_session_id: sessionId,
  });
  if (error || !data || typeof data !== "object") {
    return {
      status: "blocked",
      code: "request_failed",
      message: "Could not cancel. Please try again.",
    };
  }
  const row = data as Record<string, unknown>;
  if (row.ok !== true) {
    return {
      status: "blocked",
      code: (typeof row.code === "string" && row.code) || "request_failed",
      message:
        (typeof row.error === "string" && row.error) || "Could not cancel. Please try again.",
    };
  }
  return { status: "ok", enrollmentStatus: "cancelled" };
}

export async function claimGroupOffer(sessionId: string): Promise<GroupJoinResult> {
  const { data, error } = await callRpc("claim_group_coaching_offer", {
    p_session_id: sessionId,
  });
  if (error || !data || typeof data !== "object") {
    return {
      status: "blocked",
      code: "request_failed",
      message: "Could not claim this spot. Please try again.",
    };
  }
  const row = data as Record<string, unknown>;
  if (row.ok !== true) {
    return {
      status: "blocked",
      code: (typeof row.code === "string" && row.code) || "request_failed",
      message:
        (typeof row.error === "string" && row.error) ||
        "Could not claim this spot. Please try again.",
    };
  }
  return { status: "ok", enrollmentStatus: "registered" };
}

export function seatsLeft(session: UpcomingGroupSession): number {
  return Math.max(0, session.capacity - session.registeredCount);
}

export function formatGroupEnrollmentStatus(status: string | null | undefined): string {
  switch (status) {
    case "registered":
      return "Registered";
    case "waitlisted":
      return "Waitlisted";
    case "offered":
      return "Offer — claim now";
    case "cancelled":
      return "Canceled";
    default:
      return status?.trim() || "—";
  }
}
