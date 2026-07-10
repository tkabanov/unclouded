import { supabase } from "@/integrations/supabase/client";

export interface UserDataExport {
  exported_at: string;
  profile: Record<string, unknown> | null;
  journal_entries: Record<string, unknown>[];
}

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

/** privacy-export-btn — bundles profile and journal data for download. */
export async function exportUserData(userId: string): Promise<Blob> {
  const client = supabase as unknown as UntypedSupabase;
  const [profileResult, journalResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    client
      .from("journalEntry")
      .select("*")
      .eq("userId", userId)
      .order("createdAt", { ascending: false }),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (journalResult.error) throw journalResult.error;
  if (!profileResult.data) throw new Error("Profile not found");

  const payload: UserDataExport = {
    exported_at: new Date().toISOString(),
    profile: profileResult.data,
    journal_entries: journalResult.data ?? [],
  };

  return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
}

/**
 * delete-confirm-btn workflow parity: erase user-owned rows then sign out.
 * Journal entries are removed explicitly; profile delete requires DELETE RLS policy.
 */
export async function requestAccountDeletion(userId: string): Promise<void> {
  const client = supabase as unknown as UntypedSupabase;
  const { error: journalError } = await client
    .from("journalEntry")
    .delete()
    .eq("userId", userId);
  if (journalError) throw journalError;

  const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId);
  if (profileError) throw profileError;

  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) throw signOutError;
}
