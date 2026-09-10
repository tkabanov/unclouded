/**
 * Register or refresh a push subscription (web VAPID or native FCM/APNs
 * device token) for the authenticated user.
 *
 * POST /functions/v1/register-push-subscription
 * Authorization: Bearer <user JWT>
 * Web body:    { endpoint, keys: { p256dh, auth }, platform?: "web", userAgent?: string }
 * Native body: { platform: "ios" | "android", deviceToken, appVersion? }
 *
 * MOB-08's schema (not yet applied) makes `endpoint`/`p256dh`/`auth` nullable
 * and adds `"deviceToken"`/`"appVersion"`/`"lastSeenAt"`, with a CHECK that a
 * `web` row must have the VAPID keys and no device token, and a native row
 * must have a device token and none of the VAPID keys — this function must
 * never write a row shape the CHECK would reject.
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
  deviceToken?: string;
  appVersion?: string;
};

type ParsedWebSubscription = {
  channel: "web";
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
};

type ParsedNativeSubscription = {
  channel: "native";
  platform: "ios" | "android";
  deviceToken: string;
  appVersion: string | null;
};

function parseBody(body: RegisterPushBody): ParsedWebSubscription | ParsedNativeSubscription | null {
  const platform = body.platform?.trim() || "web";

  if (platform === "ios" || platform === "android") {
    const deviceToken = body.deviceToken?.trim();
    if (!deviceToken) return null;
    return {
      channel: "native",
      platform,
      deviceToken,
      appVersion: body.appVersion?.trim() || null,
    };
  }

  if (platform !== "web") return null;

  const endpoint = body.endpoint?.trim();
  const p256dh = body.keys?.p256dh?.trim();
  const auth = body.keys?.auth?.trim();
  if (!endpoint || !p256dh || !auth) return null;

  return {
    channel: "web",
    endpoint,
    p256dh,
    auth,
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

  // Row owner is always the authenticated JWT user, never client-supplied.
  const row =
    parsed.channel === "web"
      ? {
          userId: authData.user.id,
          endpoint: parsed.endpoint,
          p256dh: parsed.p256dh,
          auth: parsed.auth,
          platform: "web",
          userAgent: parsed.userAgent,
          updatedAt: nowIso,
          lastSeenAt: nowIso,
        }
      : {
          userId: authData.user.id,
          platform: parsed.platform,
          deviceToken: parsed.deviceToken,
          appVersion: parsed.appVersion,
          updatedAt: nowIso,
          lastSeenAt: nowIso,
        };

  const onConflict = parsed.channel === "web" ? "endpoint" : "deviceToken";

  const { data, error } = await admin
    .from("pushDeviceSubscription")
    .upsert(row, { onConflict })
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
