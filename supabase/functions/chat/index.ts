import { convertToModelMessages, generateText, streamText, type UIMessage } from "npm:ai";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { createChatModel } from "../_shared/openai-provider.ts";
import { authenticateRequest } from "../_shared/supabase-auth.ts";
import { buildSystemPrompt, type ProfileData } from "./buildSystemPrompt.ts";
import {
  CRISIS_RESPONSE_TEXT,
  classifyCrisisInLiveContext,
  classifyCrisisInThread,
  requiresCrisisHardStop,
} from "./crisisDetect.ts";
import { loadServerProfile } from "./loadServerProfile.ts";
import {
  buildFallbackSessionFinalizePayload,
  buildSessionCloseAckUserPrompt,
  buildSessionCloseUserPrompt,
  buildSessionFinalizeUserPrompt,
  buildSessionLifecycleInstruction,
  parseSessionFinalizePayload,
  sanitizeSessionCloseReplyText,
  SESSION_CLOSE_ACK_SYSTEM_PROMPT,
  SESSION_CLOSE_SYSTEM_PROMPT,
  SESSION_FINALIZE_RETRY_SYSTEM_PROMPT,
  SESSION_FINALIZE_SYSTEM_PROMPT,
  type ChatLifecycleMode,
} from "./prompt/sessionLifecycle.ts";
import {
  enforceFreeTierSessionGate,
  canUseJournalAiReflection,
} from "./tierGate.ts";
import { parseChatRequestBody } from "./parseChatRequestBody.ts";
import { persistSessionMemory } from "./persistSessionMemory.ts";
import {
  buildArchiveInsertFromFinalize,
  buildQuickCheckinArchiveSummary,
  persistCoachingSessionArchive,
  readClassificationKey,
  readLoadSignalsSnapshot,
} from "./sessionMemory/coachingSessionArchive.ts";
import { extractMemoryFacts } from "./extractMemoryFacts.ts";
import { resolveCoachingModes } from "./prompt/resolveCoachingModes.ts";
import { truncateConversationMessages } from "./truncateConversationMessages.ts";
import { applySessionMemoryCompressionIfNeeded } from "./sessionMemory/sessionArcSummary.ts";
import { evaluatePromptTestDivergence } from "./promptTest/divergenceCheck.ts";
import {
  buildPromptTestMessages,
  buildPromptTestProfile,
  resolvePromptTestLifecycle,
} from "./promptTest/runPromptTest.ts";
import { getPromptTestScenario } from "./promptTest/scenarios.ts";
import {
  buildConversationTitleUserPrompt,
  CONVERSATION_TITLE_SYSTEM_PROMPT,
  extractLatestUserAssistantPair,
  sanitizeConversationTitle,
} from "./prompt/conversationTitle.ts";
import { extractAllUserTexts, buildSessionTranscript } from "./crisisDetect.ts";
import { handleVoiceTranscribe, handleVoiceTts, resolveVoiceRoute } from "./voice/voiceEdgeHandlers.ts";
import { detectSignificantLifeEventInThread } from "./significantLifeEventDetect.ts";
import { persistSignificantLifeEventFlag } from "./persistSignificantLifeEventFlag.ts";
import { scheduleEdgeBackgroundWork } from "../_shared/edgeBackground.ts";
import { resolvePromptLibraryLayers } from "./prompt/loadPromptLibraryVersion.ts";
import type { PromptLibraryLayerMap } from "./prompt/promptLibraryStaticLayers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(status: number, error: string, extra: Record<string, unknown> = {}): Response {
  return jsonResponse(status, { error, ...extra });
}

function crisisHardStopResponse(crisisLevel: 2 | 3 | 4): Response {
  return jsonResponse(200, { crisis: true, crisisLevel, text: CRISIS_RESPONSE_TEXT });
}

function buildSystemWithLifecycle(
  profileData: ProfileData | undefined,
  context: string | undefined,
  lifecycle: ChatLifecycleMode | undefined,
  promptLayers?: PromptLibraryLayerMap,
): string {
  const base = buildSystemPrompt(profileData, context, promptLayers);
  if (!lifecycle) return base;
  const instruction = buildSessionLifecycleInstruction(lifecycle, profileData ?? {});
  return `${base}\n\n---\n\n${instruction}`;
}

function sessionOpenMessages(): UIMessage[] {
  return [
    {
      id: "session-open",
      role: "user",
      parts: [{ type: "text", text: "[SESSION START]" }],
    },
  ];
}

async function applySignificantLifeEventDisclosureIfNeeded(
  supabase: SupabaseClient,
  userId: string,
  profileData: ProfileData,
  messages: UIMessage[],
  extraText?: string,
): Promise<void> {
  if (!detectSignificantLifeEventInThread(messages, extraText)) return;

  const persisted = await persistSignificantLifeEventFlag(
    supabase,
    userId,
    profileData.onboardingData ?? {},
    "session_disclosure",
  );

  if (persisted) {
    profileData.onboardingData = {
      ...(profileData.onboardingData ?? {}),
      significant_life_event_flag: true,
      significantLifeEventFlag: true,
    };
    if (profileData.liveContext) {
      profileData.liveContext.significantLifeEventFlag = true;
    }
  } else if (profileData.liveContext) {
    profileData.liveContext.significantLifeEventFlag = true;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return jsonError(401, "Unauthorized");
    }

    const voiceRoute = resolveVoiceRoute(req);
    if (voiceRoute === "transcribe") {
      return handleVoiceTranscribe(req);
    }
    if (voiceRoute === "tts") {
      return handleVoiceTts(req);
    }

    const { supabase, user } = auth;

    let model;
    try {
      model = createChatModel();
    } catch (configError) {
      const message = configError instanceof Error ? configError.message : "AI not configured";
      return jsonError(500, message);
    }

    const body = parseChatRequestBody(await req.json());

    const lifecycle = body.lifecycle;
    let messages = body.messages;
    const context = body.context;
    const conversationId = body.conversationId;
    const requestSessionType = body.sessionType;
    const requestExchangeCount = body.exchangeCount;
    const requestVoiceEmotionDetected = body.voiceEmotionDetected;

    if (!Array.isArray(messages)) {
      if (lifecycle === "session_open") {
        messages = [];
      } else {
        return jsonError(400, "Messages are required");
      }
    }

    const uiMessages =
      lifecycle === "session_open" && messages.length === 0
        ? sessionOpenMessages()
        : truncateConversationMessages(messages);

    if (lifecycle === "conversation_title") {
      const pair = extractLatestUserAssistantPair(uiMessages);
      if (!pair) {
        return jsonError(400, "User and assistant messages are required to generate a title");
      }

      const result = await generateText({
        model,
        system: CONVERSATION_TITLE_SYSTEM_PROMPT,
        prompt: buildConversationTitleUserPrompt(pair.userMessage, pair.assistantMessage),
      });

      const title = sanitizeConversationTitle(result.text);
      if (!title) {
        return jsonError(500, "Failed to generate conversation title");
      }

      return jsonResponse(200, { title });
    }

    const profileData = await loadServerProfile(supabase, user.id);

    if (!profileData) {
      return jsonError(404, "Profile not found");
    }

    const preferDraft =
      Deno.env.get("PROMPT_LIBRARY_PREFER_DRAFT") === "true" ||
      req.headers.get("x-prompt-library-slot") === "draft";
    const { layers: promptLayers } = await resolvePromptLibraryLayers(supabase, {
      versionId: body.promptLibraryVersionId ?? null,
      preferDraft,
      createdBy: user.id,
    });

    if (lifecycle === "prompt_test") {
      if (profileData.roleType !== "admin") {
        return jsonError(403, "Prompt tests require admin access.");
      }

      const scenarioId = body.promptTestScenarioId;
      if (!scenarioId) {
        return jsonError(400, "promptTestScenarioId is required");
      }

      const scenario = getPromptTestScenario(scenarioId);
      if (!scenario) {
        return jsonError(404, "Unknown prompt test scenario");
      }

      const testProfile = buildPromptTestProfile(scenario);
      const testLifecycle = resolvePromptTestLifecycle(scenario);
      const testMessages = buildPromptTestMessages(scenario);
      const testContext = scenario.context;

      if (testProfile.liveContext) {
        testProfile.liveContext.exchangeCount = testMessages.filter(
          (message) => message.role === "user",
        ).length;
      }

      const system = buildSystemWithLifecycle(
        testProfile,
        testContext,
        testLifecycle,
        promptLayers,
      );

      const crisisLevel =
        classifyCrisisInThread(testMessages, testContext) ??
        classifyCrisisInLiveContext(testProfile.liveContext);

      if (requiresCrisisHardStop(crisisLevel)) {
        const evaluation = evaluatePromptTestDivergence(CRISIS_RESPONSE_TEXT, scenario.checks, {
          crisisHardStop: true,
          crisisLevel,
        });
        return jsonResponse(200, {
          scenarioId: scenario.id,
          title: scenario.title,
          expectedBehavior: scenario.expectedBehavior,
          response: CRISIS_RESPONSE_TEXT,
          flagged: evaluation.flagged,
          flags: evaluation.flags,
          crisisHardStop: true,
          crisisLevel,
        });
      }

      const result = await generateText({
        model,
        system,
        messages: await convertToModelMessages(testMessages),
      });

      const evaluation = evaluatePromptTestDivergence(result.text, scenario.checks, {
        crisisHardStop: false,
      });

      return jsonResponse(200, {
        scenarioId: scenario.id,
        title: scenario.title,
        expectedBehavior: scenario.expectedBehavior,
        response: result.text,
        flagged: evaluation.flagged,
        flags: evaluation.flags,
        crisisHardStop: false,
      });
    }

    if (profileData.liveContext) {
      if (requestSessionType) {
        profileData.liveContext.sessionType = requestSessionType;
      }
      if (requestVoiceEmotionDetected === true) {
        profileData.liveContext.voiceEmotionDetected = true;
      } else {
        profileData.liveContext.voiceEmotionDetected = false;
      }
      if (typeof requestExchangeCount === "number") {
        profileData.liveContext.exchangeCount = requestExchangeCount;
      } else {
        profileData.liveContext.exchangeCount = extractAllUserTexts(uiMessages).length;
      }
    }

    await applySignificantLifeEventDisclosureIfNeeded(
      supabase,
      user.id,
      profileData,
      uiMessages,
      context,
    );

    const crisisLevel =
      classifyCrisisInThread(uiMessages, context) ??
      classifyCrisisInLiveContext(profileData.liveContext);

    if (requiresCrisisHardStop(crisisLevel)) {
      // Persist Level 2+ crisis flags for next-session aftercare (REQ-03).
      await Promise.all([
        supabase
          .from("profiles")
          .update({ hasPriorCrisisSession: true })
          .eq("id", user.id),
        conversationId
          ? supabase
              .from("chatConversation")
              .update({ hadCrisisEscalation: true })
              .eq("id", conversationId)
              .eq("userId", user.id)
          : Promise.resolve({ error: null }),
      ]);
      return crisisHardStopResponse(crisisLevel);
    }

    if (context === "journal-reflection") {
      if (!canUseJournalAiReflection(profileData.subscribed, profileData.tier)) {
        return jsonError(402, "AI journal reflection is available on Pro and Premium plans.", {
          code: "journal_reflection_tier_required",
        });
      }
    } else {
      const tierGate = await enforceFreeTierSessionGate(
        supabase,
        user.id,
        conversationId,
        lifecycle,
      );
      if (!tierGate.allowed) {
        const status = tierGate.code === "conversation_required" ? 400 : 402;
        return jsonError(status, tierGate.message, { code: tierGate.code });
      }
    }

    // Dedicated close turns — bypass full Kota coaching stack (avoids echo of prior assistant message).
    if (lifecycle === "session_close") {
      const result = await generateText({
        model,
        system: SESSION_CLOSE_SYSTEM_PROMPT,
        prompt: buildSessionCloseUserPrompt(uiMessages, profileData),
      });
      const text = sanitizeSessionCloseReplyText(result.text);
      if (!text) {
        return jsonError(500, "Failed to generate session close message");
      }
      return jsonResponse(200, { text });
    }

    if (lifecycle === "session_close_ack") {
      const result = await generateText({
        model,
        system: SESSION_CLOSE_ACK_SYSTEM_PROMPT,
        prompt: buildSessionCloseAckUserPrompt(uiMessages, profileData),
      });
      const text = sanitizeSessionCloseReplyText(result.text);
      if (!text) {
        return jsonError(500, "Failed to generate session close acknowledgment");
      }
      return jsonResponse(200, { text });
    }

    let system = buildSystemWithLifecycle(profileData, context, lifecycle, promptLayers);

    // REQ-12: compress older session summaries into a generated arc when context exceeds ~6k tokens.
    const compressed = await applySessionMemoryCompressionIfNeeded(
      supabase,
      user.id,
      profileData,
      system,
    );
    if (compressed) {
      system = buildSystemWithLifecycle(profileData, context, lifecycle, promptLayers);
    }

    if (lifecycle === "session_finalize") {
      if (!conversationId) {
        return jsonError(400, "conversationId is required for session finalize");
      }

      const finalizePrompt = buildSessionFinalizeUserPrompt(uiMessages, profileData);
      let parsed = null;

      for (let attempt = 0; attempt < 2 && !parsed; attempt += 1) {
        const result = await generateText({
          model,
          system:
            attempt === 0 ? SESSION_FINALIZE_SYSTEM_PROMPT : SESSION_FINALIZE_RETRY_SYSTEM_PROMPT,
          prompt: finalizePrompt,
        });
        parsed = parseSessionFinalizePayload(result.text);
        if (!parsed) {
          console.warn("session_finalize JSON parse failed", {
            attempt,
            preview: result.text.slice(0, 400),
          });
        }
      }

      parsed ??= buildFallbackSessionFinalizePayload(uiMessages);
      if (!parsed) {
        return jsonError(500, "Failed to parse session finalize payload");
      }

      const coachingModeUsed = resolveCoachingModes(profileData).primary;
      const finalizeExchangeCount = extractAllUserTexts(uiMessages).length;
      const sessionType = requestSessionType ?? "text";
      await persistSessionMemory(
        supabase,
        user.id,
        conversationId,
        parsed,
        coachingModeUsed,
        finalizeExchangeCount,
      );

      await persistCoachingSessionArchive(
        supabase,
        buildArchiveInsertFromFinalize({
          userId: user.id,
          conversationId,
          sessionType,
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
      if (openaiKey) {
        const transcript = buildSessionTranscript(uiMessages);
        if (transcript.trim()) {
          scheduleEdgeBackgroundWork(
            extractMemoryFacts(supabase, user.id, transcript, openaiKey),
          );
        }
      }

      // Clear prior-crisis flag after a clean completed session (no L2+ this turn).
      await supabase
        .from("profiles")
        .update({ hasPriorCrisisSession: false })
        .eq("id", user.id);

      return jsonResponse(200, parsed);
    }

    if (requestSessionType === "quick_checkin") {
      const generated = await generateText({
        model,
        system,
        messages: await convertToModelMessages(uiMessages),
      });
      const reply = enforceQuickCheckinResponse(generated.text);
      if (quickCheckinResponseViolatesRules(generated.text)) {
        console.info("quick_checkin response normalized", {
          originalLength: generated.text.length,
          normalizedLength: reply.length,
        });
      }

      const latestUserText = extractAllUserTexts(uiMessages).at(-1) ?? "";
      const pulseMatch = latestUserText.match(/Pulse:\s*(\d+)\/10/i);
      const pulse = pulseMatch ? Number(pulseMatch[1]) : null;
      const userText = latestUserText.replace(/^Pulse:\s*\d+\/10\.?\s*/i, "").trim();

      if (conversationId) {
        const coachingModeUsed = resolveCoachingModes(profileData).primary;
        await persistCoachingSessionArchive(supabase, {
          userId: user.id,
          conversationId,
          sessionType: "quick_checkin",
          exchangeCount: 1,
          coachingModeUsed,
          hadCrisisEscalation: false,
          classificationAtSession: readClassificationKey(profileData.results ?? null),
          loadSignalsSnapshot: readLoadSignalsSnapshot(profileData.onboardingData ?? null),
          summaryJson: buildQuickCheckinArchiveSummary({
            pulse: pulse ?? 0,
            userText,
            kotaReply: reply,
          }),
        });
      }

      return jsonResponse(200, { quickCheckin: true, text: reply });
    }

    const result = streamText({
      model,
      system,
      messages: await convertToModelMessages(uiMessages),
    });

    return result.toUIMessageStreamResponse({ headers: corsHeaders });
  } catch (err) {
    console.error("chat error", err);

    const message = err instanceof Error ? err.message.toLowerCase() : "";
    if (message.includes("insufficient_quota") || message.includes("exceeded your current quota")) {
      return jsonError(402, "OpenAI quota exceeded");
    }
    if (message.includes("rate limit")) {
      return jsonError(429, "Rate limit exceeded");
    }

    return jsonError(500, "Chat failed");
  }
});
