import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

function getSupabaseAuthStorageKey(): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) return null;

  try {
    return `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
  } catch {
    return null;
  }
}

function forceClearPersistedAuthSession(): void {
  const storageKey = getSupabaseAuthStorageKey();
  if (!storageKey || typeof localStorage === "undefined") return;

  try {
    localStorage.removeItem(storageKey);
  } catch {
    // Best-effort wipe when storage is unavailable.
  }
}

export async function clearLocalAuthSession(): Promise<void> {
  await supabase.auth.signOut({ scope: "local" });
  // Always wipe persisted auth; deleted users can make signOut return 403 without throwing.
  forceClearPersistedAuthSession();
}

/** Drop stale client sessions and validate the current user with Supabase Auth. */
export async function resolveValidatedAuthSession(): Promise<{
  session: Session | null;
  user: User | null;
}> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { session: null, user: null };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
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
