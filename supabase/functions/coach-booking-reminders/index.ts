/**
 * NCLDD-31 §5 — Automated 24h / 1h reminders for confirmed 1:1 sessions.
 *
 * Invoke via pg_cron / invoke_scheduled_edge_function:
 *   POST /functions/v1/coach-booking-reminders
 *   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *   Optional: x-cron-secret: <COACH_BOOKING_REMINDERS_CRON_SECRET>
 *
 * Secrets (optional — stamps still applied when SendGrid unset):
 * - SENDGRID_API_KEY / SENDGRID_FROM_*
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { coachPostSessionFormUrl } from "../_shared/appOrigin.ts";
import {
  sendGridSmtpLabel,
  sendTransactionalEmail,
} from "../_shared/sendgridMail.ts";

type ReminderKind = "24h" | "1h";

type BookingRow = {
  id: string;
  userId: string;
  scheduledAt: string;
  durationMinutes: number | null;
  meetLink: string | null;
  assignedCoachEmail: string | null;
  postSessionToken: string | null;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authorize(req: Request, serviceKey: string): boolean {
  const auth = req.headers.get("Authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (bearer && bearer === serviceKey) return true;

  const cronSecret = Deno.env.get("COACH_BOOKING_REMINDERS_CRON_SECRET");
  if (cronSecret) {
    const header = req.headers.get("x-cron-secret") ?? "";
    if (header === cronSecret) return true;
  }

  return false;
}

function formatSessionWhen(iso: string, durationMinutes: number): string {
  const start = new Date(iso);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const opts: Intl.DateTimeFormatOptions = {
    dateStyle: "full",
    timeStyle: "short",
  };
  return `${start.toLocaleString(undefined, opts)} – ${end.toLocaleTimeString(undefined, {
    timeStyle: "short",
  })} (${durationMinutes} min)`;
}

function whenWindow(nowMs: number, kind: ReminderKind): { from: string; to: string } {
  if (kind === "24h") {
    return {
      from: new Date(nowMs + 23 * 60 * 60_000).toISOString(),
      to: new Date(nowMs + 25 * 60 * 60_000).toISOString(),
    };
  }
  return {
    from: new Date(nowMs + 50 * 60_000).toISOString(),
    to: new Date(nowMs + 70 * 60_000).toISOString(),
  };
}

async function sendReminderPair(params: {
  kind: ReminderKind;
  memberEmail: string;
  memberName: string;
  specialistEmail: string;
  whenLabel: string;
  meetLink: string | null;
  postSessionToken: string | null;
}): Promise<{ user: string; specialist: string }> {
  const lead =
    params.kind === "24h"
      ? "Reminder: your Uncloud360 1:1 session is in about 24 hours."
      : "Reminder: your Uncloud360 1:1 session starts in about 1 hour.";
  const meetLine = params.meetLink
    ? `Google Meet: ${params.meetLink}`
    : "Google Meet link will follow shortly.";
  const meetHtml = params.meetLink
    ? `<a href="${params.meetLink}">Join Google Meet</a>`
    : "Google Meet link will follow shortly.";
  const postSessionUrl = params.postSessionToken
    ? coachPostSessionFormUrl(params.postSessionToken)
    : null;
  const postSessionLine = postSessionUrl
    ? `Submit session notes: ${postSessionUrl}`
    : "";
  const postSessionHtml = postSessionUrl
    ? `<p><a href="${postSessionUrl}">Submit session notes</a> (after the session)</p>`
    : "";

  const results = { user: "smtp:skipped — no member email", specialist: "smtp:skipped — no specialist email" };

  if (params.memberEmail.includes("@")) {
    const userMail = await sendTransactionalEmail({
      to: params.memberEmail,
      subject:
        params.kind === "24h"
          ? "Reminder: your Uncloud360 1:1 is tomorrow"
          : "Reminder: your Uncloud360 1:1 starts soon",
      text: `${lead}\n\nWhen: ${params.whenLabel}\n${meetLine}\n`,
      html: `<p>${lead}</p><p><strong>When:</strong> ${params.whenLabel}</p><p>${meetHtml}</p>`,
    });
    results.user = userMail.detail;
  }

  if (params.specialistEmail.includes("@")) {
    const coachMail = await sendTransactionalEmail({
      to: params.specialistEmail,
      subject:
        params.kind === "24h"
          ? `Reminder: 1:1 with ${params.memberName} in ~24 hours`
          : `Reminder: 1:1 with ${params.memberName} in ~1 hour`,
      text: `${lead}\n\nMember: ${params.memberName}\nWhen: ${params.whenLabel}\n${meetLine}\n${postSessionLine ? `${postSessionLine}\n` : ""}`,
      html: `<p>${lead}</p><p><strong>Member:</strong> ${params.memberName}</p><p><strong>When:</strong> ${params.whenLabel}</p><p>${meetHtml}</p>${postSessionHtml}`,
    });
    results.specialist = coachMail.detail;
  }

  return results;
}

async function processCohort(params: {
  supabase: ReturnType<typeof createClient>;
  kind: ReminderKind;
  nowMs: number;
  nowIso: string;
}): Promise<{
  dueCount: number;
  stampedCount: number;
  results: Array<{ bookingId: string; user: string; specialist: string }>;
}> {
  const window = whenWindow(params.nowMs, params.kind);
  const stampCol = params.kind === "24h" ? "reminder24hSentAt" : "reminder1hSentAt";
  const detailCol = params.kind === "24h" ? "reminder24hDetail" : "reminder1hDetail";

  const { data, error } = await params.supabase
    .from("coachBooking")
    .select("id, userId, scheduledAt, durationMinutes, meetLink, assignedCoachEmail, postSessionToken")
    .eq("status", "confirmed")
    .not("scheduledAt", "is", null)
    .is(stampCol, null)
    .gte("scheduledAt", window.from)
    .lte("scheduledAt", window.to);

  if (error) {
    throw new Error(error.message);
  }

  const bookings = (data ?? []) as BookingRow[];
  const results: Array<{ bookingId: string; user: string; specialist: string }> = [];
  let stampedCount = 0;

  for (const booking of bookings) {
    const { data: member } = await params.supabase
      .from("profiles")
      .select("firstName, email")
      .eq("id", booking.userId)
      .maybeSingle();

    const memberName =
      (typeof member?.firstName === "string" && member.firstName.trim()) || "Member";
    const memberEmail =
      (typeof member?.email === "string" && member.email.trim()) || "";
    const specialistEmail =
      typeof booking.assignedCoachEmail === "string"
        ? booking.assignedCoachEmail.trim()
        : "";
    const durationMinutes =
      typeof booking.durationMinutes === "number" && booking.durationMinutes > 0
        ? booking.durationMinutes
        : 30;
    const meetLink =
      typeof booking.meetLink === "string" && booking.meetLink.trim()
        ? booking.meetLink.trim()
        : null;
    const whenLabel = formatSessionWhen(booking.scheduledAt, durationMinutes);

    const postSessionToken =
      typeof booking.postSessionToken === "string" && booking.postSessionToken.trim()
        ? booking.postSessionToken.trim()
        : null;

    const mail = await sendReminderPair({
      kind: params.kind,
      memberEmail,
      memberName,
      specialistEmail,
      whenLabel,
      meetLink,
      postSessionToken,
    });

    const detail = `user:${mail.user}; specialist:${mail.specialist}`;
    results.push({ bookingId: booking.id, user: mail.user, specialist: mail.specialist });

    const { error: updateError } = await params.supabase
      .from("coachBooking")
      .update({
        [stampCol]: params.nowIso,
        [detailCol]: detail.slice(0, 500),
      })
      .eq("id", booking.id)
      .eq("status", "confirmed")
      .is(stampCol, null);

    if (!updateError) stampedCount += 1;
  }

  return { dueCount: bookings.length, stampedCount, results };
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
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  try {
    const reminder24h = await processCohort({
      supabase,
      kind: "24h",
      nowMs,
      nowIso,
    });
    const reminder1h = await processCohort({
      supabase,
      kind: "1h",
      nowMs,
      nowIso,
    });

    return json({
      ok: true,
      reminder24h: {
        dueCount: reminder24h.dueCount,
        stampedCount: reminder24h.stampedCount,
        results: reminder24h.results,
      },
      reminder1h: {
        dueCount: reminder1h.dueCount,
        stampedCount: reminder1h.stampedCount,
        results: reminder1h.results,
      },
      smtp: sendGridSmtpLabel(),
    });
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : "reminder_failed" },
      500,
    );
  }
});
