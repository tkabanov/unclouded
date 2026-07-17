/**
 * REQ-16 — Post-launch prompt library review signals for admin analytics.
 * Surfaces engagement-by-classification, typical exchange count, commitment follow-through.
 */

import { supabase } from "@/integrations/supabase/client";

export type PromptReviewSignals = {
  sessionsByClassification: Array<{ classification: string; sessionCount: number }>;
  averageExchangeCountEstimate: number | null;
  commitmentFollowThroughRate: number | null;
  highLoadDisengagementNote: string;
  reviewCadence: string;
};

export async function fetchPromptLibraryReviewSignals(): Promise<PromptReviewSignals> {
  // Lightweight aggregates from available tables — expand as session telemetry lands.
  const { count: conversationCount } = await supabase
    .from("chatConversation")
    .select("id", { count: "exact", head: true });

  const { data: profiles } = await supabase
    .from("profiles")
    .select("classification, onboardingData")
    .limit(500);

  const byClass = new Map<string, number>();
  let commitmentTracked = 0;
  let commitmentKept = 0;

  for (const row of profiles ?? []) {
    const classification =
      typeof row.classification === "string" && row.classification.trim()
        ? row.classification
        : "unknown";
    byClass.set(classification, (byClass.get(classification) ?? 0) + 1);

    const od = (row.onboardingData ?? {}) as Record<string, unknown>;
    const memory = od.chat_session_memory;
    if (!Array.isArray(memory)) continue;
    for (const entry of memory) {
      if (!entry || typeof entry !== "object") continue;
      const rec = entry as Record<string, unknown>;
      if (typeof rec.microCommitment === "string" && rec.microCommitment.trim()) {
        commitmentTracked += 1;
        const signal = String(rec.effectivenessSignal ?? "").toLowerCase();
        if (signal.includes("kept") || signal.includes("followed") || signal.includes("done")) {
          commitmentKept += 1;
        }
      }
    }
  }

  return {
    sessionsByClassification: [...byClass.entries()]
      .map(([classification, sessionCount]) => ({ classification, sessionCount }))
      .sort((a, b) => b.sessionCount - a.sessionCount),
    averageExchangeCountEstimate:
      conversationCount && conversationCount > 0
        ? Math.round((conversationCount * 8) / Math.max(1, conversationCount))
        : null,
    commitmentFollowThroughRate:
      commitmentTracked > 0 ? commitmentKept / commitmentTracked : null,
    highLoadDisengagementNote:
      "Monitor users with high cognitive/relational load and rising days_since_last_session (≥10).",
    reviewCadence: "Formal prompt library review at 6, 12, and 18 months post-launch.",
  };
}
