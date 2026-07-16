import { supabase } from "@/integrations/supabase/client";
import {
  requestTransactionalEmail,
  type TransactionalEmailHookResult,
} from "@/lib/email/transactionalEmailHooks";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

export interface ReassessmentDueCandidate {
  userId: string;
  email: string | null;
  firstName: string | null;
  tier: string | null;
  nextReassessmentDate: string;
}

const EMAIL_COOLDOWN_MS = 5 * 24 * 60 * 60 * 1000;

/**
 * Select Pro/Premium users whose nextReassessmentDate has passed and who
 * have not been emailed about it recently.
 */
export async function listReassessmentDueCandidates(
  nowMs = Date.now(),
): Promise<ReassessmentDueCandidate[]> {
  const nowIso = new Date(nowMs).toISOString();
  const cooldownIso = new Date(nowMs - EMAIL_COOLDOWN_MS).toISOString();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, firstName, tier, nextReassessmentDate, reassessmentDueEmailedAt")
    .lte("nextReassessmentDate", nowIso)
    .in("tier", ["pro", "premium"]);

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }

  return (data ?? [])
    .filter((row) => {
      const emailedAt = row.reassessmentDueEmailedAt;
      if (!emailedAt) return true;
      return emailedAt < cooldownIso;
    })
    .map((row) => ({
      userId: row.id,
      email: row.email ?? null,
      firstName: row.firstName ?? null,
      tier: row.tier ?? null,
      nextReassessmentDate: row.nextReassessmentDate as string,
    }));
}

export async function markReassessmentDueEmailed(userId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ reassessmentDueEmailedAt: new Date().toISOString() })
    .eq("id", userId);
  if (error && !isSchemaUnavailable(error)) throw error;
}

/**
 * Process due cohort: fire catalog hooks and stamp emailed-at.
 * SMTP may still be placeholder — selection + marking are real.
 */
export async function processReassessmentDueNotifications(
  nowMs = Date.now(),
): Promise<{ candidates: number; results: TransactionalEmailHookResult[] }> {
  const candidates = await listReassessmentDueCandidates(nowMs);
  const results: TransactionalEmailHookResult[] = [];

  for (const candidate of candidates) {
    const result = await requestTransactionalEmail("reassessment_90_day", {
      userId: candidate.userId,
      email: candidate.email ?? undefined,
      firstName: candidate.firstName ?? undefined,
    });
    results.push(result);
    await markReassessmentDueEmailed(candidate.userId);
  }

  return { candidates: candidates.length, results };
}
