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
  specialistId: string | null;
  meetLink: string | null;
  durationMinutes: number | null;
  kotaReadEmailedAt: string | null;
  kotaReadEmailDetail: string | null;
  createdAt: string;
  coachSessionNotes: string | null;
  postSessionSubmittedAt: string | null;
  completedAt: string | null;
  postSessionToken: string | null;
  memberFirstName: string | null;
  memberEmail: string | null;
  specialistName: string | null;
};

type CoachBookingRecord = {
  id: string;
  userId: string;
  scheduledAt: string | null;
  status: string | null;
  kotaRead: string | null;
  kotaReadJson: unknown;
  assignedCoachEmail: string | null;
  specialistId: string | null;
  meetLink: string | null;
  durationMinutes: number | null;
  kotaReadEmailedAt: string | null;
  kotaReadEmailDetail: string | null;
  createdAt: string;
  coachSessionNotes: string | null;
  postSessionSubmittedAt: string | null;
  completedAt: string | null;
  postSessionToken: string | null;
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
      "id, userId, scheduledAt, status, kotaRead, kotaReadJson, assignedCoachEmail, specialistId, meetLink, durationMinutes, kotaReadEmailedAt, kotaReadEmailDetail, createdAt, coachSessionNotes, postSessionSubmittedAt, completedAt, postSessionToken",
    )
    .order("createdAt", { ascending: false })
    .limit(50);

  if (error) {
    if (isSchemaUnavailable(error)) {
      const legacy = await supabase
        .from("coachBooking")
        .select(
          "id, userId, scheduledAt, status, kotaRead, kotaReadJson, assignedCoachEmail, kotaReadEmailedAt, kotaReadEmailDetail, createdAt",
        )
        .order("createdAt", { ascending: false })
        .limit(50);
      if (legacy.error) {
        if (isSchemaUnavailable(legacy.error)) return [];
        throw legacy.error;
      }
      const legacyRows = (legacy.data ?? []) as CoachBookingRecord[];
      return mapAdminCoachBookings(legacyRows);
    }
    throw error;
  }

  return mapAdminCoachBookings((bookings ?? []) as CoachBookingRecord[]);
}

async function mapAdminCoachBookings(
  rows: CoachBookingRecord[],
): Promise<AdminCoachBookingRow[]> {
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((row) => row.userId))];
  const specialistIds = [
    ...new Set(
      rows
        .map((row) => row.specialistId)
        .filter((id): id is string => typeof id === "string" && Boolean(id)),
    ),
  ];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, firstName, email")
    .in("id", userIds);

  if (profilesError) throw profilesError;

  const profileById = new Map(
    ((profiles ?? []) as MemberProfileRow[]).map((profile) => [profile.id, profile]),
  );

  const specialistNameById = new Map<string, string>();
  if (specialistIds.length > 0) {
    const { data: specialists, error: specialistsError } = await supabase
      .from("specialist")
      .select("id, name")
      .in("id", specialistIds);
    if (!specialistsError && Array.isArray(specialists)) {
      for (const row of specialists as { id?: string; name?: string }[]) {
        if (row.id && row.name) specialistNameById.set(row.id, row.name);
      }
    }
  }

  return rows.map((row) => {
    const profile = profileById.get(row.userId);
    const kotaReadJson =
      row.kotaReadJson && typeof row.kotaReadJson === "object"
        ? (row.kotaReadJson as KotaReadBrief | Record<string, unknown>)
        : null;
    return {
      ...row,
      specialistId: typeof row.specialistId === "string" ? row.specialistId : null,
      meetLink: typeof row.meetLink === "string" ? row.meetLink : null,
      durationMinutes: typeof row.durationMinutes === "number" ? row.durationMinutes : null,
      kotaReadJson,
      assignedCoachEmail:
        typeof row.assignedCoachEmail === "string" ? row.assignedCoachEmail : null,
      memberFirstName: profile?.firstName ?? null,
      memberEmail: profile?.email ?? null,
      specialistName: row.specialistId
        ? specialistNameById.get(row.specialistId) ?? null
        : null,
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

export async function adminReassignCoachBookingSpecialist(params: {
  bookingId: string;
  specialistId: string;
}): Promise<
  | {
      ok: true;
      assignedCoachEmail: string | null;
      previousAssignedCoachEmail: string | null;
      sideEffects?: { ok: boolean; detail?: string };
    }
  | { ok: false; message: string }
> {
  const { data, error } = await callRpc("admin_reassign_coach_booking_specialist", {
    p_booking_id: params.bookingId,
    p_specialist_id: params.specialistId,
  });

  if (error || !data || typeof data !== "object") {
    return { ok: false, message: error?.message || "Could not reassign specialist." };
  }

  const row = data as Record<string, unknown>;
  if (row.ok !== true) {
    return {
      ok: false,
      message:
        (typeof row.error === "string" && row.error) ||
        "Could not reassign specialist.",
    };
  }

  const previousAssignedCoachEmail =
    typeof row.previousAssignedCoachEmail === "string"
      ? row.previousAssignedCoachEmail
      : null;
  const assignedCoachEmail =
    typeof row.assignedCoachEmail === "string" ? row.assignedCoachEmail : null;

  let sideEffects: { ok: boolean; detail?: string } | undefined;
  try {
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke(
      "reassign-coach-booking",
      {
        body: {
          bookingId: params.bookingId,
          previousAssignedCoachEmail,
        },
      },
    );
    if (edgeError) {
      sideEffects = { ok: false, detail: edgeError.message };
    } else {
      sideEffects = {
        ok: true,
        detail:
          edgeData && typeof edgeData === "object"
            ? JSON.stringify(edgeData).slice(0, 240)
            : undefined,
      };
    }
  } catch (err) {
    sideEffects = {
      ok: false,
      detail: err instanceof Error ? err.message : "Side effects failed.",
    };
  }

  return {
    ok: true,
    assignedCoachEmail,
    previousAssignedCoachEmail,
    sideEffects,
  };
}
