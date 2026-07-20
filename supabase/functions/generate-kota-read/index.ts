import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { authenticateRequest } from "../_shared/supabase-auth.ts";
import {
  buildClassificationLine,
  buildKotaReadUserPrompt,
  buildPathsLine,
  buildScoresLine,
  formatKotaReadBrief,
  KOTA_READ_SYSTEM_PROMPT,
  parseKotaReadBrief,
  resolveOpenCommitmentLine,
  sessionMemoryToLines,
  type KotaReadContext,
} from "../_shared/kotaReadBrief.ts";
import { readSessionMemoryRecords } from "../chat/sessionMemory/sessionMemoryHelpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RequestBody = {
  bookingId?: string;
};

function jsonResponse(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchPathEnrollmentLines(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data: enrollments, error } = await supabase
    .from("pathEnrollment")
    .select("status, completedSessionsCount, pathId")
    .eq("userId", userId);

  if (error || !enrollments?.length) {
    return buildPathsLine([]);
  }

  const pathIds = enrollments
    .map((entry) => (typeof entry.pathId === "string" ? entry.pathId : null))
    .filter((id): id is string => Boolean(id));

  const pathNameById = new Map<string, string>();
  if (pathIds.length > 0) {
    const { data: paths } = await supabase.from("path").select("id, name").in("id", pathIds);
    for (const path of paths ?? []) {
      if (typeof path.id === "string" && typeof path.name === "string") {
        pathNameById.set(path.id, path.name);
      }
    }
  }

  return buildPathsLine(
    enrollments.map((entry) => ({
      pathName:
        (typeof entry.pathId === "string" && pathNameById.get(entry.pathId)) || "Path",
      status: typeof entry.status === "string" ? entry.status : "unknown",
      completedSessionsCount: Number(entry.completedSessionsCount ?? 0) || 0,
    })),
  );
}

async function buildKotaReadContext(
  supabase: SupabaseClient,
  userId: string,
  profile: {
    firstName?: string | null;
    results?: unknown;
    onboardingData?: unknown;
  },
  memoryFacts: Record<string, unknown> | null,
): Promise<KotaReadContext> {
  const onboardingData =
    profile.onboardingData && typeof profile.onboardingData === "object"
      ? (profile.onboardingData as Record<string, unknown>)
      : null;
  const results =
    profile.results && typeof profile.results === "object"
      ? (profile.results as Record<string, unknown>)
      : null;
  const sessionRecords = readSessionMemoryRecords(onboardingData);

  return {
    firstName: profile.firstName?.trim() || "Member",
    classificationLine: buildClassificationLine(results),
    scoresLine: buildScoresLine(results),
    pathsLine: await fetchPathEnrollmentLines(supabase, userId),
    openCommitmentLine: resolveOpenCommitmentLine(sessionRecords, onboardingData),
    sessionMemoryLines: sessionMemoryToLines(sessionRecords),
    memoryFactsJson: JSON.stringify(memoryFacts ?? {}),
  };
}

async function generateKotaRead(params: {
  apiKey: string;
  context: KotaReadContext;
}): Promise<string | null> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: KOTA_READ_SYSTEM_PROMPT },
        { role: "user", content: buildKotaReadUserPrompt(params.context) },
      ],
    }),
  });

  if (!response.ok) return null;

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) return null;

  const parsed = parseKotaReadBrief(content);
  if (!parsed) return null;

  return formatKotaReadBrief(parsed);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (!openaiKey) {
    return jsonResponse(500, { error: "Missing OPENAI_API_KEY" });
  }

  const auth = await authenticateRequest(req);
  if (!auth) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  let body: RequestBody = {};
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const bookingId = typeof body.bookingId === "string" ? body.bookingId : null;
  if (!bookingId) {
    return jsonResponse(400, { error: "bookingId is required" });
  }

  const { data: booking, error: bookingError } = await auth.supabase
    .from("coachBooking")
    .select("id, userId")
    .eq("id", bookingId)
    .eq("userId", auth.user.id)
    .maybeSingle();

  if (bookingError) {
    return jsonResponse(500, { error: bookingError.message });
  }
  if (!booking) {
    return jsonResponse(404, { error: "Booking not found" });
  }

  const [{ data: profile }, { data: memoryFacts }] = await Promise.all([
    auth.supabase
      .from("profiles")
      .select("firstName, results, onboardingData")
      .eq("id", auth.user.id)
      .maybeSingle(),
    auth.supabase
      .from("userMemoryFacts")
      .select("peopleInLife, userLanguage, openAvoidances, userInsights, statedGoals")
      .eq("userId", auth.user.id)
      .maybeSingle(),
  ]);

  const context = await buildKotaReadContext(
    auth.supabase,
    auth.user.id,
    profile ?? {},
    (memoryFacts as Record<string, unknown> | null) ?? null,
  );

  const kotaRead = await generateKotaRead({
    apiKey: openaiKey,
    context,
  });

  if (!kotaRead) {
    return jsonResponse(502, { error: "Failed to generate Kota's Read" });
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!serviceKey) {
    return jsonResponse(500, { error: "Missing SUPABASE_SERVICE_ROLE_KEY" });
  }

  const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const { error: updateError } = await serviceClient
    .from("coachBooking")
    .update({ kotaRead })
    .eq("id", bookingId)
    .eq("userId", auth.user.id);

  if (updateError) {
    return jsonResponse(500, { error: updateError.message });
  }

  return jsonResponse(200, { ok: true, bookingId, kotaRead });
});
