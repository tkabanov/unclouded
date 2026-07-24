import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionErrorMessage } from "@/lib/supabase/edgeFunctionErrors";

export type WorkplaceEnrollmentCode = {
  id: string;
  workplaceId: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  deactivatedAt: string | null;
};

export type WorkplaceEnrollmentSummary = {
  id: string;
  name: string;
  seatCount: number;
  activeSeats: number;
};

type EnrollmentCodesResponse = {
  ok?: boolean;
  error?: string;
  workplace?: WorkplaceEnrollmentSummary;
  codes?: WorkplaceEnrollmentCode[];
  code?: WorkplaceEnrollmentCode;
  activeSeats?: number;
  seatCount?: number;
};

type RedeemResponse = {
  ok?: boolean;
  error?: string;
  workplaceId?: string;
  workplaceName?: string;
  enterpriseTier?: string;
  alreadyEnrolled?: boolean;
};

export async function redeemWorkplaceEnrollmentCode(code: string): Promise<{
  workplaceId: string;
  workplaceName: string;
  enterpriseTier: string;
  alreadyEnrolled: boolean;
}> {
  const { data, error } = await supabase.functions.invoke("redeem-workplace-enrollment", {
    body: { code: code.trim() },
  });

  const payload = data as RedeemResponse | null;
  if (!payload?.ok) {
    throw new Error(
      getEdgeFunctionErrorMessage(
        data,
        error,
        "Invalid or inactive enrollment code.",
      ),
    );
  }

  return {
    workplaceId: String(payload.workplaceId ?? ""),
    workplaceName: String(payload.workplaceName ?? ""),
    enterpriseTier: String(payload.enterpriseTier ?? "pro"),
    alreadyEnrolled: payload.alreadyEnrolled === true,
  };
}

async function invokeEnrollmentCodes(
  body: Record<string, string>,
): Promise<EnrollmentCodesResponse> {
  const { data, error } = await supabase.functions.invoke("employer-enrollment-codes", {
    body,
  });

  const payload = data as EnrollmentCodesResponse | null;
  if (!payload?.ok) {
    throw new Error(getEdgeFunctionErrorMessage(data, error, "Request failed."));
  }

  return payload;
}

export async function fetchWorkplaceEnrollmentCodes(workplaceId: string): Promise<{
  workplace: WorkplaceEnrollmentSummary;
  codes: WorkplaceEnrollmentCode[];
}> {
  const payload = await invokeEnrollmentCodes({ workplaceId, action: "list" });
  if (!payload.workplace || !payload.codes) {
    throw new Error("Invalid enrollment codes response.");
  }

  return {
    workplace: payload.workplace,
    codes: payload.codes,
  };
}

export async function createWorkplaceEnrollmentCode(
  workplaceId: string,
): Promise<WorkplaceEnrollmentCode> {
  const payload = await invokeEnrollmentCodes({ workplaceId, action: "create" });
  if (!payload.code) {
    throw new Error("Invalid create code response.");
  }
  return payload.code;
}

export async function deactivateWorkplaceEnrollmentCode(
  workplaceId: string,
  codeId: string,
): Promise<WorkplaceEnrollmentCode[]> {
  const payload = await invokeEnrollmentCodes({
    workplaceId,
    action: "deactivate",
    codeId,
  });
  return payload.codes ?? [];
}

export async function fetchWorkplaceActiveSeats(workplaceId: string): Promise<number> {
  const { data, error } = await supabase.rpc("count_workplace_active_seats", {
    p_workplace_id: workplaceId,
  });

  if (error) throw error;
  return typeof data === "number" ? data : Number(data ?? 0);
}
