import { supabase } from "@/integrations/supabase/client";

export type RpcResponse = {
  data: unknown;
  error: { message: string; code?: string } | null;
};

type UntypedRpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<RpcResponse>;
};

/**
 * Call a Postgres function that is not in the generated Supabase types yet.
 *
 * `integrations/supabase/types.ts` is generated from the applied schema, so
 * functions introduced by an unapplied migration are unknown to it. Callers
 * parse the `unknown` payload themselves, which keeps the boundary explicit
 * instead of silently trusting a shape.
 */
export function callRpc(fn: string, args?: Record<string, unknown>): Promise<RpcResponse> {
  return (supabase as unknown as UntypedRpcClient).rpc(fn, args);
}
