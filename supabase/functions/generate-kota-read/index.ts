import { authenticateRequest } from "../_shared/supabase-auth.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RequestBody = {
  bookingId?: string;
  conversationId?: string;
};

function jsonResponse(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

async function generateKotaRead(params: {
  apiKey: string;
  memoryFacts: Record<string, unknown> | null;
  sessionMemory: string[];
}): Promise<string | null> {
  const facts = params.memoryFacts ?? {};
  const prompt = [
    "Write a brief 'Kota's Read' coaching prep note (3-5 sentences) for a human coach.",
    "Session memory:",
    params.sessionMemory.length > 0 ? params.sessionMemory.join("\n") : "(none)",
    "Long-term memory facts:",
    JSON.stringify(facts),
  ].join("\n\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: "You are Kota, an AI coaching assistant preparing a concise coach handoff brief.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) return null;

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  return typeof content === "string" && content.trim() ? content.trim() : null;
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
    auth.supabase.from("profiles").select("onboardingData").eq("id", auth.user.id).maybeSingle(),
    auth.supabase
      .from("userMemoryFacts")
      .select("peopleInLife, userLanguage, openAvoidances, userInsights, statedGoals")
      .eq("userId", auth.user.id)
      .maybeSingle(),
  ]);

  const onboardingData =
    profile?.onboardingData && typeof profile.onboardingData === "object"
      ? (profile.onboardingData as Record<string, unknown>)
      : null;

  const kotaRead = await generateKotaRead({
    apiKey: openaiKey,
    memoryFacts: (memoryFacts as Record<string, unknown> | null) ?? null,
    sessionMemory: readSessionMemorySnippets(onboardingData),
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
