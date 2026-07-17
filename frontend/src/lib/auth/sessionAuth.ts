import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export async function clearLocalAuthSession(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Best-effort local wipe even when the server session is already gone.
  }
}

/** Drop stale client sessions and validate the current user with Supabase Auth. */
export async function resolveValidatedAuthSession(): Promise<{
  session: Session | null;
  user: User | null;
}> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    await clearLocalAuthSession();
    return { session: null, user: null };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    await clearLocalAuthSession();
    return { session: null, user: null };
  }

  return { session, user };
}

export async function signOutEverywhere(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: "global" });
  } catch {
    // Server revoke can fail when the auth user was already deleted.
  }

  await clearLocalAuthSession();
}
