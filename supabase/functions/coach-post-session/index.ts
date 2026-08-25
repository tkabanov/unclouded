/**
 * NCLDD-31 §6 — Public post-session coach form (peek + submit by token).
 *
 * POST /functions/v1/coach-post-session
 * Body: { token: string, action?: "peek" | "submit", notes?: string }
 * Auth: none (verify_jwt = false); rate-limited; RPCs via service role.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  consumeEdgeRateLimit,
  EDGE_RATE_LIMIT_MAX_ATTEMPTS,
  EDGE_RATE_LIMIT_WINDOW_SECONDS,
} from "../_shared/edgeRateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    req.headers.get("cf-connecting-ip")?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function parseToken(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return UUID_RE.test(trimmed) ? trimmed : null;
}

type RequestBody = {
  token?: string;
  action?: string;
  notes?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Missing Supabase env" }, 500);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const token = parseToken(body.token);
  if (!token) {
    return json({ ok: false, code: "not_found", error: "Session not found." });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const ip = clientIp(req);

  try {
    const allowed = await consumeEdgeRateLimit(
      supabase,
      `coach-post-session:${ip}`,
      EDGE_RATE_LIMIT_MAX_ATTEMPTS,
      EDGE_RATE_LIMIT_WINDOW_SECONDS,
    );
    if (!allowed) {
      return json({ ok: false, error: "Too many requests. Please try again shortly." }, 429);
    }
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : "Rate limit check failed" },
      500,
    );
  }

  const action = body.action === "submit" ? "submit" : "peek";

  if (action === "peek") {
    const { data, error } = await supabase.rpc("peek_coach_post_session", {
      p_token: token,
    });

    if (error) {
      return json({ error: error.message }, 500);
    }

    const row = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
    if (row.ok !== true) {
      return json({ ok: false, code: "not_found", error: "Session not found." });
    }

    return json(row);
  }

  const notes = typeof body.notes === "string" ? body.notes : "";
  const { data, error } = await supabase.rpc("submit_coach_post_session", {
    p_token: token,
    p_notes: notes,
  });

  if (error) {
    return json({ error: error.message }, 500);
  }

  const row = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  if (row.ok !== true) {
    const code = typeof row.code === "string" ? row.code : "submit_failed";
    if (code === "not_found") {
      return json({ ok: false, code, error: "Session not found." });
    }
    return json({
      ok: false,
      code,
      error:
        (typeof row.error === "string" && row.error) ||
        "Could not submit session notes.",
    });
  }

  return json(row);
});
