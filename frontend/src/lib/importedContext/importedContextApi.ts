import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

import { IMPORTED_CONTEXT_CONSENT_VERSION } from "./importedContextCopy";

/**
 * NCLDD-63 (OVR-081) — the user's imported background text ("Help Kota Know You Faster").
 * A row exists only with consent; writes go through RPCs, reads use the owner SELECT policy.
 */

// Untyped until frontend/src/integrations/supabase/types.ts is regenerated after the migration.
const db = supabase as unknown as SupabaseClient;

export type ImportedContext = {
  content: string;
  consentGrantedAt: string;
  updatedAt: string;
};

export type ImportedContextState =
  | { status: "unavailable" }
  | { status: "loaded"; context: ImportedContext | null };

export async function fetchImportedContext(userId: string): Promise<ImportedContextState> {
  const { data, error } = await db
    .from("userImportedContext")
    .select("content, consentGrantedAt, updatedAt")
    .eq("userId", userId)
    .maybeSingle();
  if (error) {
    console.warn("Imported context unavailable", error.message);
    return { status: "unavailable" };
  }
  return { status: "loaded", context: (data as ImportedContext | null) ?? null };
}

type RpcResult = { ok?: boolean; error?: string; updatedAt?: string };

export async function saveImportedContext(content: string, consent: boolean): Promise<void> {
  const { data, error } = await db.rpc("save_my_imported_context", {
    p_content: content,
    p_consent: consent,
    p_consent_version: IMPORTED_CONTEXT_CONSENT_VERSION,
  });
  if (error) throw new Error("Couldn't save your information. Please try again.");
  const result = (data ?? {}) as RpcResult;
  if (result.ok === false) throw new Error(result.error || "Couldn't save your information.");
}

export async function deleteImportedContext(): Promise<void> {
  const { data, error } = await db.rpc("delete_my_imported_context");
  if (error) throw new Error("Couldn't delete your information. Please try again.");
  const result = (data ?? {}) as RpcResult;
  if (result.ok === false) throw new Error(result.error || "Couldn't delete your information.");
}
