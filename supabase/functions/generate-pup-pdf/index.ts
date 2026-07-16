import { authenticateRequest } from "../_shared/supabase-auth.ts";
import { extractSubDimensions } from "./extractSubDimensions.ts";
import { generatePdfNarrative } from "./prompts.ts";
import { trajectoryLanguage } from "./trajectoryCopy.ts";
import {
  COACHING_DISCLAIMER,
  PUP_PDF_PAYLOAD_VERSION,
  type PupPdfNarrative,
  type PupPdfPathHistoryItem,
  type PupPdfPayload,
  type PupPdfReflection,
  type PupPdfScorePoint,
  type PupPdfTier,
} from "./types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REFLECTION_QUESTIONS: Array<{ field: string; question: string }> = [
  {
    field: "reflection_q1",
    question: "Looking back at the past 90 days, what shifted most for you?",
  },
  {
    field: "reflection_q2",
    question: "What are you still working on that feels unfinished?",
  },
  {
    field: "reflection_q3",
    question: "What did you do differently because of your coaching sessions?",
  },
  {
    field: "reflection_q4",
    question: "What do you want to focus on in the next 90 days?",
  },
];

function jsonResponse(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function resolvePdfTier(tierRaw: string | null | undefined): PupPdfTier | null {
  const tier = (tierRaw ?? "").toLowerCase().trim();
  if (tier === "premium") return "premium";
  if (tier === "pro") return "pro";
  return null;
}

function readSessionMemorySnippets(onboardingData: Record<string, unknown> | null): string[] {
  const raw = onboardingData?.chat_session_memory;
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(-5)
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const topic = typeof row.topic === "string" ? row.topic.trim() : "";
      const summary = typeof row.summaryStub === "string" ? row.summaryStub.trim() : "";
      if (!topic && !summary) return null;
      return `- ${topic}${summary ? `: ${summary}` : ""}`;
    })
    .filter((line): line is string => Boolean(line));
}

function readMicroCommitment(onboardingData: Record<string, unknown> | null): string | null {
  const keys = ["micro_commitment_active_text", "micro_commitment_active", "activeMicroCommitment"];
  for (const key of keys) {
    const value = onboardingData?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function buildReflections(row: Record<string, unknown>): PupPdfReflection[] {
  const answers = [
    row.reflectionQ1,
    row.reflectionQ2,
    row.reflectionQ3,
    row.reflectionQ4,
  ];
  return REFLECTION_QUESTIONS.map((q, i) => {
    const answer = typeof answers[i] === "string" ? String(answers[i]).trim() : "";
    return { field: q.field, question: q.question, answer };
  }).filter((r) => r.answer.length > 0);
}

function parseNarrative(raw: unknown): PupPdfNarrative | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const coachingContext =
    typeof obj.coachingContext === "string" ? obj.coachingContext.trim() : "";
  if (!coachingContext) return null;
  const generatedForTier =
    obj.generatedForTier === "pro" || obj.generatedForTier === "premium"
      ? obj.generatedForTier
      : undefined;
  return {
    generatedForTier,
    coachingContext,
    coachingSummary:
      typeof obj.coachingSummary === "string" ? obj.coachingSummary.trim() : null,
    nextFocus: typeof obj.nextFocus === "string" ? obj.nextFocus.trim() : null,
  };
}

function narrativeMatchesTier(
  narrative: PupPdfNarrative | null,
  pdfTier: PupPdfTier,
): boolean {
  if (!narrative) return false;
  if (narrative.generatedForTier && narrative.generatedForTier !== pdfTier) {
    return false;
  }
  if (pdfTier === "premium" && (!narrative.coachingSummary || !narrative.nextFocus)) {
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const auth = await authenticateRequest(req);
    if (!auth) return jsonResponse(401, { error: "Unauthorized", code: "unauthorized" });

    const body = (await req.json().catch(() => ({}))) as {
      assessmentResultId?: unknown;
      force?: unknown;
    };
    const assessmentResultId =
      typeof body.assessmentResultId === "string" ? body.assessmentResultId.trim() : "";
    if (!assessmentResultId) {
      return jsonResponse(400, { error: "assessmentResultId is required" });
    }
    const force = body.force === true;

    const { data: assessment, error: assessmentError } = await auth.supabase
      .from("assessmentResult")
      .select("*")
      .eq("id", assessmentResultId)
      .eq("userId", auth.user.id)
      .maybeSingle();

    if (assessmentError) throw assessmentError;
    if (!assessment) return jsonResponse(404, { error: "Assessment not found" });
    if (assessment.isInitial === true) {
      return jsonResponse(400, { error: "PDF reports are only available after reassessment" });
    }

    const { data: profile, error: profileError } = await auth.supabase
      .from("profiles")
      .select(
        "firstName, tier, subscribed, behavioralFingerprint, onboardingData, results",
      )
      .eq("id", auth.user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) return jsonResponse(404, { error: "Profile not found" });

    const pdfTier = resolvePdfTier(profile.tier);
    if (!pdfTier) {
      return jsonResponse(403, {
        error: "PuP 360 PDF is available on Pro and Premium plans",
        code: "tier_forbidden",
      });
    }

    const onboardingData =
      (profile.onboardingData as Record<string, unknown> | null) ?? null;
    const rawResults =
      (assessment.rawResults as Record<string, unknown> | null) ??
      (profile.results as Record<string, unknown> | null) ??
      {};
    const classificationObj =
      rawResults.classification && typeof rawResults.classification === "object"
        ? (rawResults.classification as Record<string, unknown>)
        : {};

    const classificationName =
      (typeof assessment.classification === "string" && assessment.classification) ||
      (typeof classificationObj.name === "string" && classificationObj.name) ||
      "Classification";
    const classificationDescription =
      typeof classificationObj.description === "string"
        ? classificationObj.description
        : "";
    const focusAreas = Array.isArray(classificationObj.focusAreas)
      ? classificationObj.focusAreas.filter((x): x is string => typeof x === "string").slice(0, 3)
      : [];

    const scores = {
      stability: Number(assessment.stabilityScore ?? rawResults.stability_score ?? 0),
      performance: Number(assessment.performanceScore ?? rawResults.performance_score ?? 0),
      alignment: Number(assessment.alignmentScore ?? rawResults.alignment_score ?? 0),
      orientation:
        assessment.orientationScore != null
          ? Number(assessment.orientationScore)
          : typeof rawResults.orientation_score === "number"
            ? rawResults.orientation_score
            : null,
    };

    const trajectoryType =
      typeof assessment.trajectoryType === "string" ? assessment.trajectoryType : null;
    const reflections = buildReflections(assessment as Record<string, unknown>);

    const { data: historyRows } = await auth.supabase
      .from("assessmentResult")
      .select(
        "assessmentDate, stabilityScore, performanceScore, alignmentScore, classification",
      )
      .eq("userId", auth.user.id)
      .order("assessmentDate", { ascending: true });

    const scoreTrend: PupPdfScorePoint[] = (historyRows ?? []).map((row) => ({
      date: String(row.assessmentDate),
      stability: row.stabilityScore != null ? Number(row.stabilityScore) : null,
      performance: row.performanceScore != null ? Number(row.performanceScore) : null,
      alignment: row.alignmentScore != null ? Number(row.alignmentScore) : null,
      classification: typeof row.classification === "string" ? row.classification : null,
    }));

    let pathHistory: PupPdfPathHistoryItem[] = [];
    if (pdfTier === "premium") {
      const { data: enrollments } = await auth.supabase
        .from("pathEnrollment")
        .select("status, completedSessionsCount, pathId")
        .eq("userId", auth.user.id);

      const pathIds = (enrollments ?? [])
        .map((e) => (typeof e.pathId === "string" ? e.pathId : null))
        .filter((id): id is string => Boolean(id));

      const pathNameById = new Map<string, string>();
      if (pathIds.length > 0) {
        const { data: paths } = await auth.supabase
          .from("path")
          .select("id, name")
          .in("id", pathIds);
        for (const p of paths ?? []) {
          if (typeof p.id === "string" && typeof p.name === "string") {
            pathNameById.set(p.id, p.name);
          }
        }
      }

      pathHistory = (enrollments ?? []).map((e) => ({
        pathName:
          (typeof e.pathId === "string" && pathNameById.get(e.pathId)) || "Path",
        status: typeof e.status === "string" ? e.status : "unknown",
        completedSessionsCount: Number(e.completedSessionsCount ?? 0) || 0,
      }));
    }

    let narrative = !force ? parseNarrative(assessment.pdfNarrative) : null;
    if (narrative && !narrativeMatchesTier(narrative, pdfTier)) {
      narrative = null;
    }
    if (!narrative) {
      const generated = await generatePdfNarrative({
        tier: pdfTier,
        firstName: profile.firstName?.trim() || "there",
        scores,
        classificationName,
        trajectoryType,
        trajectoryStatement: trajectoryLanguage(trajectoryType),
        reflections: reflections.map((r) => ({ question: r.question, answer: r.answer })),
        sessionMemorySnippets: readSessionMemorySnippets(onboardingData),
        pathHistoryLines: pathHistory.map(
          (p) => `- ${p.pathName} (${p.status}, ${p.completedSessionsCount} sessions)`,
        ),
      });
      narrative = { ...generated, generatedForTier: pdfTier };

      await auth.supabase
        .from("assessmentResult")
        .update({ pdfNarrative: narrative as unknown as never })
        .eq("id", assessmentResultId)
        .eq("userId", auth.user.id);
    }

    const payload: PupPdfPayload = {
      version: PUP_PDF_PAYLOAD_VERSION,
      tier: pdfTier,
      assessmentResultId,
      firstName: profile.firstName?.trim() || "Member",
      assessmentDate: String(assessment.assessmentDate),
      platformName: "Uncloud360",
      scores,
      classificationName,
      classificationDescription,
      focusAreas,
      trajectoryType,
      trajectoryStatement: trajectoryLanguage(trajectoryType),
      microCommitment: readMicroCommitment(onboardingData),
      reflections,
      disclaimer: COACHING_DISCLAIMER,
      narrative,
      ...(pdfTier === "premium"
        ? {
            subDimensions: extractSubDimensions(assessment.rawScores),
            scoreTrend,
            behavioralFingerprint:
              typeof profile.behavioralFingerprint === "string"
                ? profile.behavioralFingerprint
                : null,
            pathHistory,
            premiumBranding: true,
          }
        : {}),
    };

    return jsonResponse(200, { payload });
  } catch (err) {
    console.error("generate-pup-pdf error", err);
    const message = err instanceof Error ? err.message : "PDF generation failed";
    return jsonResponse(500, { error: message });
  }
});
