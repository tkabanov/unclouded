/**
 * Phase 2 §9 / US-206 — HR + admin enrollment code management.
 *
 * POST /functions/v1/employer-enrollment-codes
 * Body: { "workplaceId": "<uuid>", "action": "list" | "create" | "deactivate", "codeId"?: "<uuid>" }
 */
import { createClient } from "npm:@supabase/supabase-js@2";

import { canAccessWorkplaceHrPortal } from "../_shared/workplaceHrAuth.ts";
import {
  countActiveSeats,
  createWorkplaceEnrollmentCode,
  deactivateWorkplaceEnrollmentCode,
  listWorkplaceEnrollmentCodes,
} from "../_shared/workplaceEnrollmentLogic.ts";
import { isValidUuid } from "../_shared/uuidHelpers.ts";

type ActionBody = {
  workplaceId?: string;
  action?: "list" | "create" | "deactivate";
  codeId?: string;
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

  let body: ActionBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const workplaceId = body.workplaceId?.trim();
  const action = body.action;
  if (!workplaceId || !isValidUuid(workplaceId)) {
    return json({ error: "Valid workplaceId is required" }, 400);
  }
  if (action !== "list" && action !== "create" && action !== "deactivate") {
    return json({ error: "action must be list, create, or deactivate" }, 400);
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
    admin
      .from("workplace")
      .select('id, name, "contactEmail", "seatCount"')
      .eq("id", workplaceId)
      .maybeSingle(),
  ]);

  if (workplaceError) {
    return json({ error: workplaceError.message }, 500);
  }
  if (!workplace) {
    return json({ error: "Workplace not found" }, 404);
  }

  const userEmail = profile?.email ?? authData.user.email ?? null;
  const allowed = await canAccessWorkplaceHrPortal(admin, {
    userId: authData.user.id,
    userEmail,
    roleType: profile?.roleType ?? null,
    workplaceId,
    workplaceContactEmail: workplace.contactEmail ?? null,
  });
  if (!allowed) {
    return json({ error: "Forbidden" }, 403);
  }

  try {
    if (action === "list") {
      const [codes, activeSeats] = await Promise.all([
        listWorkplaceEnrollmentCodes(admin, workplaceId),
        countActiveSeats(admin, workplaceId),
      ]);
      return json({
        ok: true,
        workplace: {
          id: workplace.id,
          name: workplace.name,
          seatCount: workplace.seatCount ?? 0,
          activeSeats,
        },
        codes,
      });
    }

    if (action === "create") {
      const created = await createWorkplaceEnrollmentCode(admin, {
        workplaceId,
        createdByUserId: authData.user.id,
      });
      const activeSeats = await countActiveSeats(admin, workplaceId);
      return json({
        ok: true,
        code: created,
        activeSeats,
        seatCount: workplace.seatCount ?? 0,
      });
    }

    const codeId = body.codeId?.trim();
    if (!codeId || !isValidUuid(codeId)) {
      return json({ error: "codeId is required for deactivate" }, 400);
    }
    await deactivateWorkplaceEnrollmentCode(admin, codeId, workplaceId);
    const codes = await listWorkplaceEnrollmentCodes(admin, workplaceId);
    return json({ ok: true, codes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return json({ error: message }, 500);
  }
});
