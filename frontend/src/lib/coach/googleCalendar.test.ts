import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const MODULE_PATH = "../../../../supabase/functions/_shared/googleCalendar.ts";

const CONFIGURED = {
  GOOGLE_OAUTH_CLIENT_ID: "client-id",
  GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
  GOOGLE_OAUTH_REFRESH_TOKEN: "refresh-token",
  GOOGLE_CALENDAR_ID: "coaching@example.com",
};

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_ID_ENCODED = encodeURIComponent(CONFIGURED.GOOGLE_CALENDAR_ID);

type Handler = (url: string, init?: RequestInit) => Response;

let calls: Array<{ url: string; init?: RequestInit }> = [];

function stubEnv(vars: Record<string, string | undefined>): void {
  (globalThis as unknown as { Deno: unknown }).Deno = {
    env: { get: (key: string) => vars[key] },
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Answers the token endpoint by default; `handler` covers Calendar calls. */
function stubFetch(handler: Handler, tokenResponse?: Response): void {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      calls.push({ url, init });
      if (url === TOKEN_URL) {
        return Promise.resolve(
          tokenResponse ?? json({ access_token: "at-1", expires_in: 3600 }),
        );
      }
      return Promise.resolve(handler(url, init));
    }),
  );
}

async function loadModule() {
  vi.resetModules();
  return await import(MODULE_PATH);
}

function bodyOf(index: number): Record<string, unknown> {
  return JSON.parse(String(calls[index].init?.body)) as Record<string, unknown>;
}

const baseEventParams = {
  summary: "Uncloud360 1:1 coaching — Ann",
  description: "session",
  startsAt: "2026-10-01T10:00:00.000Z",
  durationMinutes: 30,
  attendeeEmails: ["member@example.com", "coach@example.com"],
};

beforeEach(() => {
  calls = [];
  stubEnv(CONFIGURED);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (globalThis as unknown as { Deno?: unknown }).Deno;
});

describe("googleCalendar — missing configuration", () => {
  beforeEach(() => {
    stubEnv({});
  });

  it("skips event creation without calling Google", async () => {
    stubFetch(() => json({}));
    const { createGoogleMeetEvent } = await loadModule();

    const result = await createGoogleMeetEvent(baseEventParams);

    expect(result.meetLink).toBeNull();
    expect(result.eventId).toBeNull();
    expect(result.detail).toContain("google:skipped");
    expect(calls).toHaveLength(0);
  });

  it("reports delete as ok so an unconfigured environment can still cancel", async () => {
    stubFetch(() => json({}));
    const { deleteGoogleCalendarEvent } = await loadModule();

    const result = await deleteGoogleCalendarEvent("evt-1");

    expect(result.ok).toBe(true);
    expect(result.detail).toContain("google:skipped");
    expect(calls).toHaveLength(0);
  });

  it("reports lookup as error, never as absent", async () => {
    stubFetch(() => json({}));
    const { findGoogleEventByKey } = await loadModule();

    const result = await findGoogleEventByKey("coach-1");

    // "absent" would let the caller create a duplicate event.
    expect(result.status).toBe("error");
  });
});

describe("googleCalendar — access token", () => {
  it("reuses a cached token across calls", async () => {
    stubFetch(() => json({ id: "evt-1", hangoutLink: "https://meet.google.com/aaa" }));
    const { createGoogleMeetEvent } = await loadModule();

    await createGoogleMeetEvent(baseEventParams);
    await createGoogleMeetEvent(baseEventParams);

    const tokenCalls = calls.filter((call) => call.url === TOKEN_URL);
    expect(tokenCalls).toHaveLength(1);
  });

  it("surfaces invalid_grant as a revoked-token detail", async () => {
    stubFetch(
      () => json({}),
      json({ error: "invalid_grant" }, 400),
    );
    const { createGoogleMeetEvent, REFRESH_TOKEN_REVOKED_DETAIL } = await loadModule();

    const result = await createGoogleMeetEvent(baseEventParams);

    expect(result.detail).toBe(REFRESH_TOKEN_REVOKED_DETAIL);
    expect(result.detail).not.toContain("google_error");
  });

  it("reports other token failures as a generic google error", async () => {
    stubFetch(
      () => json({}),
      json({ error: "invalid_client" }, 401),
    );
    const { createGoogleMeetEvent } = await loadModule();

    const result = await createGoogleMeetEvent(baseEventParams);

    expect(result.detail).toContain("google_error");
    expect(result.detail).toContain("invalid_client");
  });
});

describe("createGoogleMeetEvent", () => {
  it("sends the session key as both conference requestId and event tag", async () => {
    stubFetch(() => json({ id: "evt-1", hangoutLink: "https://meet.google.com/aaa" }));
    const { createGoogleMeetEvent } = await loadModule();

    await createGoogleMeetEvent({ ...baseEventParams, sessionKey: "coach-42" });

    const body = bodyOf(1);
    expect(
      (body.conferenceData as { createRequest: { requestId: string } }).createRequest.requestId,
    ).toBe("coach-42");
    expect(body.extendedProperties).toEqual({ private: { unclouded: "coach-42" } });
  });

  it("omits the event tag when no session key is given", async () => {
    stubFetch(() => json({ id: "evt-1", hangoutLink: "https://meet.google.com/aaa" }));
    const { createGoogleMeetEvent } = await loadModule();

    await createGoogleMeetEvent(baseEventParams);

    expect(bodyOf(1).extendedProperties).toBeUndefined();
  });

  it("requests conference data and notifies attendees", async () => {
    stubFetch(() => json({ id: "evt-1", hangoutLink: "https://meet.google.com/aaa" }));
    const { createGoogleMeetEvent } = await loadModule();

    await createGoogleMeetEvent(baseEventParams);

    expect(calls[1].url).toContain(`/calendars/${CALENDAR_ID_ENCODED}/events`);
    expect(calls[1].url).toContain("conferenceDataVersion=1");
    expect(calls[1].url).toContain("sendUpdates=all");
  });

  it("drops attendee entries that are not email addresses", async () => {
    stubFetch(() => json({ id: "evt-1", hangoutLink: "https://meet.google.com/aaa" }));
    const { createGoogleMeetEvent } = await loadModule();

    await createGoogleMeetEvent({
      ...baseEventParams,
      attendeeEmails: ["member@example.com", "", "not-an-email"],
    });

    expect(bodyOf(1).attendees).toEqual([{ email: "member@example.com" }]);
  });

  it("derives the end time from the duration", async () => {
    stubFetch(() => json({ id: "evt-1", hangoutLink: "https://meet.google.com/aaa" }));
    const { createGoogleMeetEvent } = await loadModule();

    await createGoogleMeetEvent({ ...baseEventParams, durationMinutes: 45 });

    const body = bodyOf(1);
    expect((body.start as { dateTime: string }).dateTime).toBe("2026-10-01T10:00:00.000Z");
    expect((body.end as { dateTime: string }).dateTime).toBe("2026-10-01T10:45:00.000Z");
  });

  it("falls back to the video entry point when hangoutLink is absent", async () => {
    stubFetch(() =>
      json({
        id: "evt-2",
        conferenceData: {
          entryPoints: [
            { entryPointType: "phone", uri: "tel:+123" },
            { entryPointType: "video", uri: "https://meet.google.com/bbb" },
          ],
        },
      }),
    );
    const { createGoogleMeetEvent } = await loadModule();

    const result = await createGoogleMeetEvent(baseEventParams);

    expect(result.meetLink).toBe("https://meet.google.com/bbb");
    expect(result.detail).toBe("google:created");
  });

  it("flags an event that came back without any Meet room", async () => {
    stubFetch(() => json({ id: "evt-3" }));
    const { createGoogleMeetEvent } = await loadModule();

    const result = await createGoogleMeetEvent(baseEventParams);

    expect(result.eventId).toBe("evt-3");
    expect(result.meetLink).toBeNull();
    expect(result.detail).toBe("google:created_without_meet_link");
  });

  it("reports the status and body when Google rejects the insert", async () => {
    stubFetch(() => new Response("forbiddenForServiceAccounts", { status: 403 }));
    const { createGoogleMeetEvent } = await loadModule();

    const result = await createGoogleMeetEvent(baseEventParams);

    expect(result.eventId).toBeNull();
    expect(result.detail).toContain("403");
    expect(result.detail).toContain("forbiddenForServiceAccounts");
  });
});

describe("deleteGoogleCalendarEvent", () => {
  it("skips when there is no event id", async () => {
    stubFetch(() => json({}));
    const { deleteGoogleCalendarEvent } = await loadModule();

    const result = await deleteGoogleCalendarEvent(null);

    expect(result).toEqual({ ok: true, detail: "google:skipped — no event id" });
    expect(calls).toHaveLength(0);
  });

  it("treats an already-deleted event as success", async () => {
    stubFetch(() => new Response(null, { status: 410 }));
    const { deleteGoogleCalendarEvent } = await loadModule();

    const result = await deleteGoogleCalendarEvent("evt-1");

    expect(result).toEqual({ ok: true, detail: "google:already_deleted" });
  });

  it("reports a real failure so the caller can surface it", async () => {
    stubFetch(() => new Response("boom", { status: 500 }));
    const { deleteGoogleCalendarEvent } = await loadModule();

    const result = await deleteGoogleCalendarEvent("evt-1");

    expect(result.ok).toBe(false);
    expect(result.detail).toContain("500");
  });
});

describe("findGoogleEventByKey", () => {
  it("queries by the private extended property", async () => {
    stubFetch(() => json({ items: [] }));
    const { findGoogleEventByKey } = await loadModule();

    await findGoogleEventByKey("coach-42");

    const query = decodeURIComponent(calls[1].url);
    expect(query).toContain("privateExtendedProperty=unclouded=coach-42");
    expect(calls[1].url).toContain("showDeleted=false");
  });

  it("returns the event id and Meet link when found", async () => {
    stubFetch(() =>
      json({ items: [{ id: "evt-9", hangoutLink: "https://meet.google.com/ccc" }] }),
    );
    const { findGoogleEventByKey } = await loadModule();

    const result = await findGoogleEventByKey("coach-42");

    expect(result).toEqual({
      status: "found",
      eventId: "evt-9",
      meetLink: "https://meet.google.com/ccc",
    });
  });

  it("ignores cancelled events", async () => {
    stubFetch(() => json({ items: [{ id: "evt-9", status: "cancelled" }] }));
    const { findGoogleEventByKey } = await loadModule();

    const result = await findGoogleEventByKey("coach-42");

    expect(result.status).toBe("absent");
  });

  it("reports a failed lookup as error rather than absent", async () => {
    stubFetch(() => new Response("rate limited", { status: 429 }));
    const { findGoogleEventByKey } = await loadModule();

    const result = await findGoogleEventByKey("coach-42");

    // Reading a failure as "absent" would create a duplicate event.
    expect(result.status).toBe("error");
    expect(result.status === "error" && result.detail).toContain("429");
  });

  it("treats a blank key as absent without calling Google", async () => {
    stubFetch(() => json({ items: [] }));
    const { findGoogleEventByKey } = await loadModule();

    const result = await findGoogleEventByKey("   ");

    expect(result.status).toBe("absent");
    expect(calls).toHaveLength(0);
  });
});

describe("updateGoogleCalendarEventAttendees", () => {
  it("patches attendees and notifies everyone", async () => {
    stubFetch(() => json({ id: "evt-1" }));
    const { updateGoogleCalendarEventAttendees } = await loadModule();

    const result = await updateGoogleCalendarEventAttendees({
      eventId: "evt-1",
      attendeeEmails: ["member@example.com", "new-coach@example.com"],
    });

    expect(result).toEqual({ ok: true, detail: "google:attendees_updated" });
    expect(calls[1].init?.method).toBe("PATCH");
    expect(calls[1].url).toContain("sendUpdates=all");
    expect(bodyOf(1).attendees).toEqual([
      { email: "member@example.com" },
      { email: "new-coach@example.com" },
    ]);
  });

  it("leaves summary and description untouched when blank", async () => {
    stubFetch(() => json({ id: "evt-1" }));
    const { updateGoogleCalendarEventAttendees } = await loadModule();

    await updateGoogleCalendarEventAttendees({
      eventId: "evt-1",
      attendeeEmails: ["member@example.com"],
      summary: "   ",
      description: "",
    });

    const body = bodyOf(1);
    expect(body.summary).toBeUndefined();
    expect(body.description).toBeUndefined();
  });

  it("skips when there is no event id", async () => {
    stubFetch(() => json({}));
    const { updateGoogleCalendarEventAttendees } = await loadModule();

    const result = await updateGoogleCalendarEventAttendees({
      eventId: "  ",
      attendeeEmails: ["member@example.com"],
    });

    expect(result).toEqual({ ok: true, detail: "google:skipped — no event id" });
    expect(calls).toHaveLength(0);
  });
});
