/**
 * Prompt 5 — Premium PDF Coaching Summary (async).
 * POST { assessmentResultId: string }
 * Also accepts service-role / cron for retries.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { authenticateRequest } from "../_shared/supabase-auth.ts";
import { canonicalAppOrigin } from "../_shared/appOrigin.ts";
import {
  sendWebPushToSubscription,
  type PushSubscriptionRow,
} from "../_shared/webPushDelivery.ts";
import {
  buildStandaloneUserContext,
  canUsePremiumPdfPrompts,
  generateCoachingSummary,
  normalizeStandaloneTier,
} from "../_shared/standalonePrompts/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function jsonResponse(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
  } else {
    const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    const cronSecret = Deno.env.get("COACHING_SUMMARY_CRON_SECRET");
    const headerSecret = req.headers.get("x-cron-secret") ?? "";
    const authorized =
      (bearer && bearer === serviceKey) ||
      (cronSecret && headerSecret === cronSecret);
    if (!authorized) return jsonResponse(401, { error: "Unauthorized" });
    try {
      const body = (await req.json()) as {
        assessmentResultId?: string;
        userId?: string;
      };
      assessmentResultId =
        typeof body.assessmentResultId === "string" ? body.assessmentResultId : null;
      userId = typeof body.userId === "string" ? body.userId : null;
    } catch {
      return jsonResponse(400, { error: "Invalid JSON body" });
    }
  }

  if (!assessmentResultId || !userId) {
    return jsonResponse(400, { error: "assessmentResultId and user are required" });
  }

  const { data: profile } = await service
    .from("profiles")
    .select("tier, results, onboardingData, email, firstName")
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
    .select("*")
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

  const ctx = buildStandaloneUserContext(profile ?? {});

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

  let summary;
  try {
    summary = await generateCoachingSummary({
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
    });
  } catch (firstError) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      summary = await generateCoachingSummary({
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
      });
    } catch (secondError) {
      console.error("coaching_summary_failed", {
        userId,
        assessmentResultId,
        firstError: firstError instanceof Error ? firstError.message : firstError,
        secondError: secondError instanceof Error ? secondError.message : secondError,
      });
      return jsonResponse(502, {
        error: "Failed to generate coaching summary after retry",
        code: "coaching_summary_failed",
      });
    }
  }

  const { error: updateError } = await service
    .from("assessmentResult")
    .update({
      coachingSummaryJson: summary,
      coachingSummaryReady: true,
    })
    .eq("id", assessmentResultId)
    .eq("userId", userId);

  if (updateError) return jsonResponse(500, { error: updateError.message });

  await notifyCoachingSummaryReady({
    service,
    userId,
    email: typeof profile?.email === "string" ? profile.email : null,
    firstName: typeof profile?.firstName === "string" ? profile.firstName : null,
  });

  return jsonResponse(200, { ok: true, coachingSummary: summary });
});
