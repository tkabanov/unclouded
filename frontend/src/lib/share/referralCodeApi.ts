import { supabase } from "@/integrations/supabase/client";
import { generateReferralCode } from "@/lib/share/classificationShareCard";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

const MAX_ENSURE_ATTEMPTS = 6;

function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  return error.code === "23505" || (error.message?.includes("unique") ?? false);
}

/** Load persisted referral code for the signed-in user, if any. */
export async function fetchReferralCode(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("referralCode")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  const code = data?.referralCode;
  return typeof code === "string" && code.trim() ? code.trim().toUpperCase() : null;
}

/**
 * Return the user's referral code, generating and persisting one when missing (REQ-09).
 * Retries on unique-index collisions.
 */
export async function ensureReferralCode(userId: string): Promise<string> {
  const existing = await fetchReferralCode(userId);
  if (existing) return existing;

  for (let attempt = 0; attempt < MAX_ENSURE_ATTEMPTS; attempt += 1) {
    const candidate = generateReferralCode();
    const { data, error } = await supabase
      .from("profiles")
      .update({ referralCode: candidate })
      .eq("id", userId)
      .is("referralCode", null)
      .select("referralCode")
      .maybeSingle();

    if (!error) {
      const persisted = data?.referralCode;
      if (typeof persisted === "string" && persisted.trim()) {
        return persisted.trim().toUpperCase();
      }
      const raced = await fetchReferralCode(userId);
      if (raced) return raced;
      continue;
    }

    if (isSchemaUnavailable(error)) {
      return candidate;
    }

    if (isUniqueViolation(error)) {
      const raced = await fetchReferralCode(userId);
      if (raced) return raced;
      continue;
    }

    throw error;
  }

  const final = await fetchReferralCode(userId);
  if (final) return final;
  throw new Error("Could not assign referral code");
}
