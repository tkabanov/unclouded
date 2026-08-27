/**
 * NCLDD-31 §9 — Expire waitlist offers + promote next; email claim links.
 *
 * POST /functions/v1/group-coaching-waitlist
 * Auth: Bearer service role or x-cron-secret: GROUP_COACHING_WAITLIST_CRON_SECRET
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { canonicalAppOrigin } from "../_shared/appOrigin.ts";
import {
  formatScheduledAtLabel,
  formatSessionWhen,
} from "../_shared/sessionWhenLabel.ts";
import {
  sendGridSmtpLabel,
  sendTransactionalEmail,
} from "../_shared/sendgridMail.ts";

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

  const cronSecret = Deno.env.get("GROUP_COACHING_WAITLIST_CRON_SECRET");
  if (cronSecret) {
    const header = req.headers.get("x-cron-secret") ?? "";
    if (header === cronSecret) return true;
  }
  return false;
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

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: processResult, error: processError } = await admin.rpc(
    "process_group_coaching_waitlist",
  );
  if (processError) {
    return json({ error: processError.message }, 500);
  }

  const row = (processResult && typeof processResult === "object"
    ? processResult
    : {}) as Record<string, unknown>;
  const promotedIds = Array.isArray(row.promotedEnrollmentIds)
    ? (row.promotedEnrollmentIds as unknown[]).filter(
        (id): id is string => typeof id === "string",
      )
    : [];

  // Also pick up offered rows that never got an email (e.g. promote from cancel RPC).
  const { data: pendingOffers } = await admin
    .from("groupSessionEnrollment")
    .select("id, userId, sessionId, claimExpiresAt, offerNotifiedAt")
    .eq("status", "offered")
    .is("offerNotifiedAt", null)
    .limit(50);

  const toNotify = new Set<string>([
    ...promotedIds,
    ...((pendingOffers ?? []) as { id: string }[]).map((e) => e.id),
  ]);

  const emailResults: Array<{ enrollmentId: string; detail: string }> = [];
  const appUrl = canonicalAppOrigin();

  for (const enrollmentId of toNotify) {
    const { data: enrollment } = await admin
      .from("groupSessionEnrollment")
      .select("id, userId, sessionId, claimExpiresAt, status")
      .eq("id", enrollmentId)
      .maybeSingle();

    if (!enrollment || enrollment.status !== "offered") continue;

    const [{ data: profile }, { data: session }] = await Promise.all([
      admin
        .from("profiles")
        .select("email, firstName, timeZone")
        .eq("id", enrollment.userId)
        .maybeSingle(),
      admin
        .from("groupCoachingSession")
        .select("title, startsAt, durationMinutes")
        .eq("id", enrollment.sessionId)
        .maybeSingle(),
    ]);

    const email =
      typeof profile?.email === "string" && profile.email.trim()
        ? profile.email.trim()
        : "";
    const name =
      (typeof profile?.firstName === "string" && profile.firstName.trim()) || "there";
    const userTimeZone =
      typeof profile?.timeZone === "string" && profile.timeZone.trim()
        ? profile.timeZone.trim()
        : null;
    const title =
      (typeof session?.title === "string" && session.title.trim()) || "group coaching session";
    const durationMinutes =
      typeof session?.durationMinutes === "number" && session.durationMinutes > 0
        ? session.durationMinutes
        : 60;
    const when =
      typeof session?.startsAt === "string"
        ? formatSessionWhen(session.startsAt, durationMinutes, userTimeZone)
        : "the scheduled time";
    const expires =
      typeof enrollment.claimExpiresAt === "string"
        ? formatScheduledAtLabel(enrollment.claimExpiresAt, userTimeZone)
        : "2 hours";

    let detail = "smtp:skipped — no email";
    if (email.includes("@")) {
      const mail = await sendTransactionalEmail({
        to: email,
        subject: `A spot opened: claim your Uncloud360 group session`,
        text: `Hi ${name},\n\nA spot opened for "${title}" (${when}). Claim it within 2 hours (by ${expires}):\n${appUrl}/dashboard\n\n— Uncloud360\n`,
        html: `<p>Hi ${name},</p><p>A spot opened for <strong>${title}</strong> (${when}).</p><p>Claim it within <strong>2 hours</strong> (by ${expires}) from your dashboard.</p><p><a href="${appUrl}/dashboard">Open dashboard →</a></p><p>— Uncloud360</p>`,
      });
      detail = mail.detail;
    }

    await admin
      .from("groupSessionEnrollment")
      .update({ offerNotifiedAt: new Date().toISOString() })
      .eq("id", enrollmentId);

    emailResults.push({ enrollmentId, detail });
  }

  return json({
    ok: true,
    process: row,
    notified: emailResults.length,
    emailResults,
    smtp: sendGridSmtpLabel(),
  });
});
