/**
 * Phase 2 §9 — redeem workplace enrollment code (employee onboarding / settings).
 *
 * POST /functions/v1/redeem-workplace-enrollment
 * Body: { "code": "ACME26" }
 */
import { createClient } from "npm:@supabase/supabase-js@2";

import { cancelIndividualStripeOnEnterpriseConvert } from "../_shared/cancelIndividualStripeOnEnterprise.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Simple per-user redeem attempt window (edge isolate memory). */
const redeemAttempts = new Map<string, { count: number; windowStart: number }>();
const REDEEM_WINDOW_MS = 60_000;
const REDEEM_MAX_ATTEMPTS = 12;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function allowRedeemAttempt(userId: string): boolean {
  const now = Date.now();
  const entry = redeemAttempts.get(userId);
  if (!entry || now - entry.windowStart > REDEEM_WINDOW_MS) {
    redeemAttempts.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= REDEEM_MAX_ATTEMPTS) return false;
  entry.count += 1;
  return true;
}

type RedeemBody = { code?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "Missing Supabase env" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!jwt) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: RedeemBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const code = body.code?.trim();
  if (!code) {
    return json({ error: "code is required" }, 400);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!allowRedeemAttempt(authData.user.id)) {
    return json({ error: "Too many enrollment attempts. Try again shortly." }, 429);
  }

  const { data, error } = await userClient.rpc("redeem_workplace_enrollment_code", {
    p_code: code,
  });

  if (error) {
    return json({ error: error.message }, 500);
  }

  const payload = data as Record<string, unknown> | null;
  if (!payload?.ok) {
    const status = typeof payload?.status === "number" ? payload.status : 400;
    return json(
      {
        ok: false,
        error: typeof payload?.error === "string" ? payload.error : "Enrollment failed.",
      },
      status,
    );
  }

  // Paid individual → enterprise: cancel Stripe immediately (Part C §31).
  if (payload.alreadyEnrolled !== true) {
    try {
      const service = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await cancelIndividualStripeOnEnterpriseConvert(service, authData.user.id);
    } catch (err) {
      console.error("redeem-workplace-enrollment: Stripe cancel post-step failed", err);
    }
  }

  return json({
    ok: true,
    workplaceId: payload.workplaceId,
    workplaceName: payload.workplaceName,
    enterpriseTier: payload.enterpriseTier,
    alreadyEnrolled: payload.alreadyEnrolled === true,
  });
});
