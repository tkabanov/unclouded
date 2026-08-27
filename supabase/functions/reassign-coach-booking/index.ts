/**
 * NCLDD-31 §4 / CL-3 — After admin reassigns a 1:1 coach:
 * update Google Calendar attendees, email previous/new coach + user, resend Kota brief.
 *
 * Body: { bookingId: string, previousAssignedCoachEmail?: string | null }
 * Auth: admin JWT (settings admin).
 *
 * Soft-fails Google/SendGrid when unset — DB reassign already succeeded.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { canonicalAppOrigin } from "../_shared/appOrigin.ts";
import { updateGoogleCalendarEventAttendees } from "../_shared/googleCalendar.ts";
import { resolveKotaReadDisplayText } from "../_shared/kotaReadBrief.ts";
import {
  resolveKotaReadRecipients,
  sendKotaReadBriefEmail,
} from "../_shared/kotaReadDelivery.ts";
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

type RequestBody = {
  bookingId?: string;
  previousAssignedCoachEmail?: string | null;
};

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

  const { data: callerProfile } = await admin
    .from("profiles")
    .select("roleType")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (callerProfile?.roleType !== "admin") {
    return jsonResponse(403, { error: "forbidden" });
  }

  const { data: booking, error: bookingError } = await admin
    .from("coachBooking")
    .select(
      "id, userId, scheduledAt, durationMinutes, meetLink, googleEventId, assignedCoachEmail, specialistId, kotaRead, kotaReadJson",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError || !booking) {
    return jsonResponse(404, { error: "booking_not_found" });
  }

  const previousEmail =
    (typeof body.previousAssignedCoachEmail === "string" &&
      body.previousAssignedCoachEmail.trim()) ||
    null;
  const newCoachEmail =
    typeof booking.assignedCoachEmail === "string"
      ? booking.assignedCoachEmail.trim()
      : "";

  let newCoachName = "your coach";
  let newCoachTimeZone: string | null = null;
  if (typeof booking.specialistId === "string" && booking.specialistId) {
    const { data: specialist } = await admin
      .from("specialist")
      .select("name, timezone")
      .eq("id", booking.specialistId)
      .maybeSingle();
    if (typeof specialist?.name === "string" && specialist.name.trim()) {
      newCoachName = specialist.name.trim();
    }
    newCoachTimeZone =
      typeof specialist?.timezone === "string" ? specialist.timezone : null;
  }

  const { data: member } = await admin
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

  const durationMinutes =
    typeof booking.durationMinutes === "number" && booking.durationMinutes > 0
      ? booking.durationMinutes
      : 30;
  const scheduledAt =
    typeof booking.scheduledAt === "string" ? booking.scheduledAt : null;
  const meetLink =
    typeof booking.meetLink === "string" && booking.meetLink.trim()
      ? booking.meetLink.trim()
      : null;

  const whenLabelUser = scheduledAt
    ? formatSessionWhen(scheduledAt, durationMinutes, userTimeZone)
    : "your scheduled time";
  const whenLabelCoach = scheduledAt
    ? formatSessionWhen(scheduledAt, durationMinutes, newCoachTimeZone)
    : "the scheduled time";
  const meetLine = meetLink ? `Google Meet: ${meetLink}` : "Google Meet link is in the platform.";

  const calendar = await updateGoogleCalendarEventAttendees({
    eventId: booking.googleEventId,
    attendeeEmails: [memberEmail, newCoachEmail].filter(Boolean),
    summary: `Uncloud360 1:1 coaching — ${memberName}`,
    description: `Coach reassigned to ${newCoachName}.`,
  });

  const sendgrid = readSendGridEnv();
  const emailResults: Record<string, string> = {};

  if (!isSendGridConfigured(sendgrid)) {
    emailResults.previousCoach = "smtp:skipped";
    emailResults.newCoach = "smtp:skipped";
    emailResults.user = "smtp:skipped";
    emailResults.brief = "smtp:skipped";
  } else {
    if (previousEmail && previousEmail.includes("@") && previousEmail !== newCoachEmail) {
      const prevMail = await sendTransactionalEmail({
        to: previousEmail,
        subject: `Removed from 1:1 with ${memberName}`,
        text: `You have been removed from an upcoming Uncloud360 1:1 session.\n\nMember: ${memberName}\nWhen: ${whenLabelCoach}\n`,
        html: `<p>You have been removed from an upcoming Uncloud360 1:1 session.</p><p><strong>Member:</strong> ${memberName}</p><p><strong>When:</strong> ${whenLabelCoach}</p>`,
      });
      emailResults.previousCoach = prevMail.detail;
    } else {
      emailResults.previousCoach = "smtp:skipped — no previous coach email";
    }

    if (newCoachEmail.includes("@")) {
      const newMail = await sendTransactionalEmail({
        to: newCoachEmail,
        subject: `1:1 session assigned — ${memberName}`,
        text: `You have been assigned to a Uncloud360 1:1 session.\n\nMember: ${memberName}\nWhen: ${whenLabelCoach}\n${meetLine}\n`,
        html: `<p>You have been assigned to a Uncloud360 1:1 session.</p><p><strong>Member:</strong> ${memberName}</p><p><strong>When:</strong> ${whenLabelCoach}</p><p>${
          meetLink
            ? `<a href="${meetLink}">Join Google Meet</a>`
            : "Google Meet link is in the platform."
        }</p>`,
      });
      emailResults.newCoach = newMail.detail;
    } else {
      emailResults.newCoach = "smtp:skipped — no new coach email";
    }

    if (memberEmail.includes("@")) {
      const userMail = await sendTransactionalEmail({
        to: memberEmail,
        subject: "Your Uncloud360 coach has been updated",
        text: `Your coach for an upcoming 1:1 session has been updated.\n\nNew coach: ${newCoachName}\nWhen: ${whenLabelUser}\n${meetLine}\n`,
        html: `<p>Your coach for an upcoming 1:1 session has been updated.</p><p><strong>New coach:</strong> ${newCoachName}</p><p><strong>When:</strong> ${whenLabelUser}</p><p>${
          meetLink
            ? `<a href="${meetLink}">Join Google Meet</a>`
            : "Google Meet link is in the platform."
        }</p>`,
      });
      emailResults.user = userMail.detail;
    } else {
      emailResults.user = "smtp:skipped — no member email";
    }

    const kotaText = resolveKotaReadDisplayText({
      kotaReadJson: booking.kotaReadJson,
      kotaRead: typeof booking.kotaRead === "string" ? booking.kotaRead : null,
    });

    if (kotaText.trim() && newCoachEmail.includes("@")) {
      const resolved = resolveKotaReadRecipients({
        assignedCoachEmail: newCoachEmail,
        coachBriefInboxEnv: Deno.env.get("COACH_BRIEF_INBOX"),
      });
      const brief = await sendKotaReadBriefEmail({
        to: resolved.recipients,
        deliverySource: resolved.source,
        memberName,
        memberEmail,
        scheduledAt,
        timeZone: newCoachTimeZone,
        kotaRead: kotaText,
        adminConsoleUrl: `${canonicalAppOrigin()}/admin`,
      });
      emailResults.brief = brief.detail;
    } else {
      emailResults.brief = kotaText.trim()
        ? "smtp:skipped — no new coach email"
        : "smtp:skipped — no Kota brief on booking";
    }
  }

  return jsonResponse(200, {
    ok: true,
    bookingId,
    google: calendar.detail,
    email: emailResults,
  });
});
