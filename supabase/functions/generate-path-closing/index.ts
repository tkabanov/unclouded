/**
 * Prompt 3 — Path Session Closing Insight.
 * POST { sessionId, enrollmentId?, pathName?, sessionNumber?, sessionTheme?, reflectionResponses? }
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { authenticateRequest } from "../_shared/supabase-auth.ts";
import {
  buildStandaloneUserContext,
  canUseStandaloneProPrompts,
  generatePathClosingInsight,
  normalizeStandaloneTier,
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

type Body = {
  sessionId?: string;
  enrollmentId?: string;
  pathName?: string;
  sessionNumber?: string;
  sessionTheme?: string;
  reflectionResponses?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const auth = await authenticateRequest(req);
  if (!auth) return jsonResponse(401, { error: "Unauthorized" });

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;
  if (!sessionId) return jsonResponse(400, { error: "sessionId is required" });

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("tier, results, onboardingData")
    .eq("id", auth.user.id)
    .maybeSingle();

  const tier = normalizeStandaloneTier(profile?.tier);
  if (!canUseStandaloneProPrompts(tier)) {
    return jsonResponse(403, {
      error: "Path closing insights are available on Pro and Premium plans.",
      code: "path_closing_tier_required",
    });
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  if (!serviceKey || !supabaseUrl) {
    return jsonResponse(500, { error: "Missing service role configuration" });
  }
  const service = createClient(supabaseUrl, serviceKey);

  const { data: existing } = await service
    .from("pathSessionCompletion")
    .select("id, closingAcknowledgment, closingSitWith, closingCta")
    .eq("userId", auth.user.id)
    .eq("pathSessionId", sessionId)
    .maybeSingle();

  if (
    existing?.closingAcknowledgment &&
    existing?.closingSitWith
  ) {
    return jsonResponse(200, {
      ok: true,
      idempotent: true,
      acknowledgment: existing.closingAcknowledgment,
      sitWith: existing.closingSitWith,
      ctaText: existing.closingCta,
    });
  }

  const { data: sessionRow } = await service
    .from("pathSession")
    .select("id, title, pathId, index")
    .eq("id", sessionId)
    .maybeSingle();

  if (!sessionRow) return jsonResponse(404, { error: "Path session not found" });

  let pathName = typeof body.pathName === "string" ? body.pathName.trim() : "";
  if (!pathName && sessionRow.pathId) {
    const { data: pathRow } = await service
      .from("path")
      .select("name")
      .eq("id", sessionRow.pathId)
      .maybeSingle();
    pathName = typeof pathRow?.name === "string" ? pathRow.name : "Path";
  }

  let reflectionResponses =
    typeof body.reflectionResponses === "string" ? body.reflectionResponses.trim() : "";
  if (!reflectionResponses) {
    const { data: responses } = await service
      .from("pathResponse")
      .select("questionText, answerText")
      .eq("userId", auth.user.id)
      .eq("sessionId", sessionId);
    reflectionResponses = (responses ?? [])
      .map((r) => `Q: ${r.questionText ?? ""}\nA: ${r.answerText ?? ""}`)
      .join("\n\n");
  }

  if (!reflectionResponses.trim()) {
    return jsonResponse(400, { error: "No reflection responses found" });
  }

  const ctx = buildStandaloneUserContext(profile ?? {});
  const sessionNumber =
    typeof body.sessionNumber === "string" && body.sessionNumber.trim()
      ? body.sessionNumber.trim()
      : `Session ${sessionRow.index ?? "?"}`;
  const sessionTheme =
    typeof body.sessionTheme === "string" && body.sessionTheme.trim()
      ? body.sessionTheme.trim()
      : typeof sessionRow.title === "string"
        ? sessionRow.title
        : "Session";

  let closing;
  try {
    closing = await generatePathClosingInsight({
      pathName: pathName || "Path",
      sessionNumber,
      sessionTheme,
      reflectionResponses,
      classification: ctx.classification,
      coachingMode: ctx.coachingMode,
      activeFlags: ctx.activeFlags,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    return jsonResponse(502, { error: message });
  }

  const enrollmentId =
    typeof body.enrollmentId === "string" ? body.enrollmentId : null;

  const { error: upsertError } = await service.from("pathSessionCompletion").upsert(
    {
      userId: auth.user.id,
      pathId: sessionRow.pathId ?? null,
      pathSessionId: sessionId,
      enrollmentId,
      closingAcknowledgment: closing.acknowledgment,
      closingSitWith: closing.sit_with,
      closingCta: closing.cta_text,
    },
    { onConflict: "userId,pathSessionId" },
  );

  if (upsertError) return jsonResponse(500, { error: upsertError.message });

  return jsonResponse(200, {
    ok: true,
    acknowledgment: closing.acknowledgment,
    sitWith: closing.sit_with,
    ctaText: closing.cta_text,
  });
});
