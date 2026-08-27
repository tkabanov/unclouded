/**
 * NCLDD-31 §5 / §6 — Automated 24h / 1h reminders, 5-min-before-end warning,
 * and Complete-at-end sweeper for confirmed 1:1 sessions.
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
import { formatSessionWhen } from "../_shared/sessionWhenLabel.ts";
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
  specialistId: string | null;
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
  whenLabelUser: string;
  whenLabelCoach: string;
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
      text: `${lead}\n\nWhen: ${params.whenLabelUser}\n${meetLine}\n`,
      html: `<p>${lead}</p><p><strong>When:</strong> ${params.whenLabelUser}</p><p>${meetHtml}</p>`,
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
      text: `${lead}\n\nMember: ${params.memberName}\nWhen: ${params.whenLabelCoach}\n${meetLine}\n${postSessionLine ? `${postSessionLine}\n` : ""}`,
      html: `<p>${lead}</p><p><strong>Member:</strong> ${params.memberName}</p><p><strong>When:</strong> ${params.whenLabelCoach}</p><p>${meetHtml}</p>${postSessionHtml}`,
    });
    results.specialist = coachMail.detail;
  }

  return results;
}

async function sendEndWarningEmail(params: {
  memberEmail: string;
  whenLabelUser: string;
  meetLink: string | null;
}): Promise<string> {
  if (!params.memberEmail.includes("@")) {
    return "smtp:skipped — no member email";
  }
  const meetLine = params.meetLink
    ? `Google Meet: ${params.meetLink}`
    : "Google Meet link is in the platform.";
  const meetHtml = params.meetLink
    ? `<a href="${params.meetLink}">Join Google Meet</a>`
    : "Google Meet link is in the platform.";
  const lead =
    "Your Uncloud360 1:1 session is ending in about 5 minutes — wrap up when you are ready.";
  const userMail = await sendTransactionalEmail({
    to: params.memberEmail,
    subject: "Your Uncloud360 1:1 is ending soon",
    text: `${lead}\n\nWhen: ${params.whenLabelUser}\n${meetLine}\n`,
    html: `<p>${lead}</p><p><strong>When:</strong> ${params.whenLabelUser}</p><p>${meetHtml}</p>`,
  });
  return userMail.detail;
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
    .select(
      "id, userId, scheduledAt, durationMinutes, meetLink, assignedCoachEmail, postSessionToken, specialistId",
    )
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
      .select("firstName, email, timeZone")
      .eq("id", booking.userId)
      .maybeSingle();

    const memberName =
      (typeof member?.firstName === "string" && member.firstName.trim()) || "Member";
    const memberEmail =
      (typeof member?.email === "string" && member.email.trim()) || "";
    const userTimeZone =
      typeof member?.timeZone === "string" && member.timeZone.trim()
        ? member.timeZone.trim()
        : null;
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

    let coachTimeZone: string | null = null;
    if (typeof booking.specialistId === "string" && booking.specialistId) {
      const { data: specialist } = await params.supabase
        .from("specialist")
        .select("timezone")
        .eq("id", booking.specialistId)
        .maybeSingle();
      coachTimeZone =
        typeof specialist?.timezone === "string" ? specialist.timezone : null;
    }

    const whenLabelUser = formatSessionWhen(
      booking.scheduledAt,
      durationMinutes,
      userTimeZone,
    );
    const whenLabelCoach = formatSessionWhen(
      booking.scheduledAt,
      durationMinutes,
      coachTimeZone,
    );

    const postSessionToken =
      typeof booking.postSessionToken === "string" && booking.postSessionToken.trim()
        ? booking.postSessionToken.trim()
        : null;

    const mail = await sendReminderPair({
      kind: params.kind,
      memberEmail,
      memberName,
      specialistEmail,
      whenLabelUser,
      whenLabelCoach,
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

/**
 * CL-7: warn the user ~5 minutes before scheduled session end.
 * Window widened to ~5 minutes so the every-5m cron reliably hits once.
 */
async function processEndWarning5m(params: {
  supabase: ReturnType<typeof createClient>;
  nowMs: number;
  nowIso: string;
}): Promise<{
  dueCount: number;
  stampedCount: number;
  results: Array<{ bookingId: string; user: string }>;
}> {
  const endFromMs = params.nowMs + 3 * 60_000;
  const endToMs = params.nowMs + 8 * 60_000;

  // Sessions that started recently (typical duration up to 3h) and not yet warned.
  const { data, error } = await params.supabase
    .from("coachBooking")
    .select(
      "id, userId, scheduledAt, durationMinutes, meetLink, assignedCoachEmail, postSessionToken, specialistId",
    )
    .eq("status", "confirmed")
    .not("scheduledAt", "is", null)
    .is("endWarning5mSentAt", null)
    .lt("scheduledAt", params.nowIso)
    .gte("scheduledAt", new Date(params.nowMs - 4 * 60 * 60_000).toISOString());

  if (error) {
    throw new Error(error.message);
  }

  const candidates = (data ?? []) as BookingRow[];
  const due = candidates.filter((booking) => {
    const durationMinutes =
      typeof booking.durationMinutes === "number" && booking.durationMinutes > 0
        ? booking.durationMinutes
        : 30;
    const endsAtMs =
      new Date(booking.scheduledAt).getTime() + durationMinutes * 60_000;
    return endsAtMs >= endFromMs && endsAtMs <= endToMs;
  });

  const results: Array<{ bookingId: string; user: string }> = [];
  let stampedCount = 0;

  for (const booking of due) {
    const { data: member } = await params.supabase
      .from("profiles")
      .select("firstName, email, timeZone")
      .eq("id", booking.userId)
      .maybeSingle();

    const memberEmail =
      (typeof member?.email === "string" && member.email.trim()) || "";
    const userTimeZone =
      typeof member?.timeZone === "string" && member.timeZone.trim()
        ? member.timeZone.trim()
        : null;
    const durationMinutes =
      typeof booking.durationMinutes === "number" && booking.durationMinutes > 0
        ? booking.durationMinutes
        : 30;
    const meetLink =
      typeof booking.meetLink === "string" && booking.meetLink.trim()
        ? booking.meetLink.trim()
        : null;

    const whenLabelUser = formatSessionWhen(
      booking.scheduledAt,
      durationMinutes,
      userTimeZone,
    );

    const userDetail = await sendEndWarningEmail({
      memberEmail,
      whenLabelUser,
      meetLink,
    });

    results.push({ bookingId: booking.id, user: userDetail });

    const { error: updateError } = await params.supabase
      .from("coachBooking")
      .update({
        endWarning5mSentAt: params.nowIso,
        endWarning5mDetail: `user:${userDetail}`.slice(0, 500),
      })
      .eq("id", booking.id)
      .eq("status", "confirmed")
      .is("endWarning5mSentAt", null);

    if (!updateError) stampedCount += 1;
  }

  return { dueCount: due.length, stampedCount, results };
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
    const endWarning5m = await processEndWarning5m({
      supabase,
      nowMs,
      nowIso,
    });

    const { data: completedCount, error: completeError } = await supabase.rpc(
      "complete_ended_coach_bookings",
    );
    if (completeError) {
      throw new Error(completeError.message);
    }

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
      endWarning5m: {
        dueCount: endWarning5m.dueCount,
        stampedCount: endWarning5m.stampedCount,
        results: endWarning5m.results,
      },
      completeEnded: {
        completedCount:
          typeof completedCount === "number" ? completedCount : Number(completedCount) || 0,
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
