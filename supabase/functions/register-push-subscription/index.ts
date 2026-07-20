/**
 * Register or refresh a Web Push subscription for the authenticated user.
 *
 * POST /functions/v1/register-push-subscription
 * Authorization: Bearer <user JWT>
 * Body: { endpoint, keys: { p256dh, auth }, platform?: "web", userAgent?: string }
 */
import { createClient } from "npm:@supabase/supabase-js@2";

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

type RegisterPushBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
  platform?: string;
  userAgent?: string;
};

function parseBody(body: RegisterPushBody): {
  endpoint: string;
  p256dh: string;
  auth: string;
  platform: string;
  userAgent: string | null;
} | null {
  const endpoint = body.endpoint?.trim();
  const p256dh = body.keys?.p256dh?.trim();
  const auth = body.keys?.auth?.trim();
  if (!endpoint || !p256dh || !auth) return null;

  const platform = body.platform?.trim() || "web";
  if (platform !== "web") return null;

  return {
    endpoint,
    p256dh,
    auth,
    platform,
    userAgent: body.userAgent?.trim() || null,
  };
}

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

  let body: RegisterPushBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return json({ error: "Invalid subscription payload" }, 400);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("pushDeviceSubscription")
    .upsert(
      {
        userId: authData.user.id,
        endpoint: parsed.endpoint,
        p256dh: parsed.p256dh,
        auth: parsed.auth,
        platform: parsed.platform,
        userAgent: parsed.userAgent,
        updatedAt: nowIso,
      },
      { onConflict: "endpoint" },
    )
    .select("id")
    .maybeSingle();

  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({
    ok: true,
    subscriptionId: data?.id ?? null,
    registeredAt: nowIso,
  });
});
