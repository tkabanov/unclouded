/**
 * HR assigns a Success Plan path to a workplace member (OVR-038).
 *
 * POST /functions/v1/workplace-assign-success-plan
 * Body: {
 *   workplaceId: string,
 *   action: "list" | "assign" | "unassign",
 *   userId?: string,
 *   pathId?: string,
 *   enrollmentId?: string
 * }
 */
import { createClient } from "npm:@supabase/supabase-js@2";

import {
  assertCanManageWorkplaceMembers,
  listWorkplaceMemberRecords,
  WorkplaceMemberError,
} from "../_shared/workplaceMemberLogic.ts";
import { isValidUuid } from "../_shared/uuidHelpers.ts";

type ActionBody = {
  workplaceId?: string;
  action?: "list" | "assign" | "unassign";
  userId?: string;
  pathId?: string;
  enrollmentId?: string;
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

async function listSuccessPlans(admin: ReturnType<typeof createClient>) {
  const { data, error } = await admin
    .from("path")
    .select("id, name, sessionsCount, subMode, triggerSignals, isActive")
    .eq("isActive", true)
    .or("subMode.eq.success_plan,triggerSignals.ilike.%path_type:success_plan%");

  if (error) throw error;
  return (data ?? []).filter((row) => {
    const sub = (row.subMode ?? "").toLowerCase();
    const signals = (row.triggerSignals ?? "").toLowerCase();
    return sub === "success_plan" || signals.includes("path_type:success_plan");
  });
}

async function listAssignments(
  admin: ReturnType<typeof createClient>,
  workplaceId: string,
) {
  const { data, error } = await admin
    .from("pathEnrollment")
    .select(
      "id, userId, pathId, status, source, assignedByWorkplaceId, assignedByUserId, createdAt",
    )
    .eq("assignedByWorkplaceId", workplaceId)
    .eq("source", "hr_assign")
    .neq("status", "abandoned");

  if (error) throw error;
  return data ?? [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "Missing Supabase env" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!jwt) return json({ error: "Unauthorized" }, 401);

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
  if (action !== "list" && action !== "assign" && action !== "unassign") {
    return json({ error: "Invalid action" }, 400);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: profile } = await admin
    .from("profiles")
    .select("roleType, email")
    .eq("id", authData.user.id)
    .maybeSingle();

  try {
    const { workplace } = await assertCanManageWorkplaceMembers(admin, {
      userId: authData.user.id,
      userEmail: profile?.email ?? authData.user.email ?? null,
      roleType: profile?.roleType ?? null,
      workplaceId,
    });

    if (action === "list") {
      const [plans, assignments, members] = await Promise.all([
        listSuccessPlans(admin),
        listAssignments(admin, workplaceId),
        listWorkplaceMemberRecords(admin, workplaceId, workplace.contactEmail),
      ]);
      return json({ ok: true, workplace, plans, assignments, members });
    }

    if (action === "unassign") {
      const enrollmentId = body.enrollmentId?.trim();
      if (!enrollmentId || !isValidUuid(enrollmentId)) {
        return json({ error: "Valid enrollmentId is required" }, 400);
      }

      const { data: enrollment, error: fetchError } = await admin
        .from("pathEnrollment")
        .select("id, assignedByWorkplaceId, source")
        .eq("id", enrollmentId)
        .maybeSingle();
      if (fetchError) throw fetchError;
      if (
        !enrollment ||
        enrollment.assignedByWorkplaceId !== workplaceId ||
        enrollment.source !== "hr_assign"
      ) {
        return json({ error: "Assignment not found" }, 404);
      }

      const { error: updateError } = await admin
        .from("pathEnrollment")
        .update({ status: "abandoned" })
        .eq("id", enrollmentId);
      if (updateError) throw updateError;

      const assignments = await listAssignments(admin, workplaceId);
      return json({ ok: true, assignments });
    }

    // assign
    const userId = body.userId?.trim();
    const pathId = body.pathId?.trim();
    if (!userId || !isValidUuid(userId)) {
      return json({ error: "Valid userId is required" }, 400);
    }
    if (!pathId || !isValidUuid(pathId)) {
      return json({ error: "Valid pathId is required" }, 400);
    }

    const members = await listWorkplaceMemberRecords(
      admin,
      workplaceId,
      workplace.contactEmail,
    );
    const member = members.find(
      (row) => row.memberStatus === "active" && row.userId === userId,
    );
    if (!member) {
      return json({ error: "User is not an active workplace member" }, 400);
    }

    const { data: pathRow, error: pathError } = await admin
      .from("path")
      .select("id, subMode, triggerSignals, isActive")
      .eq("id", pathId)
      .maybeSingle();
    if (pathError) throw pathError;
    if (!pathRow || pathRow.isActive === false) {
      return json({ error: "Path not found" }, 404);
    }
    const sub = (pathRow.subMode ?? "").toLowerCase();
    const signals = (pathRow.triggerSignals ?? "").toLowerCase();
    if (sub !== "success_plan" && !signals.includes("path_type:success_plan")) {
      return json({ error: "Only Success Plan paths can be assigned" }, 400);
    }

    const { data: existing } = await admin
      .from("pathEnrollment")
      .select("id, status, source")
      .eq("userId", userId)
      .eq("pathId", pathId)
      .neq("status", "abandoned")
      .maybeSingle();

    if (existing?.id) {
      if (existing.source === "hr_assign") {
        return json({ error: "Already assigned", enrollmentId: existing.id }, 409);
      }
      return json(
        { error: "Employee is already enrolled in this path", enrollmentId: existing.id },
        409,
      );
    }

    const { data: sessions } = await admin
      .from("pathSession")
      .select("id")
      .eq("pathId", pathId)
      .order("index", { ascending: true })
      .limit(1);

    const firstSessionId = sessions?.[0]?.id ?? null;
    const enrollmentId = crypto.randomUUID();

    const { error: insertError } = await admin.from("pathEnrollment").insert({
      id: enrollmentId,
      userId,
      pathId,
      status: "active",
      source: "hr_assign",
      assignedByWorkplaceId: workplaceId,
      assignedByUserId: authData.user.id,
      completedSessionsCount: 0,
      currentSessionId: firstSessionId,
      focusedMicroCommitmentSessionId: null,
      isMicroCommitmentInFocus: false,
    });
    if (insertError) throw insertError;

    const assignments = await listAssignments(admin, workplaceId);
    return json({ ok: true, enrollmentId, assignments });
  } catch (error) {
    if (error instanceof WorkplaceMemberError) {
      return json({ error: error.message }, error.status);
    }
    const message =
      error instanceof Error ? error.message : "Failed to manage Success Plan assignments";
    console.error("workplace-assign-success-plan failed", error);
    return json({ error: message }, 500);
  }
});
