/**
 * Scheduled cohort processor for onboarding drop-off re-engagement (US-905).
 *
 * Invoke via Supabase cron / pg_net / external scheduler with service role:
 *   POST /functions/v1/onboarding-dropoff
 *   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *   Optional: x-cron-secret: <ONBOARDING_DROPOFF_CRON_SECRET>
 *
 * Selects users where onboardingCompleted is false, account age >= 24h,
 * and onboardingDropoffEmailedAt is null.
 * Sends via Resend when RESEND_API_KEY is set; otherwise stamps only.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const FROM_ADDRESS = "noreply@uncloud360.ai";
const SUBJECT = "Your PuP 360 results are waiting for you";

type Candidate = {
  id: string;
  email: string | null;
  firstName: string | null;
  createdAt: string;
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

  const cronSecret = Deno.env.get("ONBOARDING_DROPOFF_CRON_SECRET");
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
    <p>You started setting up your PuP 360 profile — your results are still waiting for you.</p>
    <p><a href="${appUrl}/onboarding">Continue onboarding</a></p>
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
  const cutoffIso = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, firstName, createdAt")
    .eq("onboardingCompleted", false)
    .is("onboardingDropoffEmailedAt", null)
    .not("email", "is", null)
    .lte("createdAt", cutoffIso);

  if (error) {
    return json({ error: error.message }, 500);
  }

  const candidates = (data ?? []) as Candidate[];
  const stamped: string[] = [];
  const sendResults: Array<{ userId: string; detail: string }> = [];
  let emailedCount = 0;
  let skippedCount = 0;

  for (const candidate of candidates) {
    let detail = "smtp:skipped — no email on profile";
    if (candidate.email) {
      const result = await sendResendEmail({
        to: candidate.email,
        firstName: candidate.firstName,
      });
      detail = result.detail;
      if (result.ok) emailedCount += 1;
      else skippedCount += 1;
    } else {
      skippedCount += 1;
    }

    sendResults.push({ userId: candidate.id, detail });

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ onboardingDropoffEmailedAt: nowIso })
      .eq("id", candidate.id);
    if (!updateError) stamped.push(candidate.id);
  }

  return json({
    ok: true,
    processed: candidates.length,
    emailed: emailedCount,
    skipped: skippedCount,
    stampedCount: stamped.length,
    userIds: stamped,
    sendResults,
    smtp: Deno.env.get("RESEND_API_KEY") ? "resend" : "skipped",
  });
});
