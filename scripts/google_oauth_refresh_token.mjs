/**
 * One-time consent flow that mints the Google Calendar refresh token used by
 * the coaching booking edge functions (finalize-coach-booking,
 * finalize-group-sessions, cancel-coach-booking, reassign-coach-booking).
 *
 * Why OAuth and not a service account: Meet conference creation and attendee
 * invites both require a real Workspace user, and org policy
 * `iam.managed.disableServiceAccountKeyCreation` blocks service account keys.
 *
 * Prerequisites in Google Cloud (same project, Calendar API enabled):
 *   1. OAuth consent screen -> User type INTERNAL. External + Testing expires
 *      refresh tokens every 7 days, which will silently break the integration.
 *   2. Credentials -> Create OAuth client ID -> type "Desktop app" (loopback
 *      redirects are allowed automatically). For a "Web application" client,
 *      register http://localhost:53682 as an authorized redirect URI.
 *
 * Usage — sign in as the coaching mailbox when the browser opens:
 *   GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... node scripts/google_oauth_refresh_token.mjs
 *
 * Optional:
 *   OAUTH_PORT=53682
 */
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
const PORT = Number(process.env.OAUTH_PORT ?? 53682);
const SCOPE = "https://www.googleapis.com/auth/calendar";
const PROJECT_REF = "szkextipgpupqoppccoy";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing GOOGLE_OAUTH_CLIENT_ID and/or GOOGLE_OAUTH_CLIENT_SECRET");
  process.exit(1);
}

const REDIRECT_URI = `http://localhost:${PORT}`;
const state = randomBytes(16).toString("hex");

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  response_type: "code",
  scope: SCOPE,
  access_type: "offline",
  prompt: "consent",
  state,
}).toString()}`;

async function exchangeCode(code) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Token exchange failed (${res.status}): ${payload.error ?? "unknown"} ${payload.error_description ?? ""}`,
    );
  }
  return payload;
}

/** Confirms which account consented and yields the exact GOOGLE_CALENDAR_ID. */
async function readPrimaryCalendarId(accessToken) {
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const payload = await res.json().catch(() => ({}));
  return typeof payload.id === "string" ? payload.id : null;
}

function reply(res, status, message) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!doctype html><meta charset="utf-8"><body style="font:16px system-ui;padding:40px">${message}</body>`);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  if (url.pathname !== "/") {
    reply(res, 404, "Not found");
    return;
  }

  const error = url.searchParams.get("error");
  if (error) {
    reply(res, 400, `Consent denied: ${error}. You can close this tab.`);
    console.error(`\nConsent denied: ${error}`);
    server.close();
    process.exit(1);
  }

  const code = url.searchParams.get("code");
  if (!code) {
    reply(res, 400, "Missing authorization code.");
    return;
  }
  if (url.searchParams.get("state") !== state) {
    reply(res, 400, "State mismatch — aborted.");
    console.error("\nState mismatch — possible CSRF, aborted.");
    server.close();
    process.exit(1);
  }

  try {
    const tokens = await exchangeCode(code);

    if (!tokens.refresh_token) {
      reply(res, 400, "Google returned no refresh token. See terminal.");
      console.error(
        "\nNo refresh_token in the response. This happens when the mailbox already\n" +
          "granted this client before. Revoke it at myaccount.google.com/permissions\n" +
          "and re-run, or keep the refresh token you saved previously.",
      );
      server.close();
      process.exit(1);
    }

    const calendarId = await readPrimaryCalendarId(tokens.access_token);

    reply(res, 200, "Done. Refresh token is in your terminal — you can close this tab.");

    console.log("\n=== Consent granted ===\n");
    if (calendarId) {
      console.log(`Consented account / primary calendar: ${calendarId}\n`);
    }
    console.log("Set these as Supabase secrets (do not commit or paste them anywhere):\n");
    console.log(
      `npx supabase secrets set GOOGLE_OAUTH_CLIENT_ID="${CLIENT_ID}" --project-ref ${PROJECT_REF}`,
    );
    console.log(
      `npx supabase secrets set GOOGLE_OAUTH_CLIENT_SECRET="${CLIENT_SECRET}" --project-ref ${PROJECT_REF}`,
    );
    console.log(
      `npx supabase secrets set GOOGLE_OAUTH_REFRESH_TOKEN="${tokens.refresh_token}" --project-ref ${PROJECT_REF}`,
    );
    console.log(
      `npx supabase secrets set GOOGLE_CALENDAR_ID="${calendarId ?? "coaching@rapidevelopers.com"}" --project-ref ${PROJECT_REF}`,
    );
    console.log("\nThen verify end to end:\n");
    console.log("  node scripts/google_calendar_smoke.mjs\n");

    server.close();
    process.exit(0);
  } catch (err) {
    reply(res, 500, "Token exchange failed. See terminal.");
    console.error(`\n${err.message}`);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("Open this URL and sign in as the coaching mailbox:\n");
  console.log(`${authUrl}\n`);
  console.log(`Waiting for the redirect on ${REDIRECT_URI} …`);
});
