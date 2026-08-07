/**
 * Prompt 4 — Premium/Pro PDF Trajectory Statement (sync at reassessment).
 * POST { assessmentResultId: string }
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { authenticateRequest } from "../_shared/supabase-auth.ts";
import {
  buildStandaloneUserContext,
  canUseStandaloneProPrompts,
  generateTrajectoryStatementText,
  normalizeStandaloneTier,
  scoreFromResults,
} from "../_shared/standalonePrompts/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fmt(n: number | null | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "n/a";
  return n.toFixed(1);
}

function delta(before: number | null, after: number | null): string {
  if (before == null || after == null) return "n/a";
  const d = after - before;
  const sign = d > 0 ? "+" : "";
  return `${sign}${d.toFixed(1)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const auth = await authenticateRequest(req);
  if (!auth) return jsonResponse(401, { error: "Unauthorized" });

  let assessmentResultId: string | null = null;
  try {
    const body = (await req.json()) as { assessmentResultId?: string };
    assessmentResultId =
      typeof body.assessmentResultId === "string" ? body.assessmentResultId : null;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }
  if (!assessmentResultId) {
    return jsonResponse(400, { error: "assessmentResultId is required" });
  }

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("tier, results, onboardingData, reassessmentResults")
    .eq("id", auth.user.id)
    .maybeSingle();

  const tier = normalizeStandaloneTier(profile?.tier);
  if (!canUseStandaloneProPrompts(tier)) {
    return jsonResponse(403, {
      error: "Pro or Premium required",
      code: "trajectory_statement_tier_required",
    });
  }

  const { data: assessment, error: assessError } = await auth.supabase
    .from("assessmentResult")
    .select("*")
    .eq("id", assessmentResultId)
    .eq("userId", auth.user.id)
    .maybeSingle();

  if (assessError) return jsonResponse(500, { error: assessError.message });
  if (!assessment) return jsonResponse(404, { error: "Assessment result not found" });

  if (
    typeof assessment.trajectoryStatementText === "string" &&
    assessment.trajectoryStatementText.trim()
  ) {
    return jsonResponse(200, {
      ok: true,
      idempotent: true,
      trajectoryStatement: assessment.trajectoryStatementText.trim(),
    });
  }

  const { data: history } = await auth.supabase
    .from("assessmentResult")
    .select(
      "id, classification, stabilityScore, performanceScore, alignmentScore, assessmentDate, isInitial, rawResults",
    )
    .eq("userId", auth.user.id)
    .order("assessmentDate", { ascending: true });

  const previous =
    (history ?? []).filter((r) => r.id !== assessmentResultId).at(-1) ?? null;

  const afterResults =
    assessment.rawResults && typeof assessment.rawResults === "object"
      ? (assessment.rawResults as Record<string, unknown>)
      : profile?.results && typeof profile.results === "object"
        ? (profile.results as Record<string, unknown>)
        : {};

  const beforeResults =
    previous?.rawResults && typeof (previous as { rawResults?: unknown }).rawResults === "object"
      ? ((previous as { rawResults: Record<string, unknown> }).rawResults)
      : {};

  const stabilityBefore =
    typeof previous?.stabilityScore === "number"
      ? Number(previous.stabilityScore)
      : scoreFromResults(beforeResults, "stability_score");
  const performanceBefore =
    typeof previous?.performanceScore === "number"
      ? Number(previous.performanceScore)
      : scoreFromResults(beforeResults, "performance_score");
  const alignmentBefore =
    typeof previous?.alignmentScore === "number"
      ? Number(previous.alignmentScore)
      : scoreFromResults(beforeResults, "alignment_score");

  const stabilityAfter =
    typeof assessment.stabilityScore === "number"
      ? Number(assessment.stabilityScore)
      : scoreFromResults(afterResults, "stability_score");
  const performanceAfter =
    typeof assessment.performanceScore === "number"
      ? Number(assessment.performanceScore)
      : scoreFromResults(afterResults, "performance_score");
  const alignmentAfter =
    typeof assessment.alignmentScore === "number"
      ? Number(assessment.alignmentScore)
      : scoreFromResults(afterResults, "alignment_score");

  const ctx = buildStandaloneUserContext(profile ?? {});
  const beforeCtx = buildStandaloneUserContext({
    results: beforeResults,
    onboardingData: profile?.onboardingData,
  });

  const { count: pathsCompleted } = await auth.supabase
    .from("pathEnrollment")
    .select("id", { count: "exact", head: true })
    .eq("userId", auth.user.id)
    .eq("status", "completed");

  let statement: string;
  try {
    statement = await generateTrajectoryStatementText({
      classificationBefore:
        (typeof previous?.classification === "string" && previous.classification) ||
        beforeCtx.classification,
      classificationAfter:
        (typeof assessment.classification === "string" && assessment.classification) ||
        ctx.classification,
      stabilityBefore: fmt(stabilityBefore),
      stabilityAfter: fmt(stabilityAfter),
      stabilityChange: delta(stabilityBefore, stabilityAfter),
      performanceBefore: fmt(performanceBefore),
      performanceAfter: fmt(performanceAfter),
      performanceChange: delta(performanceBefore, performanceAfter),
      alignmentBefore: fmt(alignmentBefore),
      alignmentAfter: fmt(alignmentAfter),
      alignmentChange: delta(alignmentBefore, alignmentAfter),
      coachingModeBefore: beforeCtx.coachingMode,
      coachingModeAfter: ctx.coachingMode,
      pathsCompleted: String(pathsCompleted ?? 0),
      activeFlags: ctx.activeFlags,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    return jsonResponse(502, { error: message });
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  if (!serviceKey || !supabaseUrl) {
    return jsonResponse(500, { error: "Missing service role configuration" });
  }
  const service = createClient(supabaseUrl, serviceKey);

  const { error: updateError } = await service
    .from("assessmentResult")
    .update({ trajectoryStatementText: statement })
    .eq("id", assessmentResultId)
    .eq("userId", auth.user.id);

  if (updateError) return jsonResponse(500, { error: updateError.message });

  return jsonResponse(200, { ok: true, trajectoryStatement: statement });
});
