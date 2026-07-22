import { supabase } from "@/integrations/supabase/client";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

export async function fetchMyReferralSignUpCount(): Promise<number> {
  const { data, error } = await supabase.rpc("count_my_referral_signups");

  if (error) {
    if (isSchemaUnavailable(error)) return 0;
    throw error;
  }

  return typeof data === "number" && Number.isFinite(data) ? Math.max(0, Math.floor(data)) : 0;
}

export function formatReferralSignUpCountMessage(count: number): string {
  if (count <= 0) return "No one has signed up with your link yet.";
  if (count === 1) return "You've referred 1 person.";
  return `You've referred ${count} people.`;
}
