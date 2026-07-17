import { supabase } from "@/integrations/supabase/client";

const KOTA_READ_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-kota-read`;

export type CoachBookingRow = {
  id: string;
  userId: string;
  scheduledAt: string | null;
  status: string | null;
  kotaRead: string | null;
  createdAt: string;
};

export async function createCoachBooking(params?: {
  scheduledAt?: string | null;
  externalCalendarUrl?: string | null;
}): Promise<CoachBookingRow> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("coachBooking")
    .insert({
      userId: user.id,
      scheduledAt: params?.scheduledAt ?? null,
      status: "pending",
    })
    .select("id, userId, scheduledAt, status, kotaRead, createdAt")
    .single();

  if (error) throw error;

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (token) {
    await fetch(KOTA_READ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ bookingId: data.id }),
    }).catch(() => null);
  }

  if (params?.externalCalendarUrl && typeof window !== "undefined") {
    window.open(params.externalCalendarUrl, "_blank", "noopener,noreferrer");
  }

  return data as CoachBookingRow;
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
