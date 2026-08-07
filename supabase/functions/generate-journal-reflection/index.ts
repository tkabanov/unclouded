/**
 * Prompt 2 — Journal Reflection (standalone API call).
 * POST { entryId: string }
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { authenticateRequest } from "../_shared/supabase-auth.ts";
import {
  buildStandaloneUserContext,
  canUseStandaloneProPrompts,
  generateJournalReflectionText,
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const auth = await authenticateRequest(req);
  if (!auth) return jsonResponse(401, { error: "Unauthorized" });

  let entryId: string | null = null;
  try {
    const body = (await req.json()) as { entryId?: string };
    entryId = typeof body.entryId === "string" ? body.entryId : null;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }
  if (!entryId) return jsonResponse(400, { error: "entryId is required" });

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("tier, results, onboardingData")
    .eq("id", auth.user.id)
    .maybeSingle();

  const tier = normalizeStandaloneTier(profile?.tier);
  if (!canUseStandaloneProPrompts(tier)) {
    return jsonResponse(403, {
      error: "AI journal reflection is available on Pro and Premium plans.",
      code: "journal_reflection_tier_required",
    });
  }

  const { data: entry, error: entryError } = await auth.supabase
    .from("journalEntry")
    .select("id, content, title, aiReflection, reflectionReady")
    .eq("id", entryId)
    .eq("userId", auth.user.id)
    .maybeSingle();

  if (entryError) return jsonResponse(500, { error: entryError.message });
  if (!entry) return jsonResponse(404, { error: "Journal entry not found" });

  if (
    entry.reflectionReady === true &&
    typeof entry.aiReflection === "string" &&
    entry.aiReflection.trim()
  ) {
    return jsonResponse(200, {
      ok: true,
      entryId,
      reflection: entry.aiReflection.trim(),
      idempotent: true,
    });
  }

  const journalText = [entry.title, entry.content]
    .filter((v): v is string => typeof v === "string" && Boolean(v.trim()))
    .join("\n\n");
  if (!journalText.trim()) {
    return jsonResponse(400, { error: "Journal entry is empty" });
  }

  const ctx = buildStandaloneUserContext(profile ?? {});

  let reflection: string;
  try {
    reflection = await generateJournalReflectionText({
      journalEntry: journalText,
      classification: ctx.classification,
      coachingMode: ctx.coachingMode,
      activeFlags: ctx.activeFlags,
    });
  } catch (error) {
    // One retry after brief delay (spec: retry once).
    await new Promise((r) => setTimeout(r, 800));
    try {
      reflection = await generateJournalReflectionText({
        journalEntry: journalText,
        classification: ctx.classification,
        coachingMode: ctx.coachingMode,
        activeFlags: ctx.activeFlags,
      });
    } catch {
      const message = error instanceof Error ? error.message : "Generation failed";
      return jsonResponse(502, { error: message });
    }
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  if (!serviceKey || !supabaseUrl) {
    return jsonResponse(500, { error: "Missing service role configuration" });
  }
  const service = createClient(supabaseUrl, serviceKey);

  const { error: updateError } = await service
    .from("journalEntry")
    .update({
      aiReflection: reflection,
      reflectionReady: true,
    })
    .eq("id", entryId)
    .eq("userId", auth.user.id);

  if (updateError) return jsonResponse(500, { error: updateError.message });

  return jsonResponse(200, { ok: true, entryId, reflection });
});
