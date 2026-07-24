import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

import {
  generateEnrollmentCode,
  isValidEnrollmentCodeFormat,
  normalizeEnrollmentCode,
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

export async function createWorkplaceEnrollmentCode(
  client: SupabaseClient,
  params: {
    workplaceId: string;
    createdByUserId: string;
    code?: string;
  },
): Promise<WorkplaceEnrollmentCodeRow> {
  const normalized = params.code ? normalizeEnrollmentCode(params.code) : "";
  const code =
    normalized && isValidEnrollmentCodeFormat(normalized)
      ? normalized
      : generateEnrollmentCode("ORG");

  const now = new Date().toISOString();

  await client
    .from("workplaceEnrollmentCode")
    .update({ isActive: false, deactivatedAt: now } as never)
    .eq("workplaceId", params.workplaceId)
    .eq("isActive", true);

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

  if (error) throw error;

  const record = data as Record<string, unknown>;
  return {
    id: String(record.id),
    workplaceId: String(record.workplaceId),
    code: String(record.code),
    isActive: record.isActive === true,
    createdAt: String(record.createdAt ?? ""),
    deactivatedAt: null,
  };
}

export async function deactivateWorkplaceEnrollmentCode(
  client: SupabaseClient,
  codeId: string,
  workplaceId: string,
): Promise<void> {
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
}
