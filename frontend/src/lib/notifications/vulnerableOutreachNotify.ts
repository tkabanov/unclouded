import { supabase } from "@/integrations/supabase/client";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";
import {
  isInactiveForOutreach,
  listVulnerableOutreachPreCandidatesFromRows,
  type VulnerableOutreachProfileRow,
} from "@/lib/notifications/vulnerableOutreachLogic";

export type VulnerableOutreachCandidate = {
  userId: string;
  email: string | null;
  firstName: string | null;
};

/**
 * Profiles in grief/recovery mode past the 7-day outreach cooldown.
 * Edge fn `vulnerable-outreach` additionally requires ≥10 days since last session.
 */
export async function listVulnerableOutreachPreCandidates(
  nowMs = Date.now(),
): Promise<VulnerableOutreachCandidate[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, firstName, results, vulnerableOutreachEmailedAt, onboardingCompletedAt, createdAt",
    )
    .eq("onboardingCompleted", true)
    .not("results", "is", null);

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }

  return listVulnerableOutreachPreCandidatesFromRows(
    (data ?? []) as VulnerableOutreachProfileRow[],
    nowMs,
  ).map((row) => ({
    userId: row.id,
    email: row.email ?? null,
    firstName: row.firstName ?? null,
  }));
}

export { isInactiveForOutreach, listVulnerableOutreachPreCandidatesFromRows };
