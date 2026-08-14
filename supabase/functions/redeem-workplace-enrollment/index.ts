/**
 * Phase 2 §9 — redeem workplace enrollment code (employee onboarding / settings).
 *
 * POST /functions/v1/redeem-workplace-enrollment
 * Body: { "code": "ACME26" }
 *
 * Rate limit is Postgres-backed (consume_edge_rate_limit) so it holds across Edge isolates.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

import { cancelIndividualStripeOnEnterpriseConvert } from "../_shared/cancelIndividualStripeOnEnterprise.ts";
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const allowed = await consumeEdgeRateLimit(
      admin,
      `redeem:user:${authData.user.id}`,
      EDGE_RATE_LIMIT_MAX_ATTEMPTS,
      EDGE_RATE_LIMIT_WINDOW_SECONDS,
    );
    if (!allowed) {
      return json({ error: "Too many enrollment attempts. Try again shortly." }, 429);
    }
  } catch {
    return json({ error: "Unable to process enrollment right now." }, 500);
  }

  const { data, error } = await userClient.rpc("redeem_workplace_enrollment_code", {
    p_code: code,
  });

  if (error) {
    return json({ error: "Unable to process enrollment right now." }, 500);
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
      await cancelIndividualStripeOnEnterpriseConvert(admin, authData.user.id);
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
