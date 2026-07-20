import { supabase } from "@/integrations/supabase/client";

import type { ManagerAggregateSnapshot } from "@/lib/employer/managerAggregateApi.types";

export type { ManagerAggregateSnapshot } from "@/lib/employer/managerAggregateApi.types";

type ManagerAggregateResponse = {
  ok?: boolean;
  metrics?: ManagerAggregateSnapshot;
  error?: string;
};

export type FetchManagerAggregateOptions = {
  /** Settings-admin smoke preview for a specific manager. */
  managerUserId?: string;
};

/**
 * REQ-11 team aggregate — opted-in direct reports only, server-aggregated via edge fn.
 * Requires legal review before production deployment.
 */
export async function fetchManagerAggregate(
  options: FetchManagerAggregateOptions = {},
): Promise<ManagerAggregateSnapshot> {
  const body = options.managerUserId ? { managerUserId: options.managerUserId } : {};

  const { data, error } = await supabase.functions.invoke("manager-aggregate", { body });

  if (error) {
    throw error;
  }

  const payload = data as ManagerAggregateResponse | null;
  if (!payload?.metrics) {
    throw new Error(payload?.error ?? "Invalid manager aggregate response");
  }

  return payload.metrics;
}
