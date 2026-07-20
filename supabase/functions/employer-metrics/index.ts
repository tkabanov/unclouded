/**
 * REQ-10 — anonymized employer continuous metrics (HR portal + admin smoke).
 *
 * POST /functions/v1/employer-metrics
 * Authorization: Bearer <user JWT>
 * Body: { "workplaceId": "<uuid>" }
 *
 * Access: settings admin (any workplace) or HR contact (`workplace.contactEmail` matches user email).
 * Returns aggregate metrics only — never individual employee data.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

import {
  EMPLOYER_MIN_COHORT_SIZE,
  fetchEmployerMetricsForWorkplace,
  type EmployerMetricSnapshot,
} from "../_shared/employerMetricsLogic.ts";
import { canAccessWorkplaceMetrics } from "../_shared/workplaceHrAuth.ts";
import { isValidUuid } from "../_shared/uuidHelpers.ts";

type MetricsBody = {
  workplaceId?: string;
};

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

  let body: MetricsBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const workplaceId = body.workplaceId?.trim();
  if (!workplaceId) {
    return json({ error: "workplaceId is required" }, 400);
  }
  if (!isValidUuid(workplaceId)) {
    return json(
      {
        error:
          "Invalid workplaceId — expected a database UUID. Recreate the workplace in Admin → Workplaces if this row was saved locally.",
      },
      400,
    );
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const [{ data: profile }, { data: workplace, error: workplaceError }] = await Promise.all([
    admin
      .from("profiles")
      .select("roleType, email")
      .eq("id", authData.user.id)
      .maybeSingle(),
    admin.from("workplace").select("id, name, contactEmail").eq("id", workplaceId).maybeSingle(),
  ]);

  if (workplaceError) {
    return json({ error: workplaceError.message }, 500);
  }
  if (!workplace) {
    return json({ error: "Workplace not found" }, 404);
  }

  const userEmail = profile?.email ?? authData.user.email ?? null;
  if (
    !canAccessWorkplaceMetrics({
      userEmail,
      roleType: profile?.roleType ?? null,
      workplaceContactEmail: workplace.contactEmail ?? null,
    })
  ) {
    return json({ error: "Forbidden" }, 403);
  }

  let metrics: EmployerMetricSnapshot;
  try {
    metrics = await fetchEmployerMetricsForWorkplace(admin, workplaceId, EMPLOYER_MIN_COHORT_SIZE);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to compute metrics";
    return json({ error: message }, 500);
  }

  return json({
    ok: true,
    workplace: {
      id: workplace.id,
      name: workplace.name,
    },
    metrics,
  });
});
