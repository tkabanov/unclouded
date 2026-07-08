import { supabase } from "@/integrations/supabase/client";

export async function exportUserData(userId: string): Promise<Blob> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Profile not found");

  const payload = {
    exported_at: new Date().toISOString(),
    profile: data,
  };

  return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
}

/** bTIiN account deletion request — removes profile row and signs user out. */
export async function requestAccountDeletion(userId: string): Promise<void> {
  const { error } = await supabase.from("profiles").delete().eq("id", userId);
  if (error) throw error;

  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) throw signOutError;
}
