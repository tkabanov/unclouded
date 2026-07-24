/**
 * Admin + HR workplace roster — assign, invite, and delegate HR/manager roles.
 *
 * POST /functions/v1/workplace-members
 * Body: {
 *   workplaceId: string,
 *   action: "list" | "assign" | "invite" | "cancelInvite" | "unassign" | "setRole",
 *   email?: string,
 *   invitationId?: string,
 *   userId?: string,
 *   role?: "hr" | "manager",
 *   enabled?: boolean
 * }
 */
import { createClient } from "npm:@supabase/supabase-js@2";

import {
  addWorkplaceMemberByEmail,
  assertCanManageWorkplaceMembers,
  cancelWorkplaceInvitation,
  listWorkplaceMemberRecords,
  sendWorkplaceInvitationEmail,
  setWorkplaceMemberRole,
  unassignWorkplaceMember,
  WorkplaceMemberError,
} from "../_shared/workplaceMemberLogic.ts";
import { isValidUuid } from "../_shared/uuidHelpers.ts";

type ActionBody = {
  workplaceId?: string;
  action?: "list" | "assign" | "invite" | "cancelInvite" | "unassign" | "setRole";
  email?: string;
  invitationId?: string;
  userId?: string;
  role?: "hr" | "manager";
  enabled?: boolean;
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

async function addOrInviteMember(
  userClient: ReturnType<typeof createClient>,
  admin: ReturnType<typeof createClient>,
  workplaceId: string,
  email: string,
) {
  const result = await addWorkplaceMemberByEmail(userClient, workplaceId, email);

  if (result.mode === "invited") {
    const inviteEmail = await sendWorkplaceInvitationEmail(admin, result.email);
    return {
      mode: "invited" as const,
      alreadyEnrolled: false,
      invitationId: result.invitationId,
      emailSent: inviteEmail.emailSent,
    };
  }

  return {
    mode: "assigned" as const,
    alreadyEnrolled: result.alreadyEnrolled,
    invitationId: null,
    emailSent: false,
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
  if (
    action !== "list" &&
    action !== "assign" &&
    action !== "invite" &&
    action !== "cancelInvite" &&
    action !== "unassign" &&
    action !== "setRole"
  ) {
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
      const members = await listWorkplaceMemberRecords(admin, workplaceId, workplace.contactEmail);
      return json({ ok: true, workplace, members });
    }

    if (action === "assign" || action === "invite") {
      const email = body.email?.trim();
      if (!email) {
        return json({ error: "email is required" }, 400);
      }
      const outcome = await addOrInviteMember(userClient, admin, workplaceId, email);
      const members = await listWorkplaceMemberRecords(admin, workplaceId, workplace.contactEmail);
      return json({ ok: true, ...outcome, members });
    }

    if (action === "cancelInvite") {
      const invitationId = body.invitationId?.trim();
      if (!invitationId || !isValidUuid(invitationId)) {
        return json({ error: "Valid invitationId is required" }, 400);
      }
      await cancelWorkplaceInvitation(userClient, workplaceId, invitationId);
      const members = await listWorkplaceMemberRecords(admin, workplaceId, workplace.contactEmail);
      return json({ ok: true, members });
    }

    if (action === "unassign") {
      const userId = body.userId?.trim();
      if (!userId || !isValidUuid(userId)) {
        return json({ error: "Valid userId is required for unassign" }, 400);
      }
      await unassignWorkplaceMember(userClient, workplaceId, userId);
      const members = await listWorkplaceMemberRecords(admin, workplaceId, workplace.contactEmail);
      return json({ ok: true, members });
    }

    const userId = body.userId?.trim();
    const role = body.role;
    const enabled = body.enabled;
    if (!userId || !isValidUuid(userId)) {
      return json({ error: "Valid userId is required for setRole" }, 400);
    }
    if (role !== "hr" && role !== "manager") {
      return json({ error: "role must be hr or manager" }, 400);
    }
    if (typeof enabled !== "boolean") {
      return json({ error: "enabled boolean is required for setRole" }, 400);
    }

    await setWorkplaceMemberRole(userClient, workplaceId, userId, role, enabled);
    const members = await listWorkplaceMemberRecords(admin, workplaceId, workplace.contactEmail);
    return json({ ok: true, members });
  } catch (error) {
    if (error instanceof WorkplaceMemberError) {
      return json({ error: error.message }, error.status);
    }
    const message = error instanceof Error ? error.message : "Failed to manage workplace members";
    return json({ error: message }, 500);
  }
});
