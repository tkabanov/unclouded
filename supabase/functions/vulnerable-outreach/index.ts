/**
 * Scheduled outreach for vulnerable cohorts (recovery / grief mode).
 *
 * Invoke via Supabase cron with service role:
 *   POST /functions/v1/vulnerable-outreach
 *   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *   Optional: x-cron-secret: <VULNERABLE_OUTREACH_CRON_SECRET>
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const EMAIL_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const INACTIVE_SESSION_DAYS = 10;

type ProfileCandidate = {
  id: string;
  email: string | null;
  firstName: string | null;
  results: Record<string, unknown> | null;
  vulnerableOutreachEmailedAt: string | null;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authorize(req: Request, serviceKey: string): boolean {
  const auth = req.headers.get("Authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (bearer && bearer === serviceKey) return true;

  const cronSecret = Deno.env.get("VULNERABLE_OUTREACH_CRON_SECRET");
  if (cronSecret) {
    const header = req.headers.get("x-cron-secret") ?? "";
    if (header === cronSecret) return true;
  }

  return false;
}

function readBooleanFlag(results: Record<string, unknown> | null, key: string): boolean {
  const value = results?.[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "yes" || normalized === "1";
  }
  return false;
}

function isVulnerableProfile(results: Record<string, unknown> | null): boolean {
  return (
    readBooleanFlag(results, "recovery_mode_active") ||
    readBooleanFlag(results, "grief_mode_active")
  );
}

async function sendPlaceholderEmail(params: {
  userId: string;
  email: string | null;
  firstName: string | null;
}): Promise<string> {
  const name = params.firstName?.trim() || "member";
  const detail = params.email
    ? `placeholder_email to=${params.email}`
    : "placeholder_email skipped — no email";
  console.log(`[vulnerable-outreach] ${detail} user=${params.userId} name=${name}`);
  return detail;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Missing Supabase env" }, 500);
  }

  if (!authorize(req, serviceKey)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const cooldownIso = new Date(nowMs - EMAIL_COOLDOWN_MS).toISOString();
  const inactiveSinceIso = new Date(
    nowMs - INACTIVE_SESSION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, firstName, results, vulnerableOutreachEmailedAt")
    .not("results", "is", null);

  if (profilesError) {
    return json({ error: profilesError.message }, 500);
  }

  const vulnerable = ((profiles ?? []) as ProfileCandidate[]).filter((row) => {
    if (!isVulnerableProfile(row.results)) return false;
    const emailedAt = row.vulnerableOutreachEmailedAt;
    if (emailedAt && emailedAt >= cooldownIso) return false;
    return true;
  });

  const stamped: string[] = [];
  const sendResults: Array<{ userId: string; detail: string }> = [];

  for (const candidate of vulnerable) {
    const { data: lastSession, error: sessionError } = await supabase
      .from("chatConversation")
      .select("updatedAt")
      .eq("userId", candidate.id)
      .order("updatedAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      sendResults.push({ userId: candidate.id, detail: `session_lookup_error: ${sessionError.message}` });
      continue;
    }

    const lastActivity =
      typeof lastSession?.updatedAt === "string" ? lastSession.updatedAt : null;
    if (lastActivity && lastActivity >= inactiveSinceIso) {
      sendResults.push({ userId: candidate.id, detail: "skipped — recent session" });
      continue;
    }

    const detail = await sendPlaceholderEmail({
      userId: candidate.id,
      email: candidate.email,
      firstName: candidate.firstName,
    });
    sendResults.push({ userId: candidate.id, detail });

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ vulnerableOutreachEmailedAt: nowIso })
      .eq("id", candidate.id);

    if (!updateError) stamped.push(candidate.id);
  }

  return json({
    ok: true,
    candidateCount: vulnerable.length,
    stampedCount: stamped.length,
    userIds: stamped,
    sendResults,
  });
});
