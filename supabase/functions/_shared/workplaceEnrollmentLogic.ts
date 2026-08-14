import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

import {
  generateEnrollmentCode,
  isValidEnrollmentCodeFormat,
  isWorkplaceContractActive,
  normalizeEnrollmentCode,
  WORKPLACE_ENROLLMENT_INACTIVE_MESSAGE,
} from "./workplaceEnrollmentHelpers.ts";

export type WorkplaceEnrollmentCodeRow = {
  id: string;
  workplaceId: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  deactivatedAt: string | null;
};

export type RedeemEnrollmentResult =
  | {
      ok: true;
      workplaceId: string;
      workplaceName: string;
      enterpriseTier: "pro" | "premium";
      alreadyEnrolled: boolean;
    }
  | {
      ok: false;
      error: string;
      status: 400 | 404 | 409;
    };

export async function countActiveSeats(
  client: SupabaseClient,
  workplaceId: string,
): Promise<number> {
  const { count, error } = await client
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("workplaceId", workplaceId)
    .eq("accountType", "enterprise");

  if (error) throw error;
  return count ?? 0;
}

export async function listWorkplaceEnrollmentCodes(
  client: SupabaseClient,
  workplaceId: string,
): Promise<WorkplaceEnrollmentCodeRow[]> {
  const { data, error } = await client
    .from("workplaceEnrollmentCode")
    .select("id, workplaceId, code, isActive, createdAt, deactivatedAt")
    .eq("workplaceId", workplaceId)
    .order("createdAt", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: String(record.id),
      workplaceId: String(record.workplaceId),
      code: String(record.code),
      isActive: record.isActive === true,
      createdAt: String(record.createdAt ?? ""),
      deactivatedAt:
        typeof record.deactivatedAt === "string" ? record.deactivatedAt : null,
    };
  });
}

async function writeCodeAudit(
  client: SupabaseClient,
  params: {
    actorUserId: string;
    workplaceId: string;
    action: string;
    field?: string;
    oldValue?: string | null;
    newValue?: string | null;
  },
): Promise<void> {
  try {
    await client.rpc("write_admin_org_audit", {
      p_actor_user_id: params.actorUserId,
      p_workplace_id: params.workplaceId,
      p_action: params.action,
      p_field: params.field ?? null,
      p_old_value: params.oldValue ?? null,
      p_new_value: params.newValue ?? null,
    });
  } catch {
    // Audit must not block enrollment-code ops
  }
}

export async function createWorkplaceEnrollmentCode(
  client: SupabaseClient,
  params: {
    workplaceId: string;
    createdByUserId: string;
    code?: string;
  },
): Promise<WorkplaceEnrollmentCodeRow> {
  const { data: workplaceRow, error: workplaceError } = await client
    .from("workplace")
    .select("id, isActive, contractStartDate, contractEndDate")
    .eq("id", params.workplaceId)
    .maybeSingle();

  if (workplaceError) throw workplaceError;
  if (
    !workplaceRow ||
    !isWorkplaceContractActive({
      id: params.workplaceId,
      isActive: (workplaceRow as { isActive?: boolean | null }).isActive,
      contractStartDate: (workplaceRow as { contractStartDate?: string | null })
        .contractStartDate,
      contractEndDate: (workplaceRow as { contractEndDate?: string | null })
        .contractEndDate,
    })
  ) {
    throw new Error(WORKPLACE_ENROLLMENT_INACTIVE_MESSAGE);
  }

  let code = "";
  if (params.code?.trim()) {
    const normalized = normalizeEnrollmentCode(params.code);
    if (!isValidEnrollmentCodeFormat(normalized)) {
      throw new Error(
        "Custom codes must be 6–8 characters (A–Z, 0–9, optional single hyphen).",
      );
    }
    code = normalized;
  } else {
    // Retry generation on rare collisions with active codes
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = generateEnrollmentCode("ORG");
      if (!isValidEnrollmentCodeFormat(candidate)) continue;
      const { data: existing } = await client
        .from("workplaceEnrollmentCode")
        .select("id")
        .eq("isActive", true)
        .ilike("code", candidate)
        .maybeSingle();
      if (!existing) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      code = generateEnrollmentCode("ORG");
    }
  }

  const { data, error } = await client
    .from("workplaceEnrollmentCode")
    .insert({
      workplaceId: params.workplaceId,
      code,
      isActive: true,
      createdByUserId: params.createdByUserId,
    } as never)
    .select("id, workplaceId, code, isActive, createdAt, deactivatedAt")
    .single();

  if (error) {
    if (String(error.message ?? "").toLowerCase().includes("duplicate") ||
      error.code === "23505") {
      throw new Error("That enrollment code is already in use.");
    }
    throw error;
  }

  const record = data as Record<string, unknown>;
  const created: WorkplaceEnrollmentCodeRow = {
    id: String(record.id),
    workplaceId: String(record.workplaceId),
    code: String(record.code),
    isActive: record.isActive === true,
    createdAt: String(record.createdAt ?? ""),
    deactivatedAt: null,
  };

  await writeCodeAudit(client, {
    actorUserId: params.createdByUserId,
    workplaceId: params.workplaceId,
    action: "enrollment_code_create",
    field: "code",
    newValue: created.code,
  });

  return created;
}

export async function deactivateWorkplaceEnrollmentCode(
  client: SupabaseClient,
  codeId: string,
  workplaceId: string,
  actorUserId?: string,
): Promise<void> {
  const activeCodes = await listWorkplaceEnrollmentCodes(client, workplaceId);
  const active = activeCodes.filter((row) => row.isActive);
  const target = active.find((row) => row.id === codeId);

  if (!target) {
    throw new Error("Active enrollment code not found.");
  }

  const { data: workplace } = await client
    .from("workplace")
    .select("isActive")
    .eq("id", workplaceId)
    .maybeSingle();

  const orgActive = (workplace as { isActive?: boolean } | null)?.isActive !== false;
  if (orgActive && active.length <= 1) {
    throw new Error(
      "Cannot deactivate the last active enrollment code while the organization is active. Create another code first.",
    );
  }

  const { error } = await client
    .from("workplaceEnrollmentCode")
    .update({
      isActive: false,
      deactivatedAt: new Date().toISOString(),
    } as never)
    .eq("id", codeId)
    .eq("workplaceId", workplaceId)
    .eq("isActive", true);

  if (error) throw error;

  if (actorUserId) {
    await writeCodeAudit(client, {
      actorUserId,
      workplaceId,
      action: "enrollment_code_deactivate",
      field: "code",
      oldValue: target.code,
      newValue: null,
    });
  }
}
