import { supabase } from "@/integrations/supabase/client";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

import {
  buildModuleUnlockSchedulePatch,
  listModuleUnlockCandidatesFromRows,
  parseModuleSchedules,
  pickModuleUnlockForProfile,
  type ModuleSlug,
  type ModuleUnlockCandidate,
  type ModuleUnlockProfileRow,
} from "../../../../supabase/functions/_shared/moduleUnlockLogic.ts";

export type { ModuleUnlockCandidate, ModuleUnlockProfileRow };

const MODULE_UNLOCK_PROFILE_SELECT =
  "id, email, firstName, timeZone, onboardingCompleted, lastNotificationSentAt, moduleSchedules, moduleIdentityComplete, moduleRelationalComplete, moduleHistoryComplete, moduleFinancialComplete, moduleBodyComplete, moduleMeaningComplete";

export {
  listModuleUnlockCandidatesFromRows,
  pickModuleUnlockForProfile,
  parseModuleSchedules,
  buildModuleUnlockSchedulePatch,
};

export async function listModuleUnlockCandidates(
  nowMs = Date.now(),
): Promise<ModuleUnlockCandidate[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(MODULE_UNLOCK_PROFILE_SELECT)
    .eq("onboardingCompleted", true);

  if (error) {
    if (isSchemaUnavailable(error)) {
      return [];
    }
    throw error;
  }

  return listModuleUnlockCandidatesFromRows((data ?? []) as ModuleUnlockProfileRow[], new Date(nowMs));
}

export async function markModuleUnlockNotified(
  userId: string,
  slug: ModuleSlug,
  kind: "initial" | "resend",
  stampedAt = new Date().toISOString(),
): Promise<void> {
  const { data, error } = await supabase
    .from("profiles")
    .select("moduleSchedules")
    .eq("id", userId)
    .maybeSingle();

  if (error && !isSchemaUnavailable(error)) {
    throw error;
  }

  const schedules = parseModuleSchedules(data?.moduleSchedules);
  const nextSchedules = buildModuleUnlockSchedulePatch(schedules, slug, kind, stampedAt);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      moduleSchedules: nextSchedules as never,
      lastNotificationSentAt: stampedAt,
    })
    .eq("id", userId);

  if (updateError && !isSchemaUnavailable(updateError)) {
    throw updateError;
  }
}

export async function processModuleUnlockNotifications(
  nowMs = Date.now(),
): Promise<{ candidates: number; stamped: number }> {
  const candidates = await listModuleUnlockCandidates(nowMs);
  let stamped = 0;

  for (const candidate of candidates) {
    await markModuleUnlockNotified(candidate.userId, candidate.slug, candidate.kind);
    stamped += 1;
  }

  return { candidates: candidates.length, stamped };
}
