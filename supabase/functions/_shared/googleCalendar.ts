/**
 * Google Calendar + Meet helpers for NCLDD-31 coaching bookings.
 *
 * Secrets (optional — callers skip cleanly when unset):
 * - GOOGLE_SERVICE_ACCOUNT_JSON — full service-account JSON (Calendar scope)
 * - GOOGLE_CALENDAR_ID — calendar id (often the shared coaching calendar email)
 */

export type GoogleMeetCreateResult = {
  meetLink: string | null;
  eventId: string | null;
  detail: string;
};

export type GoogleCalendarDeleteResult = {
  ok: boolean;
  detail: string;
};

type ServiceAccount = {
  client_email?: string;
  private_key?: string;
  token_uri?: string;
};

function readGoogleEnv(): { rawJson: string | null; calendarId: string | null } {
  return {
    rawJson: Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON")?.trim() || null,
    calendarId: Deno.env.get("GOOGLE_CALENDAR_ID")?.trim() || null,
  };
}

function parseServiceAccount(rawJson: string): ServiceAccount | { error: string } {
  let sa: ServiceAccount;
  try {
    sa = JSON.parse(rawJson) as ServiceAccount;
  } catch {
    return { error: "google:invalid_service_account_json" };
  }
  if (!sa.client_email || !sa.private_key) {
    return { error: "google:incomplete_service_account" };
  }
  return sa;
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

async function googleServiceAccountAccessToken(sa: ServiceAccount): Promise<string> {
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

export async function createGoogleMeetEvent(params: {
  summary: string;
  description: string;
  startsAt: string;
  durationMinutes: number;
  attendeeEmails: string[];
}): Promise<GoogleMeetCreateResult> {
  const { rawJson, calendarId } = readGoogleEnv();
  if (!rawJson || !calendarId) {
    return {
      meetLink: null,
      eventId: null,
      detail: "google:skipped — GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_CALENDAR_ID not set",
    };
  }

  const parsed = parseServiceAccount(rawJson);
  if ("error" in parsed) {
    return { meetLink: null, eventId: null, detail: parsed.error };
  }

  try {
    const accessToken = await googleServiceAccountAccessToken(parsed);
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

/**
 * Delete a Calendar event (and its Meet conference). Skips when secrets or eventId missing.
 */
export async function deleteGoogleCalendarEvent(
  eventId: string | null | undefined,
): Promise<GoogleCalendarDeleteResult> {
  const trimmedId = typeof eventId === "string" ? eventId.trim() : "";
  if (!trimmedId) {
    return { ok: true, detail: "google:skipped — no event id" };
  }

  const { rawJson, calendarId } = readGoogleEnv();
  if (!rawJson || !calendarId) {
    return {
      ok: true,
      detail: "google:skipped — GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_CALENDAR_ID not set",
    };
  }

  const parsed = parseServiceAccount(rawJson);
  if ("error" in parsed) {
    return { ok: false, detail: parsed.error };
  }

  try {
    const accessToken = await googleServiceAccountAccessToken(parsed);
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(trimmedId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    // 404 / 410: already gone — treat as success for idempotent cancel.
    if (res.ok || res.status === 204 || res.status === 404 || res.status === 410) {
      return {
        ok: true,
        detail: res.status === 404 || res.status === 410 ? "google:already_deleted" : "google:deleted",
      };
    }

    const text = await res.text();
    return {
      ok: false,
      detail: `google_error: ${res.status} ${text.slice(0, 400)}`,
    };
  } catch (err) {
    return {
      ok: false,
      detail: `google_error: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}

export type GoogleCalendarUpdateResult = {
  ok: boolean;
  detail: string;
};

/**
 * PATCH attendees (and optional summary) on an existing event; sendUpdates=all
 * so Calendar invites/cancellations go to attendees (CL-3 reassignment).
 */
export async function updateGoogleCalendarEventAttendees(params: {
  eventId: string | null | undefined;
  attendeeEmails: string[];
  summary?: string;
  description?: string;
}): Promise<GoogleCalendarUpdateResult> {
  const trimmedId = typeof params.eventId === "string" ? params.eventId.trim() : "";
  if (!trimmedId) {
    return { ok: true, detail: "google:skipped — no event id" };
  }

  const { rawJson, calendarId } = readGoogleEnv();
  if (!rawJson || !calendarId) {
    return {
      ok: true,
      detail: "google:skipped — GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_CALENDAR_ID not set",
    };
  }

  const parsed = parseServiceAccount(rawJson);
  if ("error" in parsed) {
    return { ok: false, detail: parsed.error };
  }

  try {
    const accessToken = await googleServiceAccountAccessToken(parsed);
    const attendees = params.attendeeEmails
      .filter((email) => email.includes("@"))
      .map((email) => ({ email }));

    const body: Record<string, unknown> = { attendees };
    if (params.summary?.trim()) body.summary = params.summary.trim();
    if (params.description?.trim()) body.description = params.description.trim();

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(trimmedId)}?sendUpdates=all&conferenceDataVersion=1`,
      {
        method: "PATCH",
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
        ok: false,
        detail: `google_error: ${res.status} ${text.slice(0, 400)}`,
      };
    }

    return { ok: true, detail: "google:attendees_updated" };
  } catch (err) {
    return {
      ok: false,
      detail: `google_error: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}
