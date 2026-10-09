import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { checkAiBudget, type AiPlanTier, type AiUsageMode } from "../_shared/aiUsage.ts";

/** NCLDD-52: closing / finalize calls of an owned conversation are never blocked, only recorded. */
const SESSION_ENDING_LIFECYCLES = new Set(["session_close", "session_close_ack", "session_finalize"]);

export function endsSession(lifecycle: unknown): boolean {
  return typeof lifecycle === "string" && SESSION_ENDING_LIFECYCLES.has(lifecycle);
}

export type AiBudgetGateResult = {
  /** Mode whose monthly limit is used up; null = the call may proceed. */
  blockedMode: "text" | "voice" | null;
  tier: AiPlanTier | null;
};

/**
 * Monthly USD budget check before an AI call. Without an owned conversation the mode is
 * client-sent and cannot be trusted, so both budgets apply. `other` is never limited.
 */
export async function evaluateAiBudgetGate(
  client: SupabaseClient,
  params: {
    userId: string;
    usageMode: AiUsageMode;
    ownedConversation: boolean;
    allowWhenOwnedConversation: boolean;
  },
): Promise<AiBudgetGateResult> {
  if (params.usageMode === "other") return { blockedMode: null, tier: null };
  const modes: Array<"text" | "voice"> = params.ownedConversation
    ? [params.usageMode]
    : ["text", "voice"];
  let tier: AiPlanTier | null = null;
  for (const mode of modes) {
    const budget = await checkAiBudget(client, params.userId, mode);
    tier = tier ?? budget.tier;
    if (!budget.allowed && !(params.allowWhenOwnedConversation && params.ownedConversation)) {
      return { blockedMode: mode, tier };
    }
  }
  return { blockedMode: null, tier };
}
