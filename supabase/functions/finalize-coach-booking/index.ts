/**
 * NCLDD-31 §3 — After internal 1:1 confirm: create Google Meet + send confirmation emails.
 *
 * Secrets (optional — booking stays confirmed if unset):
 * - GOOGLE_SERVICE_ACCOUNT_JSON — full service-account JSON (needs Calendar scope on the calendar)
 * - GOOGLE_CALENDAR_ID — calendar id (often the shared coaching calendar email)
 * - SENDGRID_API_KEY / SENDGRID_FROM_* — existing SendGrid mail secrets
 *
 * Body: { bookingId: string }
 * Auth: user JWT; booking must belong to caller (or admin).
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { createGoogleMeetEvent } from "../_shared/googleCalendar.ts";
import { coachPostSessionFormUrl } from "../_shared/appOrigin.ts";
import { formatSessionWhen } from "../_shared/sessionWhenLabel.ts";
import { authenticateRequest } from "../_shared/supabase-auth.ts";
import {
  isSendGridConfigured,
  readSendGridEnv,
  sendTransactionalEmail,
} from "../_shared/sendgridMail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RequestBody = { bookingId?: string };

function jsonResponse(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function serviceRoleClient() {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  const auth = await authenticateRequest(req);
  if (!auth) return jsonResponse(401, { error: "unauthorized" });

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }

  const bookingId = body.bookingId?.trim();
  if (!bookingId) return jsonResponse(400, { error: "booking_id_required" });

  const admin = serviceRoleClient();

  const { data: booking, error: bookingError } = await admin
    .from("coachBooking")
    .select(
      "id, userId, scheduledAt, status, specialistId, assignedCoachEmail, durationMinutes, meetLink, googleEventId, postSessionToken",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError || !booking) {
    return jsonResponse(404, { error: "booking_not_found" });
  }

  if (booking.userId !== auth.user.id) {
    const { data: profile } = await admin
      .from("profiles")
      .select("roleType")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (profile?.roleType !== "admin") {
      return jsonResponse(403, { error: "forbidden" });
    }
  }

  if (booking.status !== "confirmed" || !booking.scheduledAt) {
    return jsonResponse(400, { error: "booking_not_ready" });
  }

  const durationMinutes =
    typeof booking.durationMinutes === "number" && booking.durationMinutes > 0
      ? booking.durationMinutes
      : 30;

  const { data: member } = await admin
    .from("profiles")
    .select("firstName, email, timeZone")
    .eq("id", booking.userId)
    .maybeSingle();

  const memberName =
    (typeof member?.firstName === "string" && member.firstName.trim()) || "Member";
  const memberEmail =
    (typeof member?.email === "string" && member.email.trim()) ||
    auth.user.email ||
    "";
  const userTimeZone =
    typeof member?.timeZone === "string" && member.timeZone.trim()
      ? member.timeZone.trim()
      : null;
  const specialistEmail =
    typeof booking.assignedCoachEmail === "string"
      ? booking.assignedCoachEmail.trim()
      : "";

  let coachTimeZone: string | null = null;
  let coachName: string | null = null;
  if (typeof booking.specialistId === "string" && booking.specialistId) {
    const { data: specialist } = await admin
      .from("specialist")
      .select("timezone, name")
      .eq("id", booking.specialistId)
      .maybeSingle();
    coachTimeZone =
      typeof specialist?.timezone === "string" ? specialist.timezone : null;
    coachName =
      typeof specialist?.name === "string" && specialist.name.trim()
        ? specialist.name.trim()
        : null;
  }

  let meetLink =
    typeof booking.meetLink === "string" && booking.meetLink.trim()
      ? booking.meetLink.trim()
      : null;
  let googleEventId =
    typeof booking.googleEventId === "string" && booking.googleEventId.trim()
      ? booking.googleEventId.trim()
      : null;
  let googleDetail = "google:already_set";

  if (!meetLink || !googleEventId) {
    const created = await createGoogleMeetEvent({
      summary: `Uncloud360 1:1 coaching — ${memberName}`,
      description: "Uncloud360 one-on-one coaching session.",
      startsAt: booking.scheduledAt,
      durationMinutes,
      attendeeEmails: [memberEmail, specialistEmail].filter(Boolean),
    });
    googleDetail = created.detail;
    if (created.meetLink || created.eventId) {
      meetLink = created.meetLink ?? meetLink;
      googleEventId = created.eventId ?? googleEventId;
      await admin
        .from("coachBooking")
        .update({
          meetLink,
          googleEventId,
        })
        .eq("id", bookingId);
    }
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
  const meetLine = meetLink
    ? `Google Meet: ${meetLink}`
    : "Google Meet link will follow shortly.";
  const postSessionToken =
    typeof booking.postSessionToken === "string" && booking.postSessionToken.trim()
      ? booking.postSessionToken.trim()
      : null;
  const postSessionUrl = postSessionToken
    ? coachPostSessionFormUrl(postSessionToken)
    : null;
  const postSessionLine = postSessionUrl
    ? `Submit session notes: ${postSessionUrl}`
    : "";
  const postSessionHtml = postSessionUrl
    ? `<p><a href="${postSessionUrl}">Submit session notes</a> (after the session)</p>`
    : "";

  const sendgrid = readSendGridEnv();
  const emailResults: Record<string, string> = {};

  if (!isSendGridConfigured(sendgrid)) {
    emailResults.user = "smtp:skipped";
    emailResults.specialist = "smtp:skipped";
  } else {
    if (memberEmail.includes("@")) {
      const coachLine = coachName ? `Coach: ${coachName}\n` : "";
      const coachHtml = coachName
        ? `<p><strong>Coach:</strong> ${coachName}</p>`
        : "";
      const userMail = await sendTransactionalEmail({
        to: memberEmail,
        subject: "Your Uncloud360 1:1 session is confirmed",
        text: `Your coaching session is confirmed.\n\n${coachLine}When: ${whenLabelUser}\n${meetLine}\n`,
        html: `<p>Your coaching session is confirmed.</p>${coachHtml}<p><strong>When:</strong> ${whenLabelUser}</p><p>${
          meetLink
            ? `<a href="${meetLink}">Join Google Meet</a>`
            : "Google Meet link will follow shortly."
        }</p>`,
      });
      emailResults.user = userMail.detail;
    } else {
      emailResults.user = "smtp:skipped — no member email";
    }

    if (specialistEmail.includes("@")) {
      const coachMail = await sendTransactionalEmail({
        to: specialistEmail,
        subject: `1:1 session confirmed with ${memberName}`,
        text: `A 1:1 coaching session is confirmed.\n\nMember: ${memberName}\nWhen: ${whenLabelCoach}\n${meetLine}\n${postSessionLine ? `${postSessionLine}\n` : ""}`,
        html: `<p>A 1:1 coaching session is confirmed.</p><p><strong>Member:</strong> ${memberName}</p><p><strong>When:</strong> ${whenLabelCoach}</p><p>${
          meetLink
            ? `<a href="${meetLink}">Join Google Meet</a>`
            : "Google Meet link will follow shortly."
        }</p>${postSessionHtml}`,
      });
      emailResults.specialist = coachMail.detail;
    } else {
      emailResults.specialist = "smtp:skipped — no specialist email";
    }
  }

  return jsonResponse(200, {
    ok: true,
    bookingId,
    meetLink,
    googleEventId,
    google: googleDetail,
    email: emailResults,
  });
});
