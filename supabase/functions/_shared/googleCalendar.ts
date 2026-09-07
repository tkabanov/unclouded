/**
 * Google Calendar + Meet helpers for NCLDD-31 coaching bookings.
 *
 * Auth is a user-delegated OAuth refresh token, not a service account: Meet
 * conferences and attendee invites both require a real Workspace user, and org
 * policy `iam.managed.disableServiceAccountKeyCreation` blocks SA keys anyway.
 * Mint the refresh token once with `scripts/google_oauth_refresh_token.mjs`.
 *
 * Secrets (optional — callers skip cleanly when unset):
 * - GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET — OAuth client
 * - GOOGLE_OAUTH_REFRESH_TOKEN — offline consent from the coaching mailbox
 * - GOOGLE_CALENDAR_ID — calendar id (usually that mailbox address)
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

export type GoogleCalendarUpdateResult = {
  ok: boolean;
  detail: string;
};

type GoogleAuth = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendarId: string;
};

const TOKEN_URI = "https://oauth2.googleapis.com/token";

const SKIPPED_DETAIL = "google:skipped — GOOGLE_OAUTH_* or GOOGLE_CALENDAR_ID not set";

/** Private extended-property name carrying our per-session key on the event. */
const SESSION_KEY_PROPERTY = "unclouded";

/**
 * `invalid_grant` means the refresh token is dead (mailbox password change,
 * admin revoke, or six months unused) and no retry will fix it — surface it as
 * its own detail so ops re-runs the consent script instead of chasing quota.
 */
export const REFRESH_TOKEN_REVOKED_DETAIL = "google:refresh_token_revoked";

function readGoogleAuth(): GoogleAuth | null {
  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")?.trim();
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")?.trim();
  const refreshToken = Deno.env.get("GOOGLE_OAUTH_REFRESH_TOKEN")?.trim();
  const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID")?.trim();
  if (!clientId || !clientSecret || !refreshToken || !calendarId) return null;
  return { clientId, clientSecret, refreshToken, calendarId };
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function googleAccessToken(auth: GoogleAuth): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const res = await fetch(TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: auth.clientId,
      client_secret: auth.clientSecret,
      refresh_token: auth.refreshToken,
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (!res.ok) {
    if (payload.error === "invalid_grant") {
      throw new Error(REFRESH_TOKEN_REVOKED_DETAIL);
    }
    throw new Error(`token_exchange_${res.status}_${payload.error ?? "unknown"}`);
  }
  if (!payload.access_token) throw new Error("token_missing");

  cachedToken = {
    token: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
  };
  return cachedToken.token;
}

function errorDetail(err: unknown): string {
  const message = err instanceof Error ? err.message : "unknown";
  return message === REFRESH_TOKEN_REVOKED_DETAIL ? message : `google_error: ${message}`;
}

export type GoogleEventLookupResult =
  | { status: "found"; eventId: string; meetLink: string | null }
  | { status: "absent" }
  | { status: "error"; detail: string };

/**
 * Find an event previously created for `sessionKey`. Lets a retry adopt an
 * event that Google accepted but whose ids never reached our DB. The `error`
 * status is distinct from `absent` on purpose: a failed lookup must not be read
 * as "no event exists", or the caller would create a duplicate.
 */
export async function findGoogleEventByKey(
  sessionKey: string,
): Promise<GoogleEventLookupResult> {
  const key = sessionKey.trim();
  if (!key) return { status: "absent" };

  const auth = readGoogleAuth();
  if (!auth) return { status: "error", detail: SKIPPED_DETAIL };

  try {
    const accessToken = await googleAccessToken(auth);
    const query = new URLSearchParams({
      privateExtendedProperty: `${SESSION_KEY_PROPERTY}=${key}`,
      maxResults: "1",
      showDeleted: "false",
    });

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events?${query.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!res.ok) {
      const text = await res.text();
      return {
        status: "error",
        detail: `google_error: ${res.status} ${text.slice(0, 400)}`,
      };
    }

    const payload = (await res.json()) as {
      items?: Array<{
        id?: string;
        status?: string;
        hangoutLink?: string;
        conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
      }>;
    };

    const event = payload.items?.find(
      (item) => typeof item.id === "string" && item.status !== "cancelled",
    );
    if (!event?.id) return { status: "absent" };

    const meetFromEntry = event.conferenceData?.entryPoints?.find(
      (entry) => entry.entryPointType === "video",
    )?.uri;

    return {
      status: "found",
      eventId: event.id,
      meetLink: event.hangoutLink?.trim() || meetFromEntry?.trim() || null,
    };
  } catch (err) {
    return { status: "error", detail: errorDetail(err) };
  }
}

export async function createGoogleMeetEvent(params: {
  summary: string;
  description: string;
  startsAt: string;
  durationMinutes: number;
  attendeeEmails: string[];
  /**
   * Stable per-session key (`coach-<bookingId>` / `group-<sessionId>`). Doubles
   * as the conference requestId and is stamped onto the event, so a retry after
   * a failed DB write can adopt the orphaned event via findGoogleEventByKey
   * instead of creating a second one.
   */
  sessionKey?: string;
}): Promise<GoogleMeetCreateResult> {
  const auth = readGoogleAuth();
  if (!auth) {
    return { meetLink: null, eventId: null, detail: SKIPPED_DETAIL };
  }

  try {
    const accessToken = await googleAccessToken(auth);
    const start = new Date(params.startsAt);
    const end = new Date(start.getTime() + params.durationMinutes * 60_000);
    const sessionKey = params.sessionKey?.trim() || "";

    const body = {
      summary: params.summary,
      description: params.description,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      attendees: params.attendeeEmails
        .filter((email) => email.includes("@"))
        .map((email) => ({ email })),
      extendedProperties: sessionKey
        ? { private: { [SESSION_KEY_PROPERTY]: sessionKey } }
        : undefined,
      conferenceData: {
        createRequest: {
          requestId: sessionKey || crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
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
    return { meetLink: null, eventId: null, detail: errorDetail(err) };
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

  const auth = readGoogleAuth();
  if (!auth) {
    return { ok: true, detail: SKIPPED_DETAIL };
  }

  try {
    const accessToken = await googleAccessToken(auth);
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events/${encodeURIComponent(trimmedId)}?sendUpdates=all`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    // 404 / 410: already gone — treat as success for idempotent cancel.
    if (res.ok || res.status === 204 || res.status === 404 || res.status === 410) {
      return {
        ok: true,
        detail:
          res.status === 404 || res.status === 410
            ? "google:already_deleted"
            : "google:deleted",
      };
    }

    const text = await res.text();
    return {
      ok: false,
      detail: `google_error: ${res.status} ${text.slice(0, 400)}`,
    };
  } catch (err) {
    return { ok: false, detail: errorDetail(err) };
  }
}

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

  const auth = readGoogleAuth();
  if (!auth) {
    return { ok: true, detail: SKIPPED_DETAIL };
  }

  try {
    const accessToken = await googleAccessToken(auth);
    const attendees = params.attendeeEmails
      .filter((email) => email.includes("@"))
      .map((email) => ({ email }));

    const body: Record<string, unknown> = { attendees };
    if (params.summary?.trim()) body.summary = params.summary.trim();
    if (params.description?.trim()) body.description = params.description.trim();

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events/${encodeURIComponent(trimmedId)}?sendUpdates=all&conferenceDataVersion=1`,
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
    return { ok: false, detail: errorDetail(err) };
  }
}
