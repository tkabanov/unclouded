import { supabase } from "@/integrations/supabase/client";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";
import { isValidUuid } from "@/lib/uuid/isValidUuid";

export type EmployerSeatUtilization = {
  workplaceId: string;
  name: string;
  billingModel: "flat_rate" | "pay_per_active";
  seatCount: number;
  maxSeats: number | null;
  activeSeats: number;
  periodActiveUsers: number | null;
  isActive: boolean;
  contractStartDate: string | null;
  contractEndDate: string | null;
};

function normalizeBillingModel(value: string | null | undefined): "flat_rate" | "pay_per_active" {
  return value?.trim().toLowerCase() === "pay_per_active" ? "pay_per_active" : "flat_rate";
}

/**
 * HR-facing seat utilization (read-only). Matches Admin seat RPC definitions.
 */
export async function fetchEmployerSeatUtilization(
  workplaceId: string,
): Promise<EmployerSeatUtilization> {
  if (!isValidUuid(workplaceId)) {
    throw new Error("Valid workplace id is required.");
  }

  const { data: workplace, error: workplaceError } = await supabase
    .from("workplace")
    .select("id, name, seatCount, maxSeats, billingModel, isActive, contractStartDate, contractEndDate")
    .eq("id", workplaceId)
    .maybeSingle();

  if (workplaceError) {
    if (isSchemaUnavailable(workplaceError)) {
      throw new Error("Workplace schema unavailable.");
    }
    throw workplaceError;
  }
  if (!workplace?.id || !workplace.name) {
    throw new Error("Workplace not found.");
  }

  const billingModel = normalizeBillingModel(
    (workplace as { billingModel?: string | null }).billingModel,
  );
  const seatCount = Number((workplace as { seatCount?: number }).seatCount ?? 0);
  const maxRaw = (workplace as { maxSeats?: number | null }).maxSeats;
  const maxSeats = typeof maxRaw === "number" && maxRaw > 0 ? maxRaw : null;

  const [{ data: activeSeatsRaw, error: seatsError }, periodResult] = await Promise.all([
    supabase.rpc("count_workplace_active_seats", { p_workplace_id: workplaceId }),
    billingModel === "pay_per_active"
      ? supabase.rpc("count_workplace_period_active_users", {
          p_workplace_id: workplaceId,
        })
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (seatsError) throw seatsError;
  if (periodResult.error) throw periodResult.error;

  return {
    workplaceId: workplace.id,
    name: workplace.name,
    billingModel,
    seatCount: Number.isFinite(seatCount) && seatCount > 0 ? seatCount : 1,
    maxSeats,
    activeSeats: Number(activeSeatsRaw ?? 0),
    periodActiveUsers:
      billingModel === "pay_per_active" ? Number(periodResult.data ?? 0) : null,
    isActive: (workplace as { isActive?: boolean | null }).isActive !== false,
    contractStartDate:
      typeof (workplace as { contractStartDate?: string | null }).contractStartDate === "string"
        ? (workplace as { contractStartDate: string }).contractStartDate
        : null,
    contractEndDate:
      typeof (workplace as { contractEndDate?: string | null }).contractEndDate === "string"
        ? (workplace as { contractEndDate: string }).contractEndDate
        : null,
  };
}
