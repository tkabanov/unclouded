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
} from "./tierGate.ts";

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

    const body = (await req.json()) as {
      messages?: UIMessage[];
      context?: string;
      profileData?: ProfileData;
      lifecycle?: ChatLifecycleMode;
      conversationId?: string;
    };

    const lifecycle = body.lifecycle;
    let messages = body.messages;
    const context = body.context;
    const conversationId =
      typeof body.conversationId === "string" ? body.conversationId.trim() : undefined;

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
        : messages;

    const profileData = await loadServerProfile(
      supabase,
      user.id,
      body.profileData?.liveContext,
    );

    if (!profileData) {
      return jsonError(404, "Profile not found");
    }

    if (
      detectCrisisInThread(uiMessages, context) ||
      detectCrisisInLiveContext(body.profileData?.liveContext)
    ) {
      return crisisHardStopResponse();
    }

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

    const system = buildSystemWithLifecycle(profileData, context, lifecycle);

    if (lifecycle === "session_finalize") {
      const result = await generateText({
        model,
        system,
        messages: await convertToModelMessages(uiMessages),
      });
      const parsed = parseSessionFinalizePayload(result.text);
      if (!parsed) {
        return jsonError(500, "Failed to parse session finalize payload");
      }
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
