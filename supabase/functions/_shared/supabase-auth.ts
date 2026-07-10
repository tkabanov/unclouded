import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";

export type AuthenticatedSupabase = {
  supabase: SupabaseClient;
  user: User;
};

function requireEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

/**
 * Verify Bearer JWT and return a Supabase client scoped to the authenticated user (RLS applies).
 */
export async function authenticateRequest(
  req: Request,
): Promise<AuthenticatedSupabase | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  const supabase = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_ANON_KEY"),
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  return { supabase, user: data.user };
}
