/**
 * REQ-07 — daily vulnerable cohort outreach (grief / recovery + ≥10 days inactive).
 *
 * Invoke via Supabase cron with service role:
 *   POST /functions/v1/vulnerable-outreach
 *   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *   Optional: x-cron-secret: <VULNERABLE_OUTREACH_CRON_SECRET>
 *
 * Copy: "Kota is here when you're ready." — warm, no guilt framing.
 * Cap: once per 7 days per user (`vulnerableOutreachEmailedAt`).
 * Push: not wired — email when RESEND_API_KEY is set; push logged as skipped.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

import {
  buildVulnerableOutreachEmailHtml,
  isInactiveForOutreach,
  listVulnerableOutreachPreCandidatesFromRows,
  VULNERABLE_OUTREACH_EMAIL_SUBJECT,
  type VulnerableOutreachProfileRow,
} from "../_shared/vulnerableOutreachLogic.ts";

const FROM_ADDRESS = "noreply@uncloud360.ai";

type SendResult = { ok: boolean; detail: string };

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

async function sendOutreachEmail(params: {
  to: string;
  firstName: string | null;
}): Promise<SendResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return { ok: false, detail: "smtp:skipped — RESEND_API_KEY not set" };
  }

  const appUrl = Deno.env.get("APP_ORIGIN") ?? "https://uncloud360.ai";
  const html = buildVulnerableOutreachEmailHtml({
    firstName: params.firstName,
    appUrl,
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [params.to],
      subject: VULNERABLE_OUTREACH_EMAIL_SUBJECT,
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

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select(
      "id, email, firstName, results, vulnerableOutreachEmailedAt, onboardingCompletedAt, createdAt",
    )
    .eq("onboardingCompleted", true)
    .not("results", "is", null);

  if (profilesError) {
    return json({ error: profilesError.message }, 500);
  }

  const preCandidates = listVulnerableOutreachPreCandidatesFromRows(
    (profiles ?? []) as VulnerableOutreachProfileRow[],
    nowMs,
  );

  const stamped: string[] = [];
  const sendResults: Array<{ userId: string; detail: string }> = [];
  let sentCount = 0;
  let skippedSmtp = 0;
  let skippedInactive = 0;

  for (const candidate of preCandidates) {
    const { data: lastSession, error: sessionError } = await supabase
      .from("chatConversation")
      .select("updatedAt")
      .eq("userId", candidate.id)
      .order("updatedAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      sendResults.push({
        userId: candidate.id,
        detail: `session_lookup_error: ${sessionError.message}`,
      });
      continue;
    }

    const lastActivity =
      typeof lastSession?.updatedAt === "string" ? lastSession.updatedAt : null;

    if (
      !isInactiveForOutreach({
        lastSessionUpdatedAt: lastActivity,
        onboardingCompletedAt: candidate.onboardingCompletedAt ?? null,
        createdAt: candidate.createdAt ?? null,
        nowMs,
      })
    ) {
      skippedInactive += 1;
      sendResults.push({ userId: candidate.id, detail: "skipped — active within 10 days" });
      continue;
    }

    let detail = "push:skipped — no mobile push infrastructure";
    if (candidate.email) {
      const emailResult = await sendOutreachEmail({
        to: candidate.email,
        firstName: candidate.firstName,
      });
      detail = emailResult.detail;
      if (emailResult.ok) sentCount += 1;
      else if (detail.includes("smtp:skipped")) skippedSmtp += 1;
    } else {
      detail = "smtp:skipped — no email on profile; push:skipped — no mobile push infrastructure";
      skippedSmtp += 1;
    }

    sendResults.push({ userId: candidate.id, detail });

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        vulnerableOutreachEmailedAt: nowIso,
        lastNotificationSentAt: nowIso,
      })
      .eq("id", candidate.id);

    if (!updateError) stamped.push(candidate.id);
  }

  return json({
    ok: true,
    preCandidateCount: preCandidates.length,
    stampedCount: stamped.length,
    sentCount,
    skippedInactive,
    skippedSmtp,
    userIds: stamped,
    sendResults,
    smtp: Deno.env.get("RESEND_API_KEY") ? "resend" : "skipped",
    push: "skipped",
  });
});
