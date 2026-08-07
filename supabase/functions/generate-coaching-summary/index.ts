/**
 * Prompt 5 — Premium PDF Coaching Summary (async).
 * POST { assessmentResultId: string } (user JWT)
 * Or service-role / cron: empty body scans due retries; or { assessmentResultId, userId }.
 *
 * Failure policy (AI Prompt Spec):
 * - First fail → schedule one retry after ~5 minutes (persisted + minute cron).
 * - Second fail → flag profile + notify Dr. Sam / ops; never set coachingSummaryReady.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { authenticateRequest } from "../_shared/supabase-auth.ts";
import { canonicalAppOrigin } from "../_shared/appOrigin.ts";
import {
  sendWebPushToSubscription,
  type PushSubscriptionRow,
} from "../_shared/webPushDelivery.ts";
import { parseCoachBriefInbox } from "../_shared/kotaReadDelivery.ts";
import {
  buildStandaloneUserContext,
  canUsePremiumPdfPrompts,
  generateCoachingSummary,
  normalizeStandaloneTier,
  type CoachingSummaryResult,
} from "../_shared/standalonePrompts/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

/** Spec: retry once after 5 minutes. Override via env for QA (ms). */
function coachingSummaryRetryDelayMs(): number {
  const raw = Deno.env.get("COACHING_SUMMARY_RETRY_MS")?.trim();
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return 5 * 60 * 1000;
}

function jsonResponse(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isServiceOrCronAuthorized(req: Request, serviceKey: string): boolean {
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const cronSecret = Deno.env.get("COACHING_SUMMARY_CRON_SECRET");
  const headerSecret = req.headers.get("x-cron-secret") ?? "";
  return (
    Boolean(bearer && bearer === serviceKey) ||
    Boolean(cronSecret && headerSecret === cronSecret)
  );
}

async function notifyCoachingSummaryReady(params: {
  service: ReturnType<typeof createClient>;
  userId: string;
  email: string | null;
  firstName: string | null;
}): Promise<void> {
  const appUrl = canonicalAppOrigin();
  const { data: subs } = await params.service
    .from("pushDeviceSubscription")
    .select("id, endpoint, p256dh, auth")
    .eq("userId", params.userId);

  for (const row of (subs ?? []) as PushSubscriptionRow[]) {
    await sendWebPushToSubscription(row, {
      title: "Your Complete Coaching Record is ready",
      body: "Open Uncloud360 to download your Premium PDF.",
      url: `${appUrl}/dashboard`,
    });
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey || !params.email?.includes("@")) return;

  const name = params.firstName?.trim() || "there";
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "noreply@uncloud360.ai",
      to: [params.email],
      subject: "Your Complete Coaching Record is ready",
      html: `<p>Hi ${name},</p><p>Your Complete Coaching Record is ready.</p><p><a href="${appUrl}/dashboard">Open dashboard</a></p><p>— Uncloud360</p>`,
    }),
  });
}

function opsNotifyRecipients(): string[] {
  const primary = parseCoachBriefInbox(Deno.env.get("OPS_NOTIFY_EMAIL"));
  if (primary.length > 0) return primary;
  return parseCoachBriefInbox(Deno.env.get("COACH_BRIEF_INBOX"));
}

async function notifyOpsCoachingSummaryFailed(params: {
  userId: string;
  assessmentResultId: string;
  email: string | null;
  firstName: string | null;
  errorMessage: string;
}): Promise<{ ok: boolean; detail: string }> {
  const recipients = opsNotifyRecipients();
  if (recipients.length === 0) {
    return { ok: false, detail: "smtp:skipped — OPS_NOTIFY_EMAIL / COACH_BRIEF_INBOX not configured" };
  }
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return { ok: false, detail: "smtp:skipped — RESEND_API_KEY not set" };
  }

  const appUrl = canonicalAppOrigin();
  const name = params.firstName?.trim() || "Unknown";
  const memberEmail = params.email?.trim() || "n/a";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "noreply@uncloud360.ai",
      to: recipients,
      subject: `Coaching summary failed — ${name}`,
      html: `
        <p>Premium coaching summary generation failed twice (Prompt 5).</p>
        <p><strong>User:</strong> ${name} (${memberEmail})</p>
        <p><strong>User ID:</strong> ${params.userId}</p>
        <p><strong>Assessment result:</strong> ${params.assessmentResultId}</p>
        <p><strong>Error:</strong> ${params.errorMessage}</p>
        <p>Account flagged (<code>coachingSummaryFailed</code>). Premium PDF remains blocked until summary is ready.</p>
        <p><a href="${appUrl}/settings?tab=admin">Open Admin Console</a></p>
        <p>— Uncloud360</p>
      `.trim(),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, detail: `resend_error: ${res.status} ${text}` };
  }
  return { ok: true, detail: `sent:${recipients.join(",")}` };
}

type ServiceClient = ReturnType<typeof createClient>;

async function buildGenerationInput(
  service: ServiceClient,
  userId: string,
  profile: Record<string, unknown>,
) {
  const ctx = buildStandaloneUserContext(profile);

  const { data: history } = await service
    .from("assessmentResult")
    .select(
      "classification, stabilityScore, performanceScore, alignmentScore, assessmentDate",
    )
    .eq("userId", userId)
    .order("assessmentDate", { ascending: true });

  const classificationHistory = (history ?? [])
    .map((r) => `${r.classification ?? "unknown"} (${r.assessmentDate ?? ""})`)
    .join(" → ");
  const stabilityHistory = (history ?? [])
    .map((r) => String(r.stabilityScore ?? "n/a"))
    .join(" → ");
  const performanceHistory = (history ?? [])
    .map((r) => String(r.performanceScore ?? "n/a"))
    .join(" → ");
  const alignmentHistory = (history ?? [])
    .map((r) => String(r.alignmentScore ?? "n/a"))
    .join(" → ");

  const { data: enrollments } = await service
    .from("pathEnrollment")
    .select("status, completedSessionsCount, pathId, updatedAt")
    .eq("userId", userId);

  const pathIds = (enrollments ?? [])
    .map((e) => e.pathId)
    .filter((id): id is string => typeof id === "string");
  const pathNameById = new Map<string, string>();
  if (pathIds.length > 0) {
    const { data: paths } = await service.from("path").select("id, name").in("id", pathIds);
    for (const p of paths ?? []) {
      if (typeof p.id === "string" && typeof p.name === "string") {
        pathNameById.set(p.id, p.name);
      }
    }
  }
  const pathsCompleted = (enrollments ?? [])
    .filter((e) => e.status === "completed" || Number(e.completedSessionsCount ?? 0) > 0)
    .map((e) => {
      const name = (typeof e.pathId === "string" && pathNameById.get(e.pathId)) || "Path";
      return `${name} (${e.updatedAt ?? ""})`;
    })
    .join("; ");

  return {
    classificationHistory: classificationHistory || ctx.classification,
    stabilityHistory: stabilityHistory || "n/a",
    performanceHistory: performanceHistory || "n/a",
    alignmentHistory: alignmentHistory || "n/a",
    pathsCompleted: pathsCompleted || "none",
    sessionMemoryCompressed: ctx.sessionMemoryCompressed.slice(0, 3200),
    confirmedFingerprintSignals: ctx.confirmedFingerprintSignals,
    activeFlags: ctx.activeFlags,
    coachingModeHistory: ctx.coachingMode,
    commitmentFollowthroughRate: ctx.commitmentFollowThroughRate,
  };
}

async function generateForAssessment(params: {
  service: ServiceClient;
  userId: string;
  assessmentResultId: string;
}): Promise<Response> {
  const { service, userId, assessmentResultId } = params;

  const { data: profile } = await service
    .from("profiles")
    .select("tier, results, onboardingData, email, firstName, coachingSummaryFailed")
    .eq("id", userId)
    .maybeSingle();

  const tier = normalizeStandaloneTier(profile?.tier);
  if (!canUsePremiumPdfPrompts(tier)) {
    return jsonResponse(403, {
      error: "Premium required",
      code: "coaching_summary_tier_required",
    });
  }

  const { data: assessment } = await service
    .from("assessmentResult")
    .select(
      "id, userId, coachingSummaryReady, coachingSummaryJson, coachingSummaryAttemptCount, coachingSummaryRetryAt, coachingSummaryEscalatedAt",
    )
    .eq("id", assessmentResultId)
    .eq("userId", userId)
    .maybeSingle();

  if (!assessment) return jsonResponse(404, { error: "Assessment result not found" });

  if (assessment.coachingSummaryReady === true && assessment.coachingSummaryJson) {
    return jsonResponse(200, {
      ok: true,
      idempotent: true,
      coachingSummary: assessment.coachingSummaryJson,
    });
  }

  const attemptCount = Number(assessment.coachingSummaryAttemptCount ?? 0);
  const retryAtRaw =
    typeof assessment.coachingSummaryRetryAt === "string"
      ? assessment.coachingSummaryRetryAt
      : null;
  const retryAtMs = retryAtRaw ? Date.parse(retryAtRaw) : NaN;
  const retryStillPending =
    attemptCount === 1 &&
    Number.isFinite(retryAtMs) &&
    retryAtMs > Date.now() &&
    assessment.coachingSummaryEscalatedAt == null;

  // Wait for the scheduled ~5 min retry; premature calls must not escalate.
  if (retryStillPending) {
    return jsonResponse(202, {
      ok: false,
      code: "coaching_summary_retry_scheduled",
      retryAt: retryAtRaw,
      error: "Coaching summary retry already scheduled",
    });
  }

  // Claim a due retry so concurrent cron ticks do not double-fire.
  if (attemptCount >= 1 && assessment.coachingSummaryEscalatedAt == null) {
    await service
      .from("assessmentResult")
      .update({ coachingSummaryRetryAt: null })
      .eq("id", assessmentResultId)
      .eq("userId", userId);
  }

  const input = await buildGenerationInput(service, userId, profile ?? {});

  let summary: CoachingSummaryResult;
  try {
    summary = await generateCoachingSummary(input);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    // First failure → schedule deferred retry (~5 min). Do not inline-retry.
    if (attemptCount < 1) {
      const retryAt = new Date(Date.now() + coachingSummaryRetryDelayMs()).toISOString();
      await service
        .from("assessmentResult")
        .update({
          coachingSummaryAttemptCount: 1,
          coachingSummaryRetryAt: retryAt,
          coachingSummaryEscalatedAt: null,
        })
        .eq("id", assessmentResultId)
        .eq("userId", userId);

      console.warn("coaching_summary_retry_scheduled", {
        userId,
        assessmentResultId,
        retryAt,
        error: errorMessage,
      });

      return jsonResponse(202, {
        ok: false,
        code: "coaching_summary_retry_scheduled",
        retryAt,
        error: "Coaching summary failed; retry scheduled",
      });
    }

    // Second failure (deferred retry ran) → flag account + notify Dr. Sam / ops.
    const escalatedAt = new Date().toISOString();
    await service
      .from("assessmentResult")
      .update({
        coachingSummaryAttemptCount: Math.max(attemptCount + 1, 2),
        coachingSummaryRetryAt: null,
        coachingSummaryEscalatedAt: escalatedAt,
      })
      .eq("id", assessmentResultId)
      .eq("userId", userId);

    await service
      .from("profiles")
      .update({ coachingSummaryFailed: true })
      .eq("id", userId);

    const notify = await notifyOpsCoachingSummaryFailed({
      userId,
      assessmentResultId,
      email: typeof profile?.email === "string" ? profile.email : null,
      firstName: typeof profile?.firstName === "string" ? profile.firstName : null,
      errorMessage,
    });

    console.error("coaching_summary_failed_escalated", {
      userId,
      assessmentResultId,
      error: errorMessage,
      notify,
    });

    return jsonResponse(502, {
      error: "Failed to generate coaching summary after retry",
      code: "coaching_summary_failed",
      escalated: true,
      notifyDetail: notify.detail,
    });
  }

  const { error: updateError } = await service
    .from("assessmentResult")
    .update({
      coachingSummaryJson: summary,
      coachingSummaryReady: true,
      coachingSummaryAttemptCount: 0,
      coachingSummaryRetryAt: null,
      coachingSummaryEscalatedAt: null,
    })
    .eq("id", assessmentResultId)
    .eq("userId", userId);

  if (updateError) return jsonResponse(500, { error: updateError.message });

  if (profile?.coachingSummaryFailed === true) {
    await service.from("profiles").update({ coachingSummaryFailed: false }).eq("id", userId);
  }

  await notifyCoachingSummaryReady({
    service,
    userId,
    email: typeof profile?.email === "string" ? profile.email : null,
    firstName: typeof profile?.firstName === "string" ? profile.firstName : null,
  });

  return jsonResponse(200, { ok: true, coachingSummary: summary });
}

async function processDueRetries(service: ServiceClient): Promise<Response> {
  const nowIso = new Date().toISOString();
  const { data: due, error } = await service
    .from("assessmentResult")
    .select("id, userId")
    .eq("coachingSummaryReady", false)
    .eq("coachingSummaryAttemptCount", 1)
    .is("coachingSummaryEscalatedAt", null)
    .lte("coachingSummaryRetryAt", nowIso)
    .not("coachingSummaryRetryAt", "is", null)
    .limit(20);

  if (error) {
    return jsonResponse(500, { error: error.message, code: "coaching_summary_retry_scan_failed" });
  }

  const results: Array<{ assessmentResultId: string; status: number }> = [];
  for (const row of due ?? []) {
    if (typeof row.id !== "string" || typeof row.userId !== "string") continue;
    const response = await generateForAssessment({
      service,
      userId: row.userId,
      assessmentResultId: row.id,
    });
    results.push({ assessmentResultId: row.id, status: response.status });
  }

  return jsonResponse(200, {
    ok: true,
    scanned: true,
    processed: results.length,
    results,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  if (!serviceKey || !supabaseUrl) {
    return jsonResponse(500, { error: "Missing service role configuration" });
  }
  const service = createClient(supabaseUrl, serviceKey);

  let assessmentResultId: string | null = null;
  let userId: string | null = null;
  let cronScan = false;

  const auth = await authenticateRequest(req);
  if (auth) {
    userId = auth.user.id;
    try {
      const body = (await req.json()) as { assessmentResultId?: string };
      assessmentResultId =
        typeof body.assessmentResultId === "string" ? body.assessmentResultId : null;
    } catch {
      return jsonResponse(400, { error: "Invalid JSON body" });
    }
  } else if (isServiceOrCronAuthorized(req, serviceKey)) {
    try {
      const raw = await req.text();
      const body = (raw ? JSON.parse(raw) : {}) as {
        assessmentResultId?: string;
        userId?: string;
      };
      assessmentResultId =
        typeof body.assessmentResultId === "string" ? body.assessmentResultId : null;
      userId = typeof body.userId === "string" ? body.userId : null;
      cronScan = !assessmentResultId && !userId;
    } catch {
      return jsonResponse(400, { error: "Invalid JSON body" });
    }
  } else {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  if (cronScan) {
    return processDueRetries(service);
  }

  if (!assessmentResultId || !userId) {
    return jsonResponse(400, { error: "assessmentResultId and user are required" });
  }

  return generateForAssessment({ service, userId, assessmentResultId });
});
