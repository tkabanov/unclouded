/**
 * Public peek for /join/:code — rate-limited wrapper around peek_workplace_enrollment_code.
 *
 * POST /functions/v1/peek-workplace-enrollment
 * Body: { "code": "ACME26" }
 * Auth: none (verify_jwt = false); uses service role for RPC after revoke of anon grants.
 *
 * Rate limit is Postgres-backed (consume_edge_rate_limit) so it holds across Edge isolates.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

import {
  consumeEdgeRateLimit,
  EDGE_RATE_LIMIT_MAX_ATTEMPTS,
  EDGE_RATE_LIMIT_WINDOW_SECONDS,
} from "../_shared/edgeRateLimit.ts";
import {
  isValidEnrollmentCodeFormat,
  normalizeEnrollmentCode,
} from "../_shared/workplaceEnrollmentHelpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

type PeekBody = { code?: string };

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

  let body: PeekBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const raw = typeof body.code === "string" ? body.code : "";
  const code = normalizeEnrollmentCode(raw);
  if (!isValidEnrollmentCodeFormat(code)) {
    return json({
      ok: false,
      error: "Invalid or inactive enrollment code.",
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const ip = clientIp(req);

  try {
    const ipOk = await consumeEdgeRateLimit(
      admin,
      `peek:ip:${ip}`,
      EDGE_RATE_LIMIT_MAX_ATTEMPTS,
      EDGE_RATE_LIMIT_WINDOW_SECONDS,
    );
    if (!ipOk) {
      return json({ error: "Too many enrollment lookups. Try again shortly." }, 429);
    }
    const codeOk = await consumeEdgeRateLimit(
      admin,
      `peek:code:${code}`,
      EDGE_RATE_LIMIT_MAX_ATTEMPTS,
      EDGE_RATE_LIMIT_WINDOW_SECONDS,
    );
    if (!codeOk) {
      return json({ error: "Too many enrollment lookups. Try again shortly." }, 429);
    }
  } catch {
    return json({ error: "Unable to validate enrollment code right now." }, 500);
  }

  const { data, error } = await admin.rpc("peek_workplace_enrollment_code", {
    p_code: code,
  });

  if (error) {
    return json({ error: "Unable to validate enrollment code right now." }, 500);
  }

  return json(data ?? { ok: false, error: "Invalid or inactive enrollment code." });
});
