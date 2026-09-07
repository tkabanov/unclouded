/**
 * NCLDD-31 §4 — Sweeper that fills in Meet/Calendar data for upcoming sessions
 * that were confirmed while Google was unreachable.
 *
 * Booking confirmation deliberately never blocks on Google, so a transient
 * outage leaves a confirmed session with an empty meetLink and reminder emails
 * that keep promising a link. This retries those, newest deadline first.
 *
 * It does not re-send confirmation emails: creating the event with
 * sendUpdates=all makes Google itself deliver a Calendar invitation carrying
 * the Meet link to both attendees. Group sessions have no attendees by design
 * (G8) and surface their link in the platform UI.
 *
 * Invoke via pg_cron / invoke_scheduled_edge_function:
 *   POST /functions/v1/backfill-session-meet-links
 *   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *   Optional: x-cron-secret: <MEET_BACKFILL_CRON_SECRET>
 *
 * Secrets:
 * - GOOGLE_OAUTH_* / GOOGLE_CALENDAR_ID — see _shared/googleCalendar.ts
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createGoogleMeetEvent,
  findGoogleEventByKey,
} from "../_shared/googleCalendar.ts";

const BATCH_LIMIT = 25;

type Outcome = { id: string; detail: string };

function json(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authorize(req: Request, serviceKey: string): boolean {
  const auth = req.headers.get("Authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (bearer && bearer === serviceKey) return true;

  const cronSecret = Deno.env.get("MEET_BACKFILL_CRON_SECRET");
  if (cronSecret) {
    const header = req.headers.get("x-cron-secret") ?? "";
    if (header === cronSecret) return true;
  }

  return false;
}

/**
 * Adopt an event Google already accepted, or create one. A failed lookup
 * reports the error without creating anything: treating it as "no event exists"
 * would produce a duplicate, so the row is retried on the next run instead.
 */
async function resolveEvent(params: {
  sessionKey: string;
  summary: string;
  description: string;
  startsAt: string;
  durationMinutes: number;
  attendeeEmails: string[];
}): Promise<{ meetLink: string | null; eventId: string | null; detail: string }> {
  const lookup = await findGoogleEventByKey(params.sessionKey);

  if (lookup.status === "error") {
    return { meetLink: null, eventId: null, detail: lookup.detail };
  }

  if (lookup.status === "found") {
    // Event exists but Google never attached a conference — a config problem
    // (Meet disabled for the org unit, or a non-Workspace account) that a retry
    // will not fix, so surface it instead of looping on it forever.
    return {
      meetLink: lookup.meetLink,
      eventId: lookup.eventId,
      detail: lookup.meetLink ? "google:adopted_existing_event" : "google:event_without_meet",
    };
  }

  return await createGoogleMeetEvent({
    summary: params.summary,
    description: params.description,
    startsAt: params.startsAt,
    durationMinutes: params.durationMinutes,
    attendeeEmails: params.attendeeEmails,
    sessionKey: params.sessionKey,
  });
}

async function backfillOneOnOne(
  supabase: ReturnType<typeof createClient>,
  nowIso: string,
): Promise<Outcome[]> {
  const { data, error } = await supabase
    .from("coachBooking")
    .select("id, userId, scheduledAt, durationMinutes, assignedCoachEmail")
    .eq("status", "confirmed")
    .is("meetLink", null)
    .gt("scheduledAt", nowIso)
    .order("scheduledAt", { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) throw new Error(`coachBooking query failed: ${error.message}`);

  const outcomes: Outcome[] = [];

  for (const booking of data ?? []) {
    const bookingId = booking.id as string;
    const scheduledAt = booking.scheduledAt as string;

    const { data: member } = await supabase
      .from("profiles")
      .select("firstName, email")
      .eq("id", booking.userId as string)
      .maybeSingle();

    const memberName =
      (typeof member?.firstName === "string" && member.firstName.trim()) || "Member";
    const memberEmail = typeof member?.email === "string" ? member.email.trim() : "";
    const coachEmail =
      typeof booking.assignedCoachEmail === "string"
        ? booking.assignedCoachEmail.trim()
        : "";
    const durationMinutes =
      typeof booking.durationMinutes === "number" && booking.durationMinutes > 0
        ? booking.durationMinutes
        : 30;

    const resolved = await resolveEvent({
      sessionKey: `coach-${bookingId}`,
      summary: `Uncloud360 1:1 coaching — ${memberName}`,
      description: "Uncloud360 one-on-one coaching session.",
      startsAt: scheduledAt,
      durationMinutes,
      attendeeEmails: [memberEmail, coachEmail].filter(Boolean),
    });

    const update: Record<string, unknown> = {
      meetBackfillAttemptedAt: nowIso,
      meetBackfillDetail: resolved.detail,
    };
    if (resolved.meetLink) update.meetLink = resolved.meetLink;
    if (resolved.eventId) update.googleEventId = resolved.eventId;

    const { error: updateError } = await supabase
      .from("coachBooking")
      .update(update)
      .eq("id", bookingId);

    outcomes.push({
      id: bookingId,
      detail: updateError ? `db_error: ${updateError.message}` : resolved.detail,
    });
  }

  return outcomes;
}

async function backfillGroup(
  supabase: ReturnType<typeof createClient>,
  nowIso: string,
): Promise<Outcome[]> {
  const { data, error } = await supabase
    .from("groupCoachingSession")
    .select("id, title, description, startsAt, durationMinutes")
    .eq("status", "scheduled")
    .is("meetLink", null)
    .gt("startsAt", nowIso)
    .order("startsAt", { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) throw new Error(`groupCoachingSession query failed: ${error.message}`);

  const outcomes: Outcome[] = [];

  for (const session of data ?? []) {
    const sessionId = session.id as string;
    const durationMinutes =
      typeof session.durationMinutes === "number" && session.durationMinutes > 0
        ? session.durationMinutes
        : 60;

    const resolved = await resolveEvent({
      sessionKey: `group-${sessionId}`,
      summary: `Uncloud360 group: ${session.title as string}`,
      description:
        (typeof session.description === "string" && session.description) ||
        "Uncloud360 group coaching session.",
      startsAt: session.startsAt as string,
      durationMinutes,
      attendeeEmails: [],
    });

    const update: Record<string, unknown> = {
      meetBackfillAttemptedAt: nowIso,
      meetBackfillDetail: resolved.detail,
    };
    if (resolved.meetLink) update.meetLink = resolved.meetLink;
    if (resolved.eventId) update.googleEventId = resolved.eventId;

    const { error: updateError } = await supabase
      .from("groupCoachingSession")
      .update(update)
      .eq("id", sessionId);

    outcomes.push({
      id: sessionId,
      detail: updateError ? `db_error: ${updateError.message}` : resolved.detail,
    });
  }

  return outcomes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (req.method !== "POST" && req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Missing Supabase env" }, 500);
  }

  if (!authorize(req, serviceKey)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const nowIso = new Date().toISOString();

  try {
    const oneOnOne = await backfillOneOnOne(supabase, nowIso);
    const group = await backfillGroup(supabase, nowIso);

    const repaired = [...oneOnOne, ...group].filter(
      (item) => item.detail === "google:created" || item.detail === "google:adopted_existing_event",
    ).length;

    return json({
      ok: true,
      ranAt: nowIso,
      scanned: oneOnOne.length + group.length,
      repaired,
      oneOnOne,
      group,
    });
  } catch (err) {
    return json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      500,
    );
  }
});
