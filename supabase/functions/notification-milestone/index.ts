/**
 * Event-triggered milestone email after first deep-dive module completion (TEMP §10).
 *
 * Invoke from client after completeModule when modulesCompletedCount === 1:
 *   POST /functions/v1/notification-milestone
 *   Authorization: Bearer <user JWT>
 *   Body: { "milestone": "first_module_complete" }
 */
import { createClient } from "npm:@supabase/supabase-js@2";

import { isNotificationSentToday } from "../_shared/moduleUnlockLogic.ts";

const FROM_ADDRESS = "noreply@uncloud360.ai";
const SUBJECT = "Something's building";

type MilestoneKind = "first_module_complete";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function sendMilestoneEmail(params: {
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
    <p>You completed your first Know Yourself Deeper module. That layer is now part of how Gidget understands you — and there are more waiting when you're ready.</p>
    <p><a href="${appUrl}/settings?tab=profile">View your modules</a></p>
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

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "Missing Supabase env" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!jwt) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: { milestone?: MilestoneKind };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (body.milestone !== "first_module_complete") {
    return json({ error: "Unsupported milestone" }, 400);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select(
      "id, email, firstName, timeZone, modulesCompletedCount, firstModuleMilestoneEmailedAt, lastNotificationSentAt",
    )
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError) {
    return json({ error: profileError.message }, 500);
  }
  if (!profile) {
    return json({ error: "Profile not found" }, 404);
  }

  if ((profile.modulesCompletedCount ?? 0) !== 1) {
    return json({ ok: true, skipped: true, reason: "not_first_module" });
  }

  if (profile.firstModuleMilestoneEmailedAt) {
    return json({ ok: true, skipped: true, reason: "already_emailed" });
  }

  const now = new Date();
  if (isNotificationSentToday(profile.lastNotificationSentAt, now, profile.timeZone)) {
    return json({ ok: true, skipped: true, reason: "max_one_per_day" });
  }

  let detail = "smtp:skipped — no email on profile";
  let sent = false;
  if (profile.email) {
    const result = await sendMilestoneEmail({
      to: profile.email,
      firstName: profile.firstName,
    });
    detail = result.detail;
    sent = result.ok;
  }

  const nowIso = now.toISOString();
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      firstModuleMilestoneEmailedAt: nowIso,
      lastNotificationSentAt: nowIso,
    })
    .eq("id", profile.id);

  if (updateError) {
    return json({ error: updateError.message }, 500);
  }

  return json({
    ok: true,
    sent,
    detail,
    stampedAt: nowIso,
    smtp: Deno.env.get("RESEND_API_KEY") ? "resend" : "skipped",
  });
});
