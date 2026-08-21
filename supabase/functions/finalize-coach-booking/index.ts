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

async function createGoogleMeetEvent(params: {
  summary: string;
  description: string;
  startsAt: string;
  durationMinutes: number;
  attendeeEmails: string[];
}): Promise<{ meetLink: string | null; eventId: string | null; detail: string }> {
  const rawJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON")?.trim();
  const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID")?.trim();
  if (!rawJson || !calendarId) {
    return {
      meetLink: null,
      eventId: null,
      detail: "google:skipped — GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_CALENDAR_ID not set",
    };
  }

  let sa: {
    client_email?: string;
    private_key?: string;
    token_uri?: string;
  };
  try {
    sa = JSON.parse(rawJson) as typeof sa;
  } catch {
    return { meetLink: null, eventId: null, detail: "google:invalid_service_account_json" };
  }

  if (!sa.client_email || !sa.private_key) {
    return { meetLink: null, eventId: null, detail: "google:incomplete_service_account" };
  }

  try {
    const accessToken = await googleServiceAccountAccessToken(sa);
    const start = new Date(params.startsAt);
    const end = new Date(start.getTime() + params.durationMinutes * 60_000);
    const requestId = crypto.randomUUID();

    const body = {
      summary: params.summary,
      description: params.description,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      attendees: params.attendeeEmails
        .filter((email) => email.includes("@"))
        .map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return {
        meetLink: null,
        eventId: null,
        detail: `google_error: ${res.status} ${text.slice(0, 400)}`,
      };
    }

    const event = (await res.json()) as {
      id?: string;
      hangoutLink?: string;
      conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
    };

    const meetFromEntry = event.conferenceData?.entryPoints?.find(
      (entry) => entry.entryPointType === "video",
    )?.uri;
    const meetLink = event.hangoutLink?.trim() || meetFromEntry?.trim() || null;

    return {
      meetLink,
      eventId: typeof event.id === "string" ? event.id : null,
      detail: meetLink ? "google:created" : "google:created_without_meet_link",
    };
  } catch (err) {
    return {
      meetLink: null,
      eventId: null,
      detail: `google_error: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}

async function googleServiceAccountAccessToken(sa: {
  client_email?: string;
  private_key?: string;
  token_uri?: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: sa.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encode = (value: unknown) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const unsigned = `${encode(header)}.${encode(claim)}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key!),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${unsigned}.${sigB64}`;
  const tokenRes = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`token_exchange_${tokenRes.status}`);
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) throw new Error("token_missing");
  return tokenJson.access_token;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
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
      "id, userId, scheduledAt, status, specialistId, assignedCoachEmail, durationMinutes, meetLink, googleEventId",
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
    .select("firstName, email")
    .eq("id", booking.userId)
    .maybeSingle();

  const memberName =
    (typeof member?.firstName === "string" && member.firstName.trim()) || "Member";
  const memberEmail =
    (typeof member?.email === "string" && member.email.trim()) ||
    auth.user.email ||
    "";
  const specialistEmail =
    typeof booking.assignedCoachEmail === "string"
      ? booking.assignedCoachEmail.trim()
      : "";

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

  const whenLabel = formatSessionWhen(booking.scheduledAt, durationMinutes);
  const meetLine = meetLink
    ? `Google Meet: ${meetLink}`
    : "Google Meet link will follow shortly.";

  const sendgrid = readSendGridEnv();
  const emailResults: Record<string, string> = {};

  if (!isSendGridConfigured(sendgrid)) {
    emailResults.user = "smtp:skipped";
    emailResults.specialist = "smtp:skipped";
  } else {
    if (memberEmail.includes("@")) {
      const userMail = await sendTransactionalEmail({
        to: memberEmail,
        subject: "Your Uncloud360 1:1 session is confirmed",
        text: `Your coaching session is confirmed.\n\nWhen: ${whenLabel}\n${meetLine}\n`,
        html: `<p>Your coaching session is confirmed.</p><p><strong>When:</strong> ${whenLabel}</p><p>${
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
        text: `A 1:1 coaching session is confirmed.\n\nMember: ${memberName}\nWhen: ${whenLabel}\n${meetLine}\n`,
        html: `<p>A 1:1 coaching session is confirmed.</p><p><strong>Member:</strong> ${memberName}</p><p><strong>When:</strong> ${whenLabel}</p><p>${
          meetLink
            ? `<a href="${meetLink}">Join Google Meet</a>`
            : "Google Meet link will follow shortly."
        }</p>`,
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
