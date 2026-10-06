import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

function requireServiceEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

/** Service-role client for server-only reads/writes. Never expose to callers. */
export function getServiceClient(): SupabaseClient {
  return createClient(requireServiceEnv("SUPABASE_URL"), requireServiceEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
