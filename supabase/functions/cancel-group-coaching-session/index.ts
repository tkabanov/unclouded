/**
 * NCLDD-31 §8 / CL-6 — Admin cancels an entire group coaching session:
 * RPC cancels + resets counters; this edge emails all enrolled members.
 *
 * Body: { sessionId: string }
 * Auth: admin JWT (settings admin).
 */
import { authenticateRequest } from "../_shared/supabase-auth.ts";
import { formatSessionWhen } from "../_shared/sessionWhenLabel.ts";
import { sendTransactionalEmail } from "../_shared/sendgridMail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NotifyMember = {
  userId?: string;
  email?: string | null;
  firstName?: string | null;
  timeZone?: string | null;
  enrollmentStatus?: string | null;
};

function jsonResponse(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  const auth = await authenticateRequest(req);
  if (!auth) return jsonResponse(401, { error: "unauthorized" });

  let body: { sessionId?: string };
  try {
    body = (await req.json()) as { sessionId?: string };
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  if (!sessionId) return jsonResponse(400, { error: "session_id_required" });

  const { data, error } = await auth.supabase.rpc("admin_cancel_group_coaching_session", {
    p_session_id: sessionId,
  });

  if (error) {
    return jsonResponse(500, { error: error.message });
  }

  const row = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  if (row.ok !== true) {
    return jsonResponse(400, {
      ok: false,
      code: typeof row.code === "string" ? row.code : "cancel_failed",
      error: typeof row.error === "string" ? row.error : "Couldn't cancel session.",
    });
  }

  const title =
    typeof row.title === "string" && row.title.trim() ? row.title.trim() : "Group coaching session";
  const startsAt = typeof row.startsAt === "string" ? row.startsAt : null;
  const durationMinutes =
    typeof row.durationMinutes === "number" && row.durationMinutes > 0
      ? row.durationMinutes
      : 60;

  const members = Array.isArray(row.notifyMembers)
    ? (row.notifyMembers as NotifyMember[])
    : [];

  const mailResults: Array<{ email: string; detail: string }> = [];

  for (const member of members) {
    const email = typeof member.email === "string" ? member.email.trim() : "";
    if (!email.includes("@")) {
      mailResults.push({ email: email || "(missing)", detail: "smtp:skipped — no member email" });
      continue;
    }

    const firstName =
      typeof member.firstName === "string" && member.firstName.trim()
        ? member.firstName.trim()
        : "there";
    const timeZone =
      typeof member.timeZone === "string" && member.timeZone.trim()
        ? member.timeZone.trim()
        : null;
    const whenLabel = startsAt
      ? formatSessionWhen(startsAt, durationMinutes, timeZone)
      : "the scheduled time";

    const mail = await sendTransactionalEmail({
      to: email,
      subject: `Uncloud360 group session cancelled: ${title}`,
      text: `Hi ${firstName},\n\nYour group coaching session has been cancelled by an administrator.\n\nSession: ${title}\nWhen: ${whenLabel}\n\nYour monthly group session allowance has been restored if this session counted toward it. You can book another available group session.\n`,
      html: `<p>Hi ${firstName},</p><p>Your group coaching session has been cancelled by an administrator.</p><p><strong>Session:</strong> ${title}<br/><strong>When:</strong> ${whenLabel}</p><p>Your monthly group session allowance has been restored if this session counted toward it. You can book another available group session.</p>`,
    });
    mailResults.push({ email, detail: mail.detail });
  }

  return jsonResponse(200, {
    ok: true,
    sessionId,
    notifiedCount: mailResults.length,
    mailResults,
  });
});
