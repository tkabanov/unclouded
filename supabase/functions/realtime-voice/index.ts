import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { authenticateRequest } from "../_shared/supabase-auth.ts";
import { getServiceClient } from "../_shared/serviceClient.ts";
import { consumeEdgeRateLimit } from "../_shared/edgeRateLimit.ts";
import { buildUserSystemPrompt } from "../chat/buildUserSystemPrompt.ts";
import { handleRealtimeAction, isRealtimeAction, type RealtimeContext } from "./handlers.ts";
import { DEFAULT_REALTIME_MODEL, DEFAULT_REALTIME_TRANSCRIBE_MODEL } from "./sessionConfig.ts";
import { REALTIME_TOOLS } from "./tools/registry.ts";

/**
 * NCLDD-57 S3 — Conversation mode server (OpenAI Realtime, unified interface). Dispatch on
 * `body.action`: start | connected | heartbeat | usage | transcript | tool | end (plan §5.2).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Per user per 60 s (plan §5.2): `start` is expensive, the rest run every few seconds. */
const RATE_LIMIT_START = 6;
const RATE_LIMIT_OTHER = 120;
/** `end` has its own bucket so a burst of transcript/usage calls can't block closing the call. */
const RATE_LIMIT_END = 30;
/** Largest valid body is ~420 KB (50 transcript items x 8000 chars + SDP); anything above is refused. */
const MAX_BODY_BYTES = 512 * 1024;
const RATE_LIMIT_WINDOW_SECONDS = 60;

function json(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(status: number, error: string, code?: string): Response {
  return json(status, code ? { error, code } : { error });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonError(405, "Method not allowed");

  try {
    const auth = await authenticateRequest(req);
    if (!auth) return jsonError(401, "Unauthorized");

    const declared = Number(req.headers.get("Content-Length") ?? "0");
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return jsonError(413, "Request too large");
    let body: Record<string, unknown>;
    try {
      const raw = await req.text();
      if (raw.length > MAX_BODY_BYTES) return jsonError(413, "Request too large");
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return jsonError(400, "Invalid JSON body");
      body = parsed as Record<string, unknown>;
    } catch {
      return jsonError(400, "Invalid JSON body");
    }

    const action = body.action;
    if (!isRealtimeAction(action)) return jsonError(400, "Unknown action", "invalid_request");

    const admin: SupabaseClient = getServiceClient();
    const bucket = action === "start" || action === "end" ? action : "call";
    const limit = action === "start" ? RATE_LIMIT_START : action === "end" ? RATE_LIMIT_END : RATE_LIMIT_OTHER;
    const allowed = await consumeEdgeRateLimit(
      admin,
      `realtime-voice:${bucket}:${auth.user.id}`,
      limit,
      RATE_LIMIT_WINDOW_SECONDS,
    );
    if (!allowed) return jsonError(429, "Too many requests. Please try again shortly.", "rate_limited");

    const ctx: RealtimeContext = {
      userClient: auth.supabase,
      admin,
      userId: auth.user.id,
      env: {
        apiKey: Deno.env.get("OPENAI_API_KEY")?.trim() || null,
        model: Deno.env.get("OPENAI_REALTIME_MODEL")?.trim() || DEFAULT_REALTIME_MODEL,
        transcribeModel: Deno.env.get("OPENAI_REALTIME_TRANSCRIBE_MODEL")?.trim() || DEFAULT_REALTIME_TRANSCRIBE_MODEL,
      },
      fetch,
      now: () => new Date(),
      tools: REALTIME_TOOLS,
      buildPrompt: buildUserSystemPrompt,
    };

    const result = await handleRealtimeAction(ctx, action, body);
    return json(result.status, result.body);
  } catch (err) {
    // Log the message only: it never contains the API key, the prompt or OpenAI response bodies.
    console.error("realtime-voice error", err instanceof Error ? err.message : "unknown");
    return jsonError(500, "Conversation request failed");
  }
});
