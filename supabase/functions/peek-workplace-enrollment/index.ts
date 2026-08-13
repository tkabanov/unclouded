/**
 * Public peek for /join/:code — rate-limited wrapper around peek_workplace_enrollment_code.
 *
 * POST /functions/v1/peek-workplace-enrollment
 * Body: { "code": "ACME26" }
 * Auth: none (verify_jwt = false); uses service role for RPC after revoke of anon grants.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

import {
  isValidEnrollmentCodeFormat,
  normalizeEnrollmentCode,
} from "../_shared/workplaceEnrollmentHelpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Simple per-bucket peek attempt window (edge isolate memory). */
const peekAttempts = new Map<string, { count: number; windowStart: number }>();
const PEEK_WINDOW_MS = 60_000;
const PEEK_MAX_ATTEMPTS = 12;

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

function allowPeekAttempt(bucket: string): boolean {
  const now = Date.now();
  const entry = peekAttempts.get(bucket);
  if (!entry || now - entry.windowStart > PEEK_WINDOW_MS) {
    peekAttempts.set(bucket, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= PEEK_MAX_ATTEMPTS) return false;
  entry.count += 1;
  return true;
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

  const ip = clientIp(req);
  const ipOk = allowPeekAttempt(`ip:${ip}`);
  const codeOk = allowPeekAttempt(`code:${code}`);
  if (!ipOk || !codeOk) {
    return json({ error: "Too many enrollment lookups. Try again shortly." }, 429);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin.rpc("peek_workplace_enrollment_code", {
    p_code: code,
  });

  if (error) {
    return json({ error: error.message }, 500);
  }

  return json(data ?? { ok: false, error: "Invalid or inactive enrollment code." });
});
