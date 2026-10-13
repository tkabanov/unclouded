import { callRpc } from "@/lib/supabase/rpc";

/**
 * NCLDD-56 — the signed-in user's referral coach credits (1 credit = one 1:1 session).
 * Returns 0 when the RPC is not deployed yet or fails, so booking UI falls back to the
 * Premium rules; the booking RPC re-checks server-side either way.
 */
export async function fetchMyReferralCoachCredits(): Promise<number> {
  const { data, error } = await callRpc("my_referral_coach_credit_balance");
  if (error) return 0;
  const value = typeof data === "number" ? data : Number(data);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}
