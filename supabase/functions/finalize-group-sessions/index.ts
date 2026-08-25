/**
 * NCLDD-31 §8 — After admin creates group sessions, best-effort Google Meet links.
 *
 * Body: { sessionIds: string[] }
 * Auth: admin JWT
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { createGoogleMeetEvent } from "../_shared/googleCalendar.ts";
import { authenticateRequest } from "../_shared/supabase-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, payload: Record<string, unknown>): Response {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "method_not_allowed" });
  }

  const auth = await authenticateRequest(req);
  if (!auth) return json(401, { error: "unauthorized" });

  const admin = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profile } = await admin
    .from("profiles")
    .select("roleType")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (profile?.roleType !== "admin") {
    return json(403, { error: "forbidden" });
  }

  let body: { sessionIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const sessionIds = Array.isArray(body.sessionIds)
    ? body.sessionIds.filter((id) => typeof id === "string" && id.trim())
    : [];
  if (sessionIds.length === 0) {
    return json(400, { error: "session_ids_required" });
  }

  const results: Array<{ sessionId: string; detail: string }> = [];

  for (const sessionId of sessionIds.slice(0, 13)) {
    const { data: session } = await admin
      .from("groupCoachingSession")
      .select("id, title, description, startsAt, durationMinutes, meetLink, googleEventId, status")
      .eq("id", sessionId)
      .maybeSingle();

    if (!session || session.status !== "scheduled") {
      results.push({ sessionId, detail: "skipped — not found" });
      continue;
    }
    if (session.meetLink && session.googleEventId) {
      results.push({ sessionId, detail: "google:already_set" });
      continue;
    }

    const created = await createGoogleMeetEvent({
      summary: `Uncloud360 group: ${session.title}`,
      description: session.description || "Uncloud360 group coaching session.",
      startsAt: session.startsAt,
      durationMinutes:
        typeof session.durationMinutes === "number" && session.durationMinutes > 0
          ? session.durationMinutes
          : 60,
      attendeeEmails: [],
    });

    if (created.meetLink || created.eventId) {
      await admin
        .from("groupCoachingSession")
        .update({
          meetLink: created.meetLink ?? session.meetLink,
          googleEventId: created.eventId ?? session.googleEventId,
        })
        .eq("id", sessionId);
    }
    results.push({ sessionId, detail: created.detail });
  }

  return json(200, { ok: true, results });
});
