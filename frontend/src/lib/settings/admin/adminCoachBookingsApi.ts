import { supabase } from "@/integrations/supabase/client";
import { callRpc } from "@/lib/supabase/rpc";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";
import {
  resolveKotaReadDisplayText,
  type KotaReadBrief,
} from "../../../../../supabase/functions/_shared/kotaReadBrief.ts";

export const ADMIN_COACH_BOOKINGS_NOTICE =
  "Block 3.35 — Kota's Read briefs generated when Pro/Premium members book a human coach. Assign a coach email per booking (or rely on COACH_BRIEF_INBOX fallback) and review delivery here." as const;

export const ADMIN_COACH_BOOKINGS_EMPTY =
  "No coach bookings yet. Briefs appear after a member uses Book a coach on the dashboard." as const;

export type AdminCoachBookingRow = {
  id: string;
  userId: string;
  scheduledAt: string | null;
  status: string | null;
  kotaRead: string | null;
  kotaReadJson: KotaReadBrief | Record<string, unknown> | null;
  assignedCoachEmail: string | null;
  kotaReadEmailedAt: string | null;
  kotaReadEmailDetail: string | null;
  createdAt: string;
  memberFirstName: string | null;
  memberEmail: string | null;
};

type CoachBookingRecord = {
  id: string;
  userId: string;
  scheduledAt: string | null;
  status: string | null;
  kotaRead: string | null;
  kotaReadJson: unknown;
  assignedCoachEmail: string | null;
  kotaReadEmailedAt: string | null;
  kotaReadEmailDetail: string | null;
  createdAt: string;
};

type MemberProfileRow = {
  id: string;
  firstName: string | null;
  email: string | null;
};

export function resolveAdminCoachBriefText(row: {
  kotaReadJson?: unknown;
  kotaRead?: string | null;
}): string {
  return resolveKotaReadDisplayText({
    kotaReadJson: row.kotaReadJson,
    kotaRead: row.kotaRead,
  });
}

export function formatCoachBookingDeliveryStatus(row: AdminCoachBookingRow): string {
  const briefReady = Boolean(resolveAdminCoachBriefText(row));
  if (!briefReady) return "Generating…";
  if (row.kotaReadEmailedAt) {
    const detail = row.kotaReadEmailDetail?.trim() ?? "";
    if (detail.startsWith("sent:assigned:")) return "Emailed to assigned coach";
    if (detail.startsWith("sent:inbox:") || detail.startsWith("sent:")) {
      return "Emailed to coach inbox";
    }
    if (detail.includes("smtp:skipped")) return "Brief ready — email not configured";
    return "Delivery logged";
  }
  if (row.kotaReadEmailDetail?.includes("smtp:skipped")) {
    return "Brief ready — email not configured";
  }
  return "Brief ready — pending delivery";
}

/** Admin queue — requires Settings admin RLS on coachBooking. */
export async function listCoachBookingsForAdmin(): Promise<AdminCoachBookingRow[]> {
  const { data: bookings, error } = await supabase
    .from("coachBooking")
    .select(
      "id, userId, scheduledAt, status, kotaRead, kotaReadJson, assignedCoachEmail, kotaReadEmailedAt, kotaReadEmailDetail, createdAt",
    )
    .order("createdAt", { ascending: false })
    .limit(50);

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }

  const rows = (bookings ?? []) as CoachBookingRecord[];
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((row) => row.userId))];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, firstName, email")
    .in("id", userIds);

  if (profilesError) throw profilesError;

  const profileById = new Map(
    ((profiles ?? []) as MemberProfileRow[]).map((profile) => [profile.id, profile]),
  );

  return rows.map((row) => {
    const profile = profileById.get(row.userId);
    const kotaReadJson =
      row.kotaReadJson && typeof row.kotaReadJson === "object"
        ? (row.kotaReadJson as KotaReadBrief | Record<string, unknown>)
        : null;
    return {
      ...row,
      kotaReadJson,
      assignedCoachEmail:
        typeof row.assignedCoachEmail === "string" ? row.assignedCoachEmail : null,
      memberFirstName: profile?.firstName ?? null,
      memberEmail: profile?.email ?? null,
    };
  });
}

export async function adminSetAssignedCoachEmail(params: {
  bookingId: string;
  assignedCoachEmail: string;
  bookingTable?: "coachBooking" | "groupSessionBooking";
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await callRpc("admin_set_coach_booking_email", {
    p_booking_id: params.bookingId,
    p_assigned_coach_email: params.assignedCoachEmail,
    p_booking_table: params.bookingTable ?? "coachBooking",
  });

  if (error) {
    return { ok: false, message: error.message || "Could not save coach email." };
  }
  return { ok: true };
}
