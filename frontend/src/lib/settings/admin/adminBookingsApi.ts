import { callRpc } from "@/lib/supabase/rpc";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";
import type { KotaReadBrief } from "../../../../../supabase/functions/_shared/kotaReadBrief.ts";

export type AdminBookingDisplayStatus =
  | "scheduled"
  | "completed"
  | "canceled"
  | "waitlisted";

export type AdminBookingCreditStatus =
  | "held"
  | "charged"
  | "refunded"
  | "no_refund"
  | "none"
  | "not_applicable";

export type AdminBookingRow = {
  rowKind: "oneOnOne" | "group";
  id: string;
  userId: string;
  memberFirstName: string | null;
  memberEmail: string | null;
  startsAt: string | null;
  durationMinutes: number | null;
  status: string | null;
  displayStatus: AdminBookingDisplayStatus | string;
  specialistId: string | null;
  specialistName: string | null;
  assignedCoachEmail: string | null;
  meetLink: string | null;
  creditsRequired: number | null;
  creditStatus: AdminBookingCreditStatus | string;
  notes: string | null;
  sessionTitle: string | null;
  sessionId: string | null;
  registeredCount: number | null;
  capacity: number | null;
  claimExpiresAt: string | null;
  kotaRead: string | null;
  kotaReadJson: KotaReadBrief | Record<string, unknown> | null;
  kotaReadEmailedAt: string | null;
  kotaReadEmailDetail: string | null;
  postSessionToken: string | null;
  postSessionSubmittedAt: string | null;
  postSessionFormStatus: "pending" | "submitted" | "n/a" | string;
  completedAt: string | null;
  createdAt: string;
  cancelledAt: string | null;
};

export type AdminBookingsListFilters = {
  from?: string | null;
  to?: string | null;
  userQuery?: string | null;
  specialistId?: string | null;
  sessionType?: "oneOnOne" | "group" | "";
  status?: AdminBookingDisplayStatus | "";
  limit?: number;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mapRow(raw: Record<string, unknown>): AdminBookingRow | null {
  const id = asString(raw.id);
  const userId = asString(raw.userId);
  const rowKind = raw.rowKind === "group" ? "group" : raw.rowKind === "oneOnOne" ? "oneOnOne" : null;
  if (!id || !userId || !rowKind) return null;

  const kotaReadJson =
    raw.kotaReadJson && typeof raw.kotaReadJson === "object"
      ? (raw.kotaReadJson as KotaReadBrief | Record<string, unknown>)
      : null;

  return {
    rowKind,
    id,
    userId,
    memberFirstName: asString(raw.memberFirstName),
    memberEmail: asString(raw.memberEmail),
    startsAt: asString(raw.startsAt),
    durationMinutes: asNumber(raw.durationMinutes),
    status: asString(raw.status),
    displayStatus: asString(raw.displayStatus) ?? "scheduled",
    specialistId: asString(raw.specialistId),
    specialistName: asString(raw.specialistName),
    assignedCoachEmail: asString(raw.assignedCoachEmail),
    meetLink: asString(raw.meetLink),
    creditsRequired: asNumber(raw.creditsRequired),
    creditStatus: asString(raw.creditStatus) ?? "none",
    notes: asString(raw.notes),
    sessionTitle: asString(raw.sessionTitle),
    sessionId: asString(raw.sessionId),
    registeredCount: asNumber(raw.registeredCount),
    capacity: asNumber(raw.capacity),
    claimExpiresAt: asString(raw.claimExpiresAt),
    kotaRead: asString(raw.kotaRead),
    kotaReadJson,
    kotaReadEmailedAt: asString(raw.kotaReadEmailedAt),
    kotaReadEmailDetail: asString(raw.kotaReadEmailDetail),
    postSessionToken: asString(raw.postSessionToken),
    postSessionSubmittedAt: asString(raw.postSessionSubmittedAt),
    postSessionFormStatus: asString(raw.postSessionFormStatus) ?? "n/a",
    completedAt: asString(raw.completedAt),
    createdAt: asString(raw.createdAt) ?? new Date(0).toISOString(),
    cancelledAt: asString(raw.cancelledAt),
  };
}

export async function listAdminCoachingBookings(
  filters: AdminBookingsListFilters = {},
): Promise<AdminBookingRow[]> {
  const { data, error } = await callRpc("admin_list_coaching_bookings", {
    p_from: filters.from || null,
    p_to: filters.to || null,
    p_user_query: filters.userQuery?.trim() || null,
    p_specialist_id: filters.specialistId || null,
    p_session_type: filters.sessionType || null,
    p_status: filters.status || null,
    p_limit: filters.limit ?? 100,
  });

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }
  if (!data || typeof data !== "object") return [];
  const payload = data as Record<string, unknown>;
  if (payload.ok !== true) {
    throw new Error(
      (typeof payload.error === "string" && payload.error) || "Couldn't load bookings.",
    );
  }
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  return rows
    .map((row) =>
      row && typeof row === "object" ? mapRow(row as Record<string, unknown>) : null,
    )
    .filter((row): row is AdminBookingRow => row != null);
}

export function formatAdminDisplayStatus(status: string | null | undefined): string {
  switch (status) {
    case "scheduled":
      return "Scheduled";
    case "completed":
      return "Completed";
    case "canceled":
    case "cancelled":
      return "Canceled";
    case "waitlisted":
      return "Waitlisted";
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : "—";
  }
}

export function formatAdminPostSessionFormStatus(
  status: string | null | undefined,
): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "submitted":
      return "Submitted";
    case "n/a":
      return "N/A";
    default:
      return status ?? "—";
  }
}

export function formatAdminCreditStatus(status: string | null | undefined): string {
  switch (status) {
    case "held":
      return "Held";
    case "charged":
      return "Charged";
    case "refunded":
      return "Refunded";
    case "no_refund":
      return "No refund";
    case "not_applicable":
      return "N/A";
    case "none":
      return "—";
    default:
      return status ?? "—";
  }
}
