import { supabase } from "@/integrations/supabase/client";
import { callRpc } from "@/lib/supabase/rpc";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";
import {
  fetchAdminSpecialists,
  type AdminSpecialistRecord,
} from "@/lib/settings/admin/adminSpecialistsApi";

export const DEFAULT_SLOT_DURATION_MINUTES = 30;

export interface AdminAvailabilityRecord {
  availabilityId: string;
  specialistId: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
}

export interface AdminSpecialistBookingRecord {
  bookingId: string;
  specialistId: string;
  scheduledAt: string;
  status: string;
  userId: string;
}

export interface BookableOneOnOneSlot {
  slotStart: string;
  slotEnd: string;
  durationMinutes: number;
}

export type AdminAvailabilityFormState = {
  startsAtLocal: string;
  endsAtLocal: string;
  durationMinutes: number;
};

type AvailabilityRow = {
  id?: string;
  specialistId?: string;
  startsAt?: string;
  endsAt?: string;
  durationMinutes?: number | null;
};

type BookingRow = {
  id?: string;
  specialistId?: string | null;
  scheduledAt?: string | null;
  status?: string | null;
  userId?: string;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

function toAvailability(row: AvailabilityRow): AdminAvailabilityRecord | null {
  if (!row.id || !row.specialistId || !row.startsAt || !row.endsAt) return null;
  return {
    availabilityId: row.id,
    specialistId: row.specialistId,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    durationMinutes: row.durationMinutes ?? DEFAULT_SLOT_DURATION_MINUTES,
  };
}

function toBooking(row: BookingRow): AdminSpecialistBookingRecord | null {
  if (!row.id || !row.specialistId || !row.scheduledAt || !row.userId) return null;
  return {
    bookingId: row.id,
    specialistId: row.specialistId,
    scheduledAt: row.scheduledAt,
    status: row.status ?? "pending",
    userId: row.userId,
  };
}

/** Local datetime-local value → ISO timestamptz string. */
export function localInputToIso(localValue: string): string {
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date/time.");
  }
  return date.toISOString();
}

/** ISO → value for `<input type="datetime-local" />` in browser local zone. */
export function isoToLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function emptyAvailabilityForm(
  day: Date = new Date(),
): AdminAvailabilityFormState {
  const start = new Date(day);
  start.setHours(9, 0, 0, 0);
  const end = new Date(day);
  end.setHours(12, 0, 0, 0);
  return {
    startsAtLocal: isoToLocalInput(start.toISOString()),
    endsAtLocal: isoToLocalInput(end.toISOString()),
    durationMinutes: DEFAULT_SLOT_DURATION_MINUTES,
  };
}

export function availabilityToForm(
  row: AdminAvailabilityRecord,
): AdminAvailabilityFormState {
  return {
    startsAtLocal: isoToLocalInput(row.startsAt),
    endsAtLocal: isoToLocalInput(row.endsAt),
    durationMinutes: row.durationMinutes,
  };
}

export async function fetchActiveSpecialistsForScheduling(): Promise<
  AdminSpecialistRecord[]
> {
  return fetchAdminSpecialists("active");
}

export async function fetchSpecialistAvailability(
  specialistId: string,
  rangeFrom: Date,
  rangeTo: Date,
): Promise<AdminAvailabilityRecord[]> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("specialistAvailability")
    .select("id, specialistId, startsAt, endsAt, durationMinutes")
    .eq("specialistId", specialistId)
    .lt("startsAt", rangeTo.toISOString())
    .gt("endsAt", rangeFrom.toISOString())
    .order("startsAt", { ascending: true });

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }
  if (!Array.isArray(data)) return [];

  return data
    .map((row) => toAvailability(row as AvailabilityRow))
    .filter((item): item is AdminAvailabilityRecord => item !== null);
}

export async function fetchSpecialistBookings(
  specialistId: string,
  rangeFrom: Date,
  rangeTo: Date,
): Promise<AdminSpecialistBookingRecord[]> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("coachBooking")
    .select("id, specialistId, scheduledAt, status, userId")
    .eq("specialistId", specialistId)
    .in("status", ["pending", "confirmed"])
    .gte("scheduledAt", rangeFrom.toISOString())
    .lt("scheduledAt", rangeTo.toISOString())
    .order("scheduledAt", { ascending: true });

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }
  if (!Array.isArray(data)) return [];

  return data
    .map((row) => toBooking(row as BookingRow))
    .filter((item): item is AdminSpecialistBookingRecord => item !== null);
}

function rpcErrorMessage(error: { message?: string } | null, fallback: string): Error {
  const message = error?.message ?? fallback;
  if (message.includes("overlaps")) {
    return new Error("This slot overlaps another availability window for this specialist.");
  }
  if (message.includes("uncover") || message.includes("covers an existing")) {
    return new Error("Cannot change availability that covers an existing booking.");
  }
  if (message.includes("inactive")) {
    return new Error("Specialist is inactive.");
  }
  if (message.includes("multiple of duration")) {
    return new Error("Window length must be a multiple of the session duration.");
  }
  return new Error(message);
}

export async function upsertSpecialistAvailability(params: {
  availabilityId?: string | null;
  specialistId: string;
  form: AdminAvailabilityFormState;
}): Promise<string> {
  const startsAt = localInputToIso(params.form.startsAtLocal);
  const endsAt = localInputToIso(params.form.endsAtLocal);
  const { data, error } = await callRpc("admin_upsert_specialist_availability", {
    p_id: params.availabilityId ?? null,
    p_specialist_id: params.specialistId,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_duration_minutes: params.form.durationMinutes,
  });

  if (error) throw rpcErrorMessage(error, "Couldn't save availability.");
  if (typeof data !== "string") throw new Error("Couldn't save availability.");
  return data;
}

export async function deleteSpecialistAvailability(availabilityId: string): Promise<void> {
  const { error } = await callRpc("admin_delete_specialist_availability", {
    p_id: availabilityId,
  });
  if (error) throw rpcErrorMessage(error, "Couldn't delete availability.");
}

export async function listBookableOneOnOneSlots(
  rangeFrom: Date,
  rangeTo: Date,
  specialistId: string,
): Promise<BookableOneOnOneSlot[]> {
  if (!specialistId) return [];

  const { data, error } = await callRpc("list_bookable_one_on_one_slots", {
    p_from: rangeFrom.toISOString(),
    p_to: rangeTo.toISOString(),
    p_specialist_id: specialistId,
  });

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw new Error(error.message || "Couldn't load bookable slots.");
  }

  if (!Array.isArray(data)) return [];

  return data
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const record = row as Record<string, unknown>;
      const slotStart =
        typeof record.slotStart === "string"
          ? record.slotStart
          : typeof record.slotstart === "string"
            ? record.slotstart
            : null;
      const slotEnd =
        typeof record.slotEnd === "string"
          ? record.slotEnd
          : typeof record.slotend === "string"
            ? record.slotend
            : null;
      const durationMinutes =
        typeof record.durationMinutes === "number"
          ? record.durationMinutes
          : typeof record.durationminutes === "number"
            ? record.durationminutes
            : DEFAULT_SLOT_DURATION_MINUTES;
      if (!slotStart || !slotEnd) return null;
      return { slotStart, slotEnd, durationMinutes };
    })
    .filter((item): item is BookableOneOnOneSlot => item !== null);
}

export type SlotVisualState = "available" | "booked" | "unavailable";

export function bookingIntervalEnd(scheduledAtIso: string, durationMinutes = DEFAULT_SLOT_DURATION_MINUTES): Date {
  return new Date(new Date(scheduledAtIso).getTime() + durationMinutes * 60_000);
}

export function classifyDaySlots(params: {
  day: Date;
  availability: AdminAvailabilityRecord[];
  bookings: AdminSpecialistBookingRecord[];
  durationMinutes?: number;
}): { start: Date; end: Date; state: SlotVisualState; availabilityId?: string }[] {
  const duration = params.durationMinutes ?? DEFAULT_SLOT_DURATION_MINUTES;
  const dayStart = new Date(params.day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(params.day);
  dayEnd.setHours(23, 59, 59, 999);

  const results: {
    start: Date;
    end: Date;
    state: SlotVisualState;
    availabilityId?: string;
  }[] = [];

  for (const window of params.availability) {
    const windowStart = new Date(window.startsAt);
    const windowEnd = new Date(window.endsAt);
    const step = window.durationMinutes || duration;
    for (
      let cursor = windowStart.getTime();
      cursor + step * 60_000 <= windowEnd.getTime();
      cursor += step * 60_000
    ) {
      const start = new Date(cursor);
      const end = new Date(cursor + step * 60_000);
      if (end < dayStart || start > dayEnd) continue;

      const booked = params.bookings.some((booking) => {
        const bStart = new Date(booking.scheduledAt).getTime();
        const bEnd = bookingIntervalEnd(booking.scheduledAt, duration).getTime();
        return bStart < end.getTime() && bEnd > start.getTime();
      });

      results.push({
        start,
        end,
        state: booked ? "booked" : "available",
        availabilityId: window.availabilityId,
      });
    }
  }

  return results.sort((a, b) => a.start.getTime() - b.start.getTime());
}
