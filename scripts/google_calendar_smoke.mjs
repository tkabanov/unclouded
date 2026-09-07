/**
 * End-to-end check of the Google Calendar + Meet integration credentials.
 *
 * Exercises the two things a bare service account cannot do — inviting an
 * attendee and provisioning a Meet room — then deletes the test event. Run this
 * before touching booking flows so a failure points at credentials rather than
 * at product code.
 *
 * Usage (same values you set as Supabase secrets):
 *   GOOGLE_OAUTH_CLIENT_ID=... \
 *   GOOGLE_OAUTH_CLIENT_SECRET=... \
 *   GOOGLE_OAUTH_REFRESH_TOKEN=... \
 *   GOOGLE_CALENDAR_ID=coaching@rapidevelopers.com \
 *   node scripts/google_calendar_smoke.mjs
 *
 * Optional:
 *   SMOKE_ATTENDEE=you@rapidevelopers.com   # defaults to GOOGLE_CALENDAR_ID
 *   SMOKE_KEEP=1                            # leave the event for inspection
 */
const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
const REFRESH_TOKEN = process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim();
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID?.trim();
const ATTENDEE = (process.env.SMOKE_ATTENDEE ?? CALENDAR_ID ?? "").trim();
const KEEP = process.env.SMOKE_KEEP === "1";

const missing = [
  ["GOOGLE_OAUTH_CLIENT_ID", CLIENT_ID],
  ["GOOGLE_OAUTH_CLIENT_SECRET", CLIENT_SECRET],
  ["GOOGLE_OAUTH_REFRESH_TOKEN", REFRESH_TOKEN],
  ["GOOGLE_CALENDAR_ID", CALENDAR_ID],
]
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missing.length > 0) {
  console.error(`Missing: ${missing.join(", ")}`);
  process.exit(1);
}

async function accessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
    }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (payload.error === "invalid_grant") {
      throw new Error(
        "invalid_grant — the refresh token is dead (mailbox password change, admin\n" +
          "revoke, or six months unused). Re-run scripts/google_oauth_refresh_token.mjs.",
      );
    }
    throw new Error(`Token refresh failed (${res.status}): ${payload.error ?? "unknown"}`);
  }
  return payload.access_token;
}

async function createEvent(token) {
  const start = new Date(Date.now() + 60 * 60 * 1000);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?conferenceDataVersion=1&sendUpdates=none`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: "Uncloud360 integration smoke test — safe to delete",
        description: "Created by scripts/google_calendar_smoke.mjs.",
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        attendees: ATTENDEE.includes("@") ? [{ email: ATTENDEE }] : [],
        conferenceData: {
          createRequest: {
            requestId: `smoke-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    },
  );

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = payload.error?.errors?.[0]?.reason ?? "";
    if (reason === "forbiddenForServiceAccounts") {
      throw new Error(
        "forbiddenForServiceAccounts — these credentials still belong to a service\n" +
          "account. The refresh token must come from a real Workspace user.",
      );
    }
    if (res.status === 404) {
      throw new Error(
        `Calendar ${CALENDAR_ID} not found or not writable by the consented account.\n` +
          "Check GOOGLE_CALENDAR_ID, or share the calendar with Make changes to events.",
      );
    }
    throw new Error(
      `Event create failed (${res.status}): ${payload.error?.message ?? JSON.stringify(payload).slice(0, 300)}`,
    );
  }
  return payload;
}

async function deleteEvent(token, eventId) {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(eventId)}?sendUpdates=none`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  );
  return res.ok || res.status === 204 || res.status === 404 || res.status === 410;
}

async function main() {
  console.log("1/4  Refreshing access token …");
  const token = await accessToken();
  console.log("     ok\n");

  console.log(`2/4  Creating test event on ${CALENDAR_ID} …`);
  const event = await createEvent(token);
  console.log(`     ok — event id ${event.id}\n`);

  console.log("3/4  Checking results …");
  const meetLink =
    event.hangoutLink ??
    event.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ??
    null;
  const attendees = (event.attendees ?? []).map((a) => a.email);

  const meetOk = Boolean(meetLink);
  const attendeeOk = !ATTENDEE.includes("@") || attendees.includes(ATTENDEE);

  console.log(`     Meet room:  ${meetOk ? meetLink : "MISSING"}`);
  console.log(
    `     Attendees:  ${attendees.length > 0 ? attendees.join(", ") : "none echoed back"}\n`,
  );

  if (KEEP) {
    console.log(`4/4  SMOKE_KEEP=1 — leaving event ${event.id} in place\n`);
  } else {
    console.log("4/4  Deleting test event …");
    const deleted = await deleteEvent(token, event.id);
    console.log(`     ${deleted ? "ok" : "FAILED — remove it by hand"}\n`);
  }

  if (meetOk && attendeeOk) {
    console.log("PASS — credentials are good. Meet provisioning and invites both work.");
    process.exit(0);
  }

  if (!meetOk) {
    console.error(
      "FAIL — event created but no Meet room. The consented account is likely not a\n" +
        "Workspace user, or Meet is disabled for its org unit (Admin console -> Apps ->\n" +
        "Google Workspace -> Google Meet).",
    );
  }
  if (!attendeeOk) {
    console.error(
      `FAIL — attendee ${ATTENDEE} was not attached. Check Calendar external sharing\n` +
        "settings if the address is outside the domain.",
    );
  }
  process.exit(1);
}

main().catch((err) => {
  console.error(`\nFAIL — ${err.message}`);
  process.exit(1);
});
