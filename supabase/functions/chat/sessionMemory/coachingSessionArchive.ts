import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { SessionFinalizePayload } from "../prompt/sessionLifecycle.ts";
import {
  buildSessionMemoryRecord,
  type SessionMemoryRecord,
} from "./sessionMemoryHelpers.ts";

export type CoachingSessionArchiveInsert = {
  userId: string;
  conversationId: string | null;
  sessionType: "text" | "voice" | "quick_checkin";
  finalizedAt?: string;
  exchangeCount?: number | null;
  coachingModeUsed?: string | null;
  hadCrisisEscalation?: boolean;
  classificationAtSession?: string | null;
  loadSignalsSnapshot?: Record<string, unknown> | null;
  summaryJson: Record<string, unknown>;
};

export type QuickCheckinArchiveSummary = {
  pulse: number;
  userText: string;
  kotaReply: string;
};

export function readClassificationKey(profileResults: Record<string, unknown> | null | undefined): string | null {
  if (!profileResults || typeof profileResults !== "object") return null;
  const classification = profileResults.classification;
  if (classification && typeof classification === "object") {
    const key = (classification as Record<string, unknown>).key;
    if (typeof key === "string" && key.trim()) return key.trim();
    const name = (classification as Record<string, unknown>).name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  if (typeof profileResults.classification === "string" && profileResults.classification.trim()) {
    return profileResults.classification.trim();
  }
  return null;
}

export function readLoadSignalsSnapshot(
  onboardingData: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  const loadSignals = onboardingData?.loadSignals ?? onboardingData?.load_signals;
  if (!loadSignals || typeof loadSignals !== "object" || Array.isArray(loadSignals)) {
    return null;
  }
  return loadSignals as Record<string, unknown>;
}

export function buildArchiveSummaryFromFinalize(
  finalize: SessionFinalizePayload,
  memoryRecord: SessionMemoryRecord,
): Record<string, unknown> {
  return {
    lastSessionTopic: finalize.lastSessionTopic,
    summaryStub: memoryRecord.summaryStub,
    microCommitmentText: finalize.microCommitmentText,
    microCommitmentDue: memoryRecord.microCommitmentDue,
    keyPatternOrInsight: finalize.keyPatternOrInsight,
    emotionalStart: finalize.emotionalStart,
    emotionalEnd: finalize.emotionalEnd,
    resistancePoints: finalize.resistancePoints,
    effectivenessSignal: finalize.effectivenessSignal,
    unresolvedThread: finalize.unresolvedThread,
    commitmentStatus: memoryRecord.commitmentStatus,
  };
}

export function buildQuickCheckinArchiveSummary(
  summary: QuickCheckinArchiveSummary,
): Record<string, unknown> {
  return {
    kind: "quick_checkin",
    pulse: summary.pulse,
    userText: summary.userText,
    kotaReply: summary.kotaReply,
  };
}

/** Persist one finalized coaching session to the unbounded archive (REQ-16 / REQ-04). */
export async function persistCoachingSessionArchive(
  supabase: SupabaseClient,
  input: CoachingSessionArchiveInsert,
): Promise<void> {
  const finalizedAt = input.finalizedAt ?? new Date().toISOString();

  const { error: insertError } = await supabase.from("coachingSessionArchive").insert({
    userId: input.userId,
    conversationId: input.conversationId,
    sessionType: input.sessionType,
    finalizedAt,
    exchangeCount: input.exchangeCount ?? null,
    coachingModeUsed: input.coachingModeUsed ?? null,
    hadCrisisEscalation: input.hadCrisisEscalation ?? false,
    classificationAtSession: input.classificationAtSession ?? null,
    loadSignalsSnapshot: input.loadSignalsSnapshot ?? null,
    summaryJson: input.summaryJson,
  });

  if (insertError) {
    if (isMissingSchemaError(insertError)) {
      console.warn("coachingSessionArchive unavailable; skipping archive insert", {
        code: insertError.code,
        message: insertError.message,
      });
      return;
    }
    throw insertError;
  }

  if (input.conversationId) {
    const { error: conversationError } = await supabase
      .from("chatConversation")
      .update({ finalizedAt })
      .eq("id", input.conversationId)
      .eq("userId", input.userId);

    if (conversationError) {
      if (isMissingSchemaError(conversationError)) {
        console.warn("chatConversation.finalizedAt unavailable; skipping conversation stamp", {
          code: conversationError.code,
          message: conversationError.message,
        });
        return;
      }
      throw conversationError;
    }
  }
}

function isMissingSchemaError(error: { code?: string; message?: string }): boolean {
  if (error.code === "42P01" || error.code === "42703") return true;
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("does not exist") || message.includes("could not find");
}

export function buildArchiveInsertFromFinalize(params: {
  userId: string;
  conversationId: string;
  sessionType: "text" | "voice" | "quick_checkin";
  finalize: SessionFinalizePayload;
  coachingModeUsed: string;
  exchangeCount?: number | null;
  hadCrisisEscalation?: boolean;
  profileResults?: Record<string, unknown> | null;
  onboardingData?: Record<string, unknown> | null;
  finalizedAt?: string;
}): CoachingSessionArchiveInsert {
  const memoryRecord = buildSessionMemoryRecord(
    params.conversationId,
    params.finalize,
    params.coachingModeUsed,
    params.finalizedAt ?? new Date().toISOString(),
    params.exchangeCount,
  );

  return {
    userId: params.userId,
    conversationId: params.conversationId,
    sessionType: params.sessionType,
    finalizedAt: params.finalizedAt,
    exchangeCount: params.exchangeCount ?? null,
    coachingModeUsed: params.coachingModeUsed,
    hadCrisisEscalation: params.hadCrisisEscalation ?? false,
    classificationAtSession: readClassificationKey(params.profileResults ?? null),
    loadSignalsSnapshot: readLoadSignalsSnapshot(params.onboardingData ?? null),
    summaryJson: buildArchiveSummaryFromFinalize(params.finalize, memoryRecord),
  };
}

export async function fetchLatestFinalizedSessionAt(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("coachingSessionArchive")
    .select("finalizedAt")
    .eq("userId", userId)
    .order("finalizedAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return null;
    }
    throw error;
  }

  return typeof data?.finalizedAt === "string" ? data.finalizedAt : null;
}
