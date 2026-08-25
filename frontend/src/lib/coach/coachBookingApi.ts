/**
 * Coach session booking.
 *
 * Both booking types are created by SECURITY DEFINER RPCs, never by a direct
 * insert: the 1:1 RPC is the only thing that reserves the Premium credits, and
 * the group RPC is the only thing that enforces one session per calendar month.
 *
 * Internal 1:1 bookings use `confirm_one_on_one_booking` (slot + specialist assign).
 * Legacy `request_one_on_one_booking` + Wix redirect remains for older flows/tests.
 */
import { supabase } from "@/integrations/supabase/client";
import { BOOKING_REDIRECT_ERROR } from "@/lib/subscription/subscriptionCopy";
import { callRpc } from "@/lib/supabase/rpc";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";
import {
  DEFAULT_SLOT_DURATION_MINUTES,
  listBookableOneOnOneSlots,
  type BookableOneOnOneSlot,
} from "@/lib/settings/admin/adminSpecialistAvailabilityApi";

export { listBookableOneOnOneSlots, type BookableOneOnOneSlot };

const KOTA_READ_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-kota-read`;
const FINALIZE_BOOKING_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/finalize-coach-booking`;
const CANCEL_BOOKING_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-coach-booking`;

export type CoachBookingRow = {
  id: string;
  userId: string;
  scheduledAt: string | null;
  status: string | null;
  kotaRead: string | null;
  createdAt: string;
  meetLink?: string | null;
  durationMinutes?: number | null;
  coachSessionNotes?: string | null;
};

export type OneOnOneBookingResult =
  | {
      status: "ok";
      bookingId: string;
      balance: number;
      scheduledAt?: string;
      durationMinutes?: number;
      kotaRead: string | null;
    }
  | { status: "blocked"; code: string; message: string; balance?: number };

function readString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function readNumber(row: Record<string, unknown>, key: string): number | undefined {
  const value = row[key];
  return typeof value === "number" ? value : undefined;
}

/** Opens the external calendar; false when blocked or when open throws. */
export function buildCoachBookingUrl(baseUrl: string, bookingId: string): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) return trimmed;
  try {
    const url = new URL(trimmed);
    url.searchParams.set("bookingId", bookingId);
    url.searchParams.set("unclouded_booking_id", bookingId);
    return url.toString();
  } catch {
    const separator = trimmed.includes("?") ? "&" : "?";
    return `${trimmed}${separator}bookingId=${encodeURIComponent(bookingId)}&unclouded_booking_id=${encodeURIComponent(bookingId)}`;
  }
}

/**
 * Opens the external calendar; false when blocked or when open throws.
 * Do not pass noopener/noreferrer as window features — those force a null
 * return even when the tab opened, which falsely aborts the booking hold.
 * Clear opener on the returned window for the same isolation as noopener.
 */
export function openExternalBookingUrl(url: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const opened = window.open(url, "_blank");
    if (!opened) return false;
    opened.opener = null;
    return true;
  } catch {
    return false;
  }
}

async function authHeaders(): Promise<Record<string, string> | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return null;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

/** Kota's Read is a nice-to-have: a booking stands even if generation fails. */
async function generateKotaRead(
  bookingId: string,
  bookingTable: "coachBooking" | "groupSessionBooking" = "coachBooking",
): Promise<string | null> {
  const headers = await authHeaders();
  if (!headers) return null;

  try {
    const response = await fetch(KOTA_READ_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({ bookingId, bookingTable }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { kotaRead?: string; kotaReadJson?: unknown };
    return typeof payload.kotaRead === "string" && payload.kotaRead.trim()
      ? payload.kotaRead.trim()
      : null;
  } catch {
    return null;
  }
}

/** Meet + confirmation emails — best-effort after internal confirm. */
export async function finalizeCoachBooking(bookingId: string): Promise<void> {
  const headers = await authHeaders();
  if (!headers) return;
  try {
    await fetch(FINALIZE_BOOKING_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({ bookingId }),
    });
  } catch {
    // Booking is already confirmed; Meet/email can be retried later.
  }
}

export type CancelOneOnOneBookingResult =
  | {
      status: "ok";
      bookingId: string;
      refunded: boolean;
      refundedAmount?: number;
      balance?: number;
    }
  | { status: "blocked"; code: string; message: string };

/** Cancel a confirmed upcoming 1:1; refunds credits when 24+ hours before session. */
export async function cancelOneOnOneBooking(
  bookingId: string,
): Promise<CancelOneOnOneBookingResult> {
  const headers = await authHeaders();
  if (!headers) {
    return {
      status: "blocked",
      code: "unauthorized",
      message: "Please sign in again to cancel.",
    };
  }

  try {
    const response = await fetch(CANCEL_BOOKING_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({ bookingId }),
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok || payload.ok !== true) {
      return {
        status: "blocked",
        code:
          (typeof payload.code === "string" && payload.code) ||
          (typeof payload.error === "string" && payload.error) ||
          "cancel_failed",
        message:
          (typeof payload.error === "string" && payload.error) ||
          "Could not cancel this session. Please try again.",
      };
    }

    return {
      status: "ok",
      bookingId:
        (typeof payload.bookingId === "string" && payload.bookingId) || bookingId,
      refunded: payload.refunded === true,
      refundedAmount:
        typeof payload.refundedAmount === "number" ? payload.refundedAmount : undefined,
      balance: typeof payload.balance === "number" ? payload.balance : undefined,
    };
  } catch {
    return {
      status: "blocked",
      code: "request_failed",
      message: "Could not cancel this session. Please try again.",
    };
  }
}

async function abortOneOnOneBookingRedirect(
  bookingId: string,
): Promise<{ released: boolean; balance?: number }> {
  const { data, error } = await callRpc("abort_my_one_on_one_booking_redirect", {
    p_booking_id: bookingId,
  });

  if (error || !data || typeof data !== "object") {
    return { released: false };
  }

  const row = data as Record<string, unknown>;
  if (row.ok !== true) {
    return { released: false, balance: readNumber(row, "balance") };
  }

  return {
    released: true,
    balance: readNumber(row, "balance"),
  };
}

/**
 * Confirm an internal 1:1 session for an anonymized slot (no Wix redirect).
 */
export async function confirmOneOnOneBooking(params: {
  slotStart: string;
  durationMinutes?: number;
}): Promise<OneOnOneBookingResult> {
  const { data, error } = await callRpc("confirm_one_on_one_booking", {
    p_slot_start: params.slotStart,
    p_duration_minutes: params.durationMinutes ?? DEFAULT_SLOT_DURATION_MINUTES,
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

  void finalizeCoachBooking(bookingId);
  const kotaRead = await generateKotaRead(bookingId);

  return {
    status: "ok",
    bookingId,
    balance: readNumber(row, "balance") ?? 0,
    scheduledAt: readString(row, "scheduledAt") ?? params.slotStart,
    durationMinutes: readNumber(row, "durationMinutes") ?? params.durationMinutes,
    kotaRead,
  };
}

/**
 * Request a 30-minute 1:1 session (legacy Wix path). Prefer confirmOneOnOneBooking.
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

  const calendarUrl = params?.externalCalendarUrl?.trim();
  if (calendarUrl && typeof window !== "undefined") {
    const redirectUrl = buildCoachBookingUrl(calendarUrl, bookingId);
    const opened = openExternalBookingUrl(redirectUrl);
    if (!opened) {
      const abort = await abortOneOnOneBookingRedirect(bookingId);
      if (!abort.released) {
        return {
          status: "blocked",
          code: "abort_failed",
          message:
            "We couldn't open session booking and couldn't release your credits automatically. Please contact support or try again later.",
          balance: abort.balance,
        };
      }
      return {
        status: "blocked",
        code: "redirect_failed",
        message: BOOKING_REDIRECT_ERROR,
        balance: abort.balance,
      };
    }
  }

  const kotaRead = await generateKotaRead(bookingId);

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

  void generateKotaRead(bookingId, "groupSessionBooking");

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

export function formatCoachBookingStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "confirmed":
      return "Scheduled";
    case "pending":
      return "Pending";
    case "cancelled":
      return "Canceled";
    case "completed":
      return "Completed";
    default:
      return status?.trim() || "Unknown";
  }
}

export async function fetchMyCoachBookings(limit = 20): Promise<CoachBookingRow[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("coachBooking")
    .select("id, userId, scheduledAt, status, kotaRead, createdAt, meetLink, durationMinutes, coachSessionNotes")
    .eq("userId", user.id)
    .order("scheduledAt", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    if (isSchemaUnavailable(error)) {
      const fallback = await supabase
        .from("coachBooking")
        .select("id, userId, scheduledAt, status, kotaRead, createdAt")
        .eq("userId", user.id)
        .order("createdAt", { ascending: false })
        .limit(limit);
      if (fallback.error) throw fallback.error;
      return (fallback.data as CoachBookingRow[] | null) ?? [];
    }
    throw error;
  }

  return (data as CoachBookingRow[] | null) ?? [];
}

export async function fetchLatestCoachBooking(): Promise<CoachBookingRow | null> {
  const rows = await fetchMyCoachBookings(1);
  return rows[0] ?? null;
}
