/**
 * Durable per-bucket rate limit via Postgres (consume_edge_rate_limit).
 * Prefer this over isolate-local Maps — Edge runs multiple isolates.
 */

export const EDGE_RATE_LIMIT_WINDOW_SECONDS = 60;
export const EDGE_RATE_LIMIT_MAX_ATTEMPTS = 12;

type RpcClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

/**
 * @returns true if the attempt is allowed; false if rate-limited.
 * Throws when the RPC fails (caller should surface 500, not fail-open).
 */
export async function consumeEdgeRateLimit(
  admin: RpcClient,
  bucket: string,
  maxAttempts = EDGE_RATE_LIMIT_MAX_ATTEMPTS,
  windowSeconds = EDGE_RATE_LIMIT_WINDOW_SECONDS,
): Promise<boolean> {
  const { data, error } = await admin.rpc("consume_edge_rate_limit", {
    p_bucket: bucket,
    p_max_attempts: maxAttempts,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    throw new Error(error.message || "Rate limit check failed");
  }

  return data === true;
}
