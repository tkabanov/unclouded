import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/**
 * NCLDD-57 §5.4 — server allowlist of tools the realtime model may call. Ships EMPTY: the session
 * goes out without `tools` and the model has no library access. NCLDD-54 adds
 * `search_knowledge_base` here (same retrieval service as text chat).
 */

export type RealtimeToolContext = {
  /** The caller's RLS client — tools never read with service role. */
  userClient: SupabaseClient;
  userId: string;
  conversationId: string | null;
};

export type RealtimeTool<Args = unknown> = {
  name: string;
  description: string;
  /** JSON schema sent to the model. */
  parameters: Record<string, unknown>;
  /** Validate the model's arguments; null = invalid. */
  parseArgs(raw: unknown): Args | null;
  handler(ctx: RealtimeToolContext, args: Args): Promise<string>;
};

export const REALTIME_TOOLS: readonly RealtimeTool[] = [];

/** Max characters of tool output returned to the model. */
export const REALTIME_TOOL_OUTPUT_MAX_CHARS = 4000;

export function findRealtimeTool(name: string, registry: readonly RealtimeTool[]): RealtimeTool | null {
  return registry.find((tool) => tool.name === name) ?? null;
}

/** `session.tools` entries; empty registry → no `tools` key in the session config. */
export function realtimeToolDefinitions(registry: readonly RealtimeTool[]) {
  return registry.map((tool) => ({
    type: "function" as const,
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}
