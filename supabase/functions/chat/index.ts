import { convertToModelMessages, generateText, streamText, type UIMessage } from "npm:ai";
import { createChatModel } from "../_shared/openai-provider.ts";
import { authenticateRequest } from "../_shared/supabase-auth.ts";
import { buildSystemPrompt, type ProfileData } from "./buildSystemPrompt.ts";
import { CRISIS_RESPONSE_TEXT, detectCrisisInLiveContext, detectCrisisInThread } from "./crisisDetect.ts";
import { loadServerProfile } from "./loadServerProfile.ts";
import {
  buildSessionLifecycleInstruction,
  parseSessionFinalizePayload,
  type ChatLifecycleMode,
} from "./prompt/sessionLifecycle.ts";
import {
  enforceFreeTierSessionGate,
  canUseJournalAiReflection,
} from "./tierGate.ts";
import { parseChatRequestBody } from "./parseChatRequestBody.ts";
import { persistSessionMemory } from "./persistSessionMemory.ts";
import { resolveCoachingModes } from "./prompt/resolveCoachingModes.ts";
import { truncateConversationMessages } from "./truncateConversationMessages.ts";
import {
  buildConversationTitleUserPrompt,
  CONVERSATION_TITLE_SYSTEM_PROMPT,
  extractLatestUserAssistantPair,
  sanitizeConversationTitle,
} from "./prompt/conversationTitle.ts";

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

function crisisHardStopResponse(): Response {
  return jsonResponse(200, { crisis: true, text: CRISIS_RESPONSE_TEXT });
}

function buildSystemWithLifecycle(
  profileData: ProfileData | undefined,
  context: string | undefined,
  lifecycle: ChatLifecycleMode | undefined,
): string {
  const base = buildSystemPrompt(profileData, context);
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

    if (
      detectCrisisInThread(uiMessages, context) ||
      detectCrisisInLiveContext(profileData.liveContext)
    ) {
      return crisisHardStopResponse();
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

    const system = buildSystemWithLifecycle(profileData, context, lifecycle);
    if (lifecycle === "session_finalize") {
      if (!conversationId) {
        return jsonError(400, "conversationId is required for session finalize");
      }

      const result = await generateText({
        model,
        system,
        messages: await convertToModelMessages(uiMessages),
      });
      const parsed = parseSessionFinalizePayload(result.text);
      if (!parsed) {
        return jsonError(500, "Failed to parse session finalize payload");
      }

      const coachingModeUsed = resolveCoachingModes(profileData).primary;
      await persistSessionMemory(supabase, user.id, conversationId, parsed, coachingModeUsed);

      return jsonResponse(200, parsed);
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
