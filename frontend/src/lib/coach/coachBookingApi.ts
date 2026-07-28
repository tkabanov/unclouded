/**
 * Coach session booking.
 *
 * Both booking types are created by SECURITY DEFINER RPCs, never by a direct
 * insert: the 1:1 RPC is the only thing that reserves the Premium credits, and
 * the group RPC is the only thing that enforces one session per calendar month.
 */
import { supabase } from "@/integrations/supabase/client";
import { callRpc } from "@/lib/supabase/rpc";

const KOTA_READ_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-kota-read`;

export type CoachBookingRow = {
  id: string;
  userId: string;
  scheduledAt: string | null;
  status: string | null;
  kotaRead: string | null;
  createdAt: string;
};

export type OneOnOneBookingResult =
  | { status: "ok"; bookingId: string; balance: number; kotaRead: string | null }
  | { status: "blocked"; code: string; message: string; balance?: number };

function readString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function readNumber(row: Record<string, unknown>, key: string): number | undefined {
  const value = row[key];
  return typeof value === "number" ? value : undefined;
}

/** Kota's Read is a nice-to-have: a booking stands even if generation fails. */
async function generateKotaRead(bookingId: string): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return null;

  try {
    const response = await fetch(KOTA_READ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ bookingId }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { kotaRead?: string };
    return typeof payload.kotaRead === "string" && payload.kotaRead.trim()
      ? payload.kotaRead.trim()
      : null;
  } catch {
    return null;
  }
}

/**
 * Request a 30-minute 1:1 session. The server re-checks Premium access and the
 * credit balance, so a stale client never spends credits it does not have.
 */
export async function requestOneOnOneBooking(params?: {
  scheduledAt?: string | null;
  externalCalendarUrl?: string | null;
}): Promise<OneOnOneBookingResult> {
  const { data, error } = await callRpc("request_one_on_one_booking", {
    p_scheduled_at: params?.scheduledAt ?? null,
  });

  if (error || !data || typeof data !== "object") {
    return {
      status: "blocked",
      code: "request_failed",
      message: "Could not create your booking. Please try again.",
    };
  }

  const row = data as Record<string, unknown>;
  const bookingId = readString(row, "bookingId");

  if (row.ok !== true || !bookingId) {
    return {
      status: "blocked",
      code: readString(row, "code") ?? "request_failed",
      message: readString(row, "error") ?? "Could not create your booking. Please try again.",
      balance: readNumber(row, "balance"),
    };
  }

  const kotaRead = await generateKotaRead(bookingId);

  if (params?.externalCalendarUrl && typeof window !== "undefined") {
    window.open(params.externalCalendarUrl, "_blank", "noopener,noreferrer");
  }

  return {
    status: "ok",
    bookingId,
    balance: readNumber(row, "balance") ?? 0,
    kotaRead,
  };
}

export type GroupSessionBookingResult =
  | { status: "ok"; bookingId: string; periodMonth: string }
  | { status: "blocked"; code: string; message: string };

export async function requestGroupSessionBooking(): Promise<GroupSessionBookingResult> {
  const { data, error } = await callRpc("request_group_session_booking");

  if (error || !data || typeof data !== "object") {
    return {
      status: "blocked",
      code: "request_failed",
      message: "Could not request your group session. Please try again.",
    };
  }

  const row = data as Record<string, unknown>;
  const bookingId = readString(row, "bookingId");

  if (row.ok !== true || !bookingId) {
    return {
      status: "blocked",
      code: readString(row, "code") ?? "request_failed",
      message:
        readString(row, "error") ?? "Could not request your group session. Please try again.",
    };
  }

  return {
    status: "ok",
    bookingId,
    periodMonth: readString(row, "periodMonth") ?? "",
  };
}

export type GroupSessionStatus = {
  periodMonth: string;
  used: boolean;
};

export async function loadGroupSessionStatus(): Promise<GroupSessionStatus> {
  const { data, error } = await callRpc("get_my_group_session_status");
  if (error || !data || typeof data !== "object") {
    return { periodMonth: "", used: false };
  }
  const row = data as Record<string, unknown>;
  return {
    periodMonth: readString(row, "periodMonth") ?? "",
    used: row.used === true,
  };
}

export async function fetchLatestCoachBooking(): Promise<CoachBookingRow | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("coachBooking")
    .select("id, userId, scheduledAt, status, kotaRead, createdAt")
    .eq("userId", user.id)
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as CoachBookingRow | null) ?? null;
}
