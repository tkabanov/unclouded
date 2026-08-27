/**
 * NCLDD-31 §4 / §7 — Cancel confirmed internal 1:1: DB cancel + Google Calendar delete.
 *
 * Secrets (optional — cancel succeeds even if unset):
 * - GOOGLE_SERVICE_ACCOUNT_JSON / GOOGLE_CALENDAR_ID — delete Calendar event
 * - SENDGRID_API_KEY / SENDGRID_FROM_* — cancel notice emails
 *
 * Body: { bookingId: string }
 * Auth: user JWT; booking must belong to caller (or admin via RPC).
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { deleteGoogleCalendarEvent } from "../_shared/googleCalendar.ts";
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
  const { data: bookingBefore } = await admin
    .from("coachBooking")
    .select("specialistId")
    .eq("id", bookingId)
    .maybeSingle();

  let coachTimeZone: string | null = null;
  const specialistIdBefore =
    typeof bookingBefore?.specialistId === "string" ? bookingBefore.specialistId : null;
  if (specialistIdBefore) {
    const { data: specialist } = await admin
      .from("specialist")
      .select("timezone")
      .eq("id", specialistIdBefore)
      .maybeSingle();
    coachTimeZone =
      typeof specialist?.timezone === "string" ? specialist.timezone : null;
  }

  const { data, error } = await auth.supabase.rpc("cancel_one_on_one_booking", {
    p_booking_id: bookingId,
  });

  if (error) {
    return jsonResponse(400, {
      ok: false,
      error: error.message || "cancel_failed",
    });
  }

  const row = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  if (row.ok !== true) {
    const status =
      row.code === "forbidden"
        ? 403
        : row.code === "booking_not_found"
          ? 404
          : 400;
    return jsonResponse(status, {
      ok: false,
      code: row.code ?? "cancel_failed",
      error: row.error ?? "Could not cancel booking.",
    });
  }

  const googleEventId =
    typeof row.googleEventId === "string" && row.googleEventId.trim()
      ? row.googleEventId.trim()
      : null;
  const googleDelete = await deleteGoogleCalendarEvent(googleEventId);

  const scheduledAt =
    typeof row.scheduledAt === "string" ? row.scheduledAt : null;
  const durationMinutes =
    typeof row.durationMinutes === "number" && row.durationMinutes > 0
      ? row.durationMinutes
      : 30;
  const specialistEmail =
    typeof row.assignedCoachEmail === "string" ? row.assignedCoachEmail.trim() : "";
  const refunded = row.refunded === true;
  const refundedAmount =
    typeof row.refundedAmount === "number" ? row.refundedAmount : 0;

  const userId = typeof row.userId === "string" ? row.userId : auth.user.id;
  const { data: member } = await admin
    .from("profiles")
    .select("firstName, email, timeZone")
    .eq("id", userId)
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

  const whenLabelUser = scheduledAt
    ? formatSessionWhen(scheduledAt, durationMinutes, userTimeZone)
    : "your scheduled time";
  const whenLabelCoach = scheduledAt
    ? formatSessionWhen(scheduledAt, durationMinutes, coachTimeZone)
    : "the scheduled time";
  const refundLine = refunded
    ? `Your session credits (${refundedAmount || "full"}) have been returned.`
    : "This cancellation is within 24 hours of the session, so credits are not refunded.";

  const sendgrid = readSendGridEnv();
  const emailResults: Record<string, string> = {};

  if (!isSendGridConfigured(sendgrid)) {
    emailResults.user = "smtp:skipped";
    emailResults.specialist = "smtp:skipped";
  } else {
    if (memberEmail.includes("@")) {
      const userMail = await sendTransactionalEmail({
        to: memberEmail,
        subject: "Your Uncloud360 1:1 session was canceled",
        text: `Your coaching session has been canceled.\n\nWhen: ${whenLabelUser}\n${refundLine}\n`,
        html: `<p>Your coaching session has been canceled.</p><p><strong>When:</strong> ${whenLabelUser}</p><p>${refundLine}</p>`,
      });
      emailResults.user = userMail.detail;
    } else {
      emailResults.user = "smtp:skipped — no member email";
    }

    if (specialistEmail.includes("@")) {
      const coachMail = await sendTransactionalEmail({
        to: specialistEmail,
        subject: `1:1 session canceled — ${memberName}`,
        text: `A 1:1 coaching session was canceled.\n\nMember: ${memberName}\nWhen: ${whenLabelCoach}\n`,
        html: `<p>A 1:1 coaching session was canceled.</p><p><strong>Member:</strong> ${memberName}</p><p><strong>When:</strong> ${whenLabelCoach}</p>`,
      });
      emailResults.specialist = coachMail.detail;
    } else {
      emailResults.specialist = "smtp:skipped — no specialist email";
    }
  }

  return jsonResponse(200, {
    ok: true,
    bookingId,
    refunded,
    refundedAmount,
    balance: row.balance,
    google: googleDelete.detail,
    email: emailResults,
  });
});
