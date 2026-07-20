import { supabase } from "@/integrations/supabase/client";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

export const ADMIN_COACH_BOOKINGS_NOTICE =
  "Block 3.35 — Kota's Read briefs generated when Premium members book a human coach. Review here and confirm email delivery to the PuP coach inbox." as const;

export const ADMIN_COACH_BOOKINGS_EMPTY =
  "No coach bookings yet. Briefs appear after a member uses Book a coach on the dashboard." as const;

export type AdminCoachBookingRow = {
  id: string;
  userId: string;
  scheduledAt: string | null;
  status: string | null;
  kotaRead: string | null;
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
  kotaReadEmailedAt: string | null;
  kotaReadEmailDetail: string | null;
  createdAt: string;
};

type MemberProfileRow = {
  id: string;
  firstName: string | null;
  email: string | null;
};

export function formatCoachBookingDeliveryStatus(row: AdminCoachBookingRow): string {
  if (!row.kotaRead?.trim()) return "Generating…";
  if (row.kotaReadEmailedAt) {
    const detail = row.kotaReadEmailDetail?.trim();
    if (detail?.startsWith("sent:")) return "Emailed to coach inbox";
    if (detail?.includes("smtp:skipped")) return "Brief ready — email not configured";
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
      "id, userId, scheduledAt, status, kotaRead, kotaReadEmailedAt, kotaReadEmailDetail, createdAt",
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
    return {
      ...row,
      memberFirstName: profile?.firstName ?? null,
      memberEmail: profile?.email ?? null,
    };
  });
}
