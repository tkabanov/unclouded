import { convertToModelMessages, generateText, streamText, type UIMessage } from "npm:ai";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { createChatModel, resolveOpenAiModelId } from "../_shared/openai-provider.ts";
import {
  AI_MONTHLY_LIMIT_CODE,
  normalizeUsage,
  lookupConversation,
  recordAiUsage,
  type AiPlanTier,
  type AiUsageMode,
  type AiUsageSource,
} from "../_shared/aiUsage.ts";
import { authenticateRequest } from "../_shared/supabase-auth.ts";
import { endsSession, evaluateAiBudgetGate } from "./aiBudgetGate.ts";
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
  persistCoachingSessionArchive,
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
import { resolvePromptLibraryRequestOptions } from "./prompt/promptLibraryRequestOptions.ts";
import { getServiceClient } from "../_shared/serviceClient.ts";
import {
  loadPlatformAiSettings,
  withPlatformSettings,
  type PlatformAiSettings,
} from "../_shared/platformAiSettings.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-prompt-library-slot",
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
  platformSettings?: PlatformAiSettings | null,
): string {
  const instruction = lifecycle
    ? buildSessionLifecycleInstruction(lifecycle, profileData ?? {}, context)
    : undefined;
  // Lifecycle instruction goes before the platform rules reminder + tone (NCLDD-53 BUG-1).
  return buildSystemPrompt(profileData, context, promptLayers, platformSettings, instruction);
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

    const { supabase, user } = auth;

    const voiceRoute = resolveVoiceRoute(req);
    if (voiceRoute === "transcribe" || voiceRoute === "tts") {
      // NCLDD-52: voice STT/TTS are budget-checked and recorded; a missing service client only
      // disables that (never the voice reply itself).
      let usageAdmin: SupabaseClient | null = null;
      try {
        usageAdmin = getServiceClient();
      } catch (err) {
        console.warn("voice usage client unavailable", err);
      }
      return voiceRoute === "transcribe"
        ? handleVoiceTranscribe(req, user.id, usageAdmin)
        : handleVoiceTts(req, user.id, usageAdmin);
    }

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

    // NCLDD-52: usage ledger + budget. Prompt tests and journal reflection are `other` (never limited).
    const serviceClient = getServiceClient();
    const modelId = resolveOpenAiModelId();
    // `other` is only derived from server-verified paths (admin prompt tests). Never from a request
    // field such as `context`, which a client could use to dodge the budget.
    const conversationInfo =
      lifecycle === "prompt_test"
        ? { mode: "text" as const, owned: false }
        : await lookupConversation(supabase, conversationId, user.id, requestSessionType);
    const usageMode: AiUsageMode = lifecycle === "prompt_test" ? "other" : conversationInfo.mode;
    let usageTier: AiPlanTier | null = null;
    const trackUsage = (
      source: AiUsageSource,
      usage: unknown,
      usedModel: string = modelId,
      mode: AiUsageMode = usageMode,
    ) => {
      scheduleEdgeBackgroundWork(
        recordAiUsage(serviceClient, {
          userId: user.id,
          conversationId,
          mode,
          source,
          model: usedModel,
          usage: normalizeUsage(usage),
          tier: usageTier,
        }),
      );
    };

    const enforceBudget = async (allowWhenOwnedConversation: boolean): Promise<Response | null> => {
      const gate = await evaluateAiBudgetGate(serviceClient, {
        userId: user.id,
        usageMode,
        ownedConversation: conversationInfo.owned,
        allowWhenOwnedConversation,
      });
      usageTier = usageTier ?? gate.tier;
      if (!gate.blockedMode) return null;
      return jsonError(402, `Monthly AI ${gate.blockedMode} limit reached.`, {
        code: AI_MONTHLY_LIMIT_CODE,
        mode: gate.blockedMode,
      });
    };

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
      const titleBlocked = await enforceBudget(false);
      if (titleBlocked) return titleBlocked;
      const pair = extractLatestUserAssistantPair(uiMessages);
      if (!pair) {
        return jsonError(400, "User and assistant messages are required to generate a title");
      }

      const result = await generateText({
        model,
        system: CONVERSATION_TITLE_SYSTEM_PROMPT,
        prompt: buildConversationTitleUserPrompt(pair.userMessage, pair.assistantMessage),
      });

      trackUsage("title", result.usage);
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

    // Prompt Library + platform AI settings are admin-only tables: read them with service role
    // (user RLS client silently fell back to static layers). Draft/explicit version stay admin-only.
    const promptLibraryOptions = resolvePromptLibraryRequestOptions(
      profileData,
      req.headers,
      body,
      Deno.env.get("PROMPT_LIBRARY_PREFER_DRAFT") === "true",
    );
    const [{ layers: promptLayers }, platformSettings] = await Promise.all([
      resolvePromptLibraryLayers(serviceClient, {
        ...promptLibraryOptions,
        // Lazy production seed runs under service role; only attribute it to admins.
        createdBy: profileData.roleType === "admin" ? user.id : null,
      }),
      loadPlatformAiSettings(serviceClient),
    ]);

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
        platformSettings,
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

      trackUsage("prompt_test", result.usage);
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

    // NCLDD-52: monthly USD budget. Closing / finalize calls of an owned conversation stay allowed
    // over budget (so a session can always be ended) and are only recorded.
    const overBudget = await enforceBudget(endsSession(lifecycle));
    if (overBudget) return overBudget;

    // Dedicated close turns — bypass full Kota coaching stack (avoids echo of prior assistant message).
    if (lifecycle === "session_close") {
      const result = await generateText({
        model,
        system: withPlatformSettings(SESSION_CLOSE_SYSTEM_PROMPT, platformSettings),
        prompt: buildSessionCloseUserPrompt(uiMessages, profileData),
      });
      trackUsage("session_close", result.usage);
      const text = sanitizeSessionCloseReplyText(result.text);
      if (!text) {
        return jsonError(500, "Failed to generate session close message");
      }
      return jsonResponse(200, { text });
    }

    if (lifecycle === "session_close_ack") {
      const result = await generateText({
        model,
        system: withPlatformSettings(SESSION_CLOSE_ACK_SYSTEM_PROMPT, platformSettings),
        prompt: buildSessionCloseAckUserPrompt(uiMessages, profileData),
      });
      trackUsage("session_close_ack", result.usage);
      const text = sanitizeSessionCloseReplyText(result.text);
      if (!text) {
        return jsonError(500, "Failed to generate session close acknowledgment");
      }
      return jsonResponse(200, { text });
    }

    let system = buildSystemWithLifecycle(
      profileData,
      context,
      lifecycle,
      promptLayers,
      platformSettings,
    );

    // REQ-12: compress older session summaries into a generated arc when context exceeds ~6k tokens.
    const compressed = await applySessionMemoryCompressionIfNeeded(
      supabase,
      user.id,
      profileData,
      system,
      (model, usage) => trackUsage("arc_summary", usage, model),
    );
    if (compressed) {
      system = buildSystemWithLifecycle(
        profileData,
        context,
        lifecycle,
        promptLayers,
        platformSettings,
      );
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
            extractMemoryFacts(supabase, user.id, transcript, openaiKey, (model, usage) =>
              trackUsage("memory_extract", usage, model),
            ),
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

    const result = streamText({
      model,
      system,
      messages: await convertToModelMessages(uiMessages),
      onFinish: ({ usage }) => {
        trackUsage(context === "journal-reflection" ? "journal_reflection" : "chat_turn", usage);
      },
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
