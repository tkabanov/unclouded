import { generateText, type LanguageModel, type UIMessage } from "npm:ai";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { AiUsageMode, AiUsageSource } from "../../_shared/aiUsage.ts";
import { scheduleEdgeBackgroundWork } from "../../_shared/edgeBackground.ts";
import type { ProfileData } from "../buildSystemPrompt.ts";
import { buildSessionTranscript, extractAllUserTexts } from "../crisisDetect.ts";
import { extractMemoryFacts } from "../extractMemoryFacts.ts";
import { classifySessionInsights } from "../insights/sessionInsightsClassifier.ts";
import { persistSessionMemory } from "../persistSessionMemory.ts";
import {
  buildFallbackSessionFinalizePayload,
  buildSessionFinalizeUserPrompt,
  parseSessionFinalizePayload,
  SESSION_FINALIZE_RETRY_SYSTEM_PROMPT,
  SESSION_FINALIZE_SYSTEM_PROMPT,
  type SessionFinalizePayload,
} from "../prompt/sessionLifecycle.ts";
import { resolveCoachingModes } from "../prompt/resolveCoachingModes.ts";
import {
  buildArchiveInsertFromFinalize,
  persistCoachingSessionArchive,
} from "./coachingSessionArchive.ts";

export type SessionFinalizeUsageTracker = (
  source: AiUsageSource,
  usage: unknown,
  usedModel?: string,
  mode?: AiUsageMode,
) => void;

/**
 * `session_finalize` core shared by the chat edge (End session) and the idle auto-finalize cron:
 * finalize JSON → session memory → archive (stamps chatConversation.finalizedAt) → background
 * memory facts + consent-gated insights → clear the prior-crisis flag.
 * `db` must be able to read/write the user's rows (user client in chat, service client in cron).
 */
export async function runSessionFinalize(params: {
  db: SupabaseClient;
  serviceClient: SupabaseClient;
  model: LanguageModel;
  modelId: string;
  userId: string;
  conversationId: string;
  sessionType: "text" | "voice" | "voice_conversation";
  conversationMode: "text" | "voice";
  ownedConversation: boolean;
  profileData: ProfileData;
  uiMessages: UIMessage[];
  trackUsage: SessionFinalizeUsageTracker;
}): Promise<SessionFinalizePayload | null> {
  const { db, model, userId, conversationId, profileData, uiMessages, trackUsage } = params;

  const finalizePrompt = buildSessionFinalizeUserPrompt(uiMessages, profileData);
  let parsed: SessionFinalizePayload | null = null;

  for (let attempt = 0; attempt < 2 && !parsed; attempt += 1) {
    const result = await generateText({
      model,
      system: attempt === 0 ? SESSION_FINALIZE_SYSTEM_PROMPT : SESSION_FINALIZE_RETRY_SYSTEM_PROMPT,
      prompt: finalizePrompt,
    });
    trackUsage("session_finalize", result.usage);
    parsed = parseSessionFinalizePayload(result.text);
    if (!parsed) {
      console.warn("session_finalize JSON parse failed", {
        attempt,
        preview: result.text.slice(0, 400),
      });
    }
  }

  parsed ??= buildFallbackSessionFinalizePayload(uiMessages);
  if (!parsed) return null;

  const coachingModeUsed = resolveCoachingModes(profileData).primary;
  const finalizeExchangeCount = extractAllUserTexts(uiMessages).length;
  await persistSessionMemory(
    db,
    userId,
    conversationId,
    parsed,
    coachingModeUsed,
    finalizeExchangeCount,
  );

  await persistCoachingSessionArchive(
    db,
    buildArchiveInsertFromFinalize({
      userId,
      conversationId,
      sessionType: params.sessionType,
      finalize: parsed,
      coachingModeUsed,
      exchangeCount: finalizeExchangeCount,
      hadCrisisEscalation: false,
      profileResults: profileData.results ?? null,
      onboardingData: profileData.onboardingData ?? null,
    }),
  );

  // REQ-01: post-session longitudinal memory extraction (background; worker held via waitUntil).
  const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  const transcript = buildSessionTranscript(uiMessages);
  if (openaiKey && transcript.trim()) {
    scheduleEdgeBackgroundWork(
      extractMemoryFacts(db, userId, transcript, openaiKey, (usedModel, usage) =>
        trackUsage("memory_extract", usage, usedModel),
      ),
    );
  }

  // NCLDD-55: consent-gated Insights classification (background; closed taxonomy keys only).
  // Recorded as mode `other` so it never counts against the user's monthly AI limit.
  if (openaiKey && params.ownedConversation) {
    scheduleEdgeBackgroundWork(
      classifySessionInsights({
        admin: params.serviceClient,
        generate: ({ system, prompt }) => generateText({ model, system, prompt, temperature: 0 }),
        userId,
        conversationId,
        sessionType: params.conversationMode,
        transcript,
        onUsage: (usage) => trackUsage("insights_classify", usage, params.modelId, "other"),
      }),
    );
  }

  // Clear prior-crisis flag after a clean completed session (no L2+ this turn).
  await db.from("profiles").update({ hasPriorCrisisSession: false }).eq("id", userId);

  return parsed;
}
