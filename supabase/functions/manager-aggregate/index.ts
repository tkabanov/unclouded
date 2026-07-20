/**
 * REQ-11 — manager team aggregate for opted-in direct reports.
 *
 * POST /functions/v1/manager-aggregate
 * Authorization: Bearer <user JWT>
 * Body: { "managerUserId"?: "<uuid>" } — admin smoke only; managers use their own id.
 *
 * Access: `managesATeam = true` manager viewing own direct reports, or settings admin preview.
 * Returns anonymized aggregates only — never individual scores or identities.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

import { computeManagerAggregateForDirectReports } from "../_shared/managerAggregateLogic.ts";

type AggregateBody = {
  managerUserId?: string;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
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

  let body: AggregateBody = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("roleType, managesATeam")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError) {
    return json({ error: profileError.message }, 500);
  }

  const isAdmin = profile?.roleType === "admin";
  const requestedManagerId = body.managerUserId?.trim();
  const managerUserId = isAdmin && requestedManagerId
    ? requestedManagerId
    : authData.user.id;

  if (!isAdmin && requestedManagerId && requestedManagerId !== authData.user.id) {
    return json({ error: "Forbidden" }, 403);
  }

  if (!isAdmin && profile?.managesATeam !== true) {
    return json({ error: "Forbidden — manager team view requires managesATeam" }, 403);
  }

  if (isAdmin && requestedManagerId) {
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("managesATeam")
      .eq("id", managerUserId)
      .maybeSingle();

    if (targetProfile?.managesATeam !== true) {
      return json({ error: "Target user is not flagged as managing a team" }, 400);
    }
  }

  try {
    const metrics = await computeManagerAggregateForDirectReports(admin, managerUserId);
    return json({ ok: true, managerUserId, metrics });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to compute manager aggregate";
    return json({ error: message }, 500);
  }
});
