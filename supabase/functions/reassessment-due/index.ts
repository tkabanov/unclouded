/**
 * Scheduled cohort processor for 90-day reassessment prompts (Section 2 / US-300).
 *
 * Invoke via Supabase cron / pg_net / external scheduler with service role:
 *   POST /functions/v1/reassessment-due
 *   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *   Optional: x-cron-secret: <REASSESSMENT_DUE_CRON_SECRET>
 *
 * Selects Pro/Premium users where nextReassessmentDate <= now and
 * reassessmentDueEmailedAt is null or older than 5 days.
 * Sends via Resend when RESEND_API_KEY is set; otherwise stamps only.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const EMAIL_COOLDOWN_MS = 5 * 24 * 60 * 60 * 1000;
const FROM_ADDRESS = "noreply@uncloud360.ai";
const SUBJECT = "Your 90-day check-in is ready";

type Candidate = {
  id: string;
  email: string | null;
  firstName: string | null;
  tier: string | null;
  nextReassessmentDate: string | null;
  reassessmentDueEmailedAt: string | null;
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

  const cronSecret = Deno.env.get("REASSESSMENT_DUE_CRON_SECRET");
  if (cronSecret) {
    const header = req.headers.get("x-cron-secret") ?? "";
    if (header === cronSecret) return true;
  }

  return false;
}

async function sendResendEmail(params: {
  to: string;
  firstName: string | null;
}): Promise<{ ok: boolean; detail: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return { ok: false, detail: "smtp:skipped — RESEND_API_KEY not set" };
  }

  const name = params.firstName?.trim() || "there";
  const appUrl = Deno.env.get("APP_ORIGIN") ?? "https://uncloud360.ai";
  const html = `
    <p>Hi ${name},</p>
    <p>Your 90-day PuP 360 check-in is ready. Retake the assessment to see how your scores have changed.</p>
    <p><a href="${appUrl}/onboarding?reassessment=1">Start reassessment</a></p>
    <p>— Uncloud360</p>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [params.to],
      subject: SUBJECT,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, detail: `resend_error: ${res.status} ${text}` };
  }

  return { ok: true, detail: "sent" };
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

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, firstName, tier, nextReassessmentDate, reassessmentDueEmailedAt")
    .lte("nextReassessmentDate", nowIso)
    .in("tier", ["pro", "premium"]);

  if (error) {
    return json({ error: error.message }, 500);
  }

  const candidates = ((data ?? []) as Candidate[]).filter((row) => {
    const emailedAt = row.reassessmentDueEmailedAt;
    if (!emailedAt) return true;
    return emailedAt < cooldownIso;
  });

  const stamped: string[] = [];
  const sendResults: Array<{ userId: string; detail: string }> = [];
  let sentCount = 0;
  let skippedSmtp = 0;

  for (const candidate of candidates) {
    let detail = "smtp:skipped — no email on profile";
    if (candidate.email) {
      const result = await sendResendEmail({
        to: candidate.email,
        firstName: candidate.firstName,
      });
      detail = result.detail;
      if (result.ok) sentCount += 1;
      else if (detail.includes("smtp:skipped")) skippedSmtp += 1;
    } else {
      skippedSmtp += 1;
    }

    sendResults.push({ userId: candidate.id, detail });

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ reassessmentDueEmailedAt: nowIso })
      .eq("id", candidate.id);
    if (!updateError) stamped.push(candidate.id);
  }

  return json({
    ok: true,
    dueCount: candidates.length,
    stampedCount: stamped.length,
    sentCount,
    skippedSmtp,
    userIds: stamped,
    sendResults,
    smtp: Deno.env.get("RESEND_API_KEY") ? "resend" : "skipped",
  });
});
