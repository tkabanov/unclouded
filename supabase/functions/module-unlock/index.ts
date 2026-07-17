/**
 * Scheduled cohort processor for deep-dive module unlock emails (TEMP §10 / Build Brief §13).
 *
 * Invoke via Supabase cron with service role:
 *   POST /functions/v1/module-unlock
 *   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *   Optional: x-cron-secret: <MODULE_UNLOCK_CRON_SECRET>
 */
import { createClient } from "npm:@supabase/supabase-js@2";

import {
  buildModuleUnlockSchedulePatch,
  listModuleUnlockCandidatesFromRows,
  parseModuleSchedules,
  type ModuleUnlockProfileRow,
} from "../_shared/moduleUnlockLogic.ts";

const FROM_ADDRESS = "noreply@uncloud360.ai";
const SUBJECT = "Your next layer is ready";

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

  const cronSecret = Deno.env.get("MODULE_UNLOCK_CRON_SECRET");
  if (cronSecret) {
    const header = req.headers.get("x-cron-secret") ?? "";
    if (header === cronSecret) return true;
  }

  return false;
}

async function sendModuleUnlockEmail(params: {
  to: string;
  firstName: string | null;
  displayTitle: string;
  slug: string;
}): Promise<SendResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return { ok: false, detail: "smtp:skipped — RESEND_API_KEY not set" };
  }

  const name = params.firstName?.trim() || "there";
  const appUrl = Deno.env.get("APP_ORIGIN") ?? "https://uncloud360.ai";
  const moduleUrl = `${appUrl}/settings/know-yourself/${params.slug}`;
  const html = `
    <p>Hi ${name},</p>
    <p>Your next layer is ready: <strong>${params.displayTitle}</strong> — 10 minutes when you're ready.</p>
    <p><a href="${moduleUrl}">Start ${params.displayTitle}</a></p>
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
  const nowIso = new Date().toISOString();
  const now = new Date(nowIso);

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, firstName, timeZone, onboardingCompleted, lastNotificationSentAt, moduleSchedules, moduleIdentityComplete, moduleRelationalComplete, moduleHistoryComplete, moduleFinancialComplete, moduleBodyComplete, moduleMeaningComplete",
    )
    .eq("onboardingCompleted", true);

  if (error) {
    return json({ error: error.message }, 500);
  }

  const candidates = listModuleUnlockCandidatesFromRows(
    (data ?? []) as ModuleUnlockProfileRow[],
    now,
  );

  const stamped: string[] = [];
  const sendResults: Array<{ userId: string; detail: string }> = [];
  let sentCount = 0;
  let skippedSmtp = 0;

  for (const candidate of candidates) {
    let detail = "smtp:skipped — no email on profile";
    if (candidate.email) {
      const result = await sendModuleUnlockEmail({
        to: candidate.email,
        firstName: candidate.firstName,
        displayTitle: candidate.displayTitle,
        slug: candidate.slug,
      });
      detail = result.detail;
      if (result.ok) sentCount += 1;
      else if (detail.includes("smtp:skipped")) skippedSmtp += 1;
    } else {
      skippedSmtp += 1;
    }

    sendResults.push({ userId: candidate.userId, detail });

    const schedules = parseModuleSchedules(
      (data ?? []).find((row) => row.id === candidate.userId)?.moduleSchedules,
    );
    const nextSchedules = buildModuleUnlockSchedulePatch(
      schedules,
      candidate.slug,
      candidate.kind,
      nowIso,
    );

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        moduleSchedules: nextSchedules,
        lastNotificationSentAt: nowIso,
      })
      .eq("id", candidate.userId);

    if (!updateError) stamped.push(candidate.userId);
  }

  return json({
    ok: true,
    candidateCount: candidates.length,
    stampedCount: stamped.length,
    sentCount,
    skippedSmtp,
    userIds: stamped,
    sendResults,
    smtp: Deno.env.get("RESEND_API_KEY") ? "resend" : "skipped",
  });
});
