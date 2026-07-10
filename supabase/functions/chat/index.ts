import { convertToModelMessages, generateText, streamText, type UIMessage } from "npm:ai";
import { createChatModel } from "../_shared/openai-provider.ts";
import { buildSystemPrompt, type ProfileData } from "./buildSystemPrompt.ts";
import {
  buildSessionLifecycleInstruction,
  parseSessionFinalizePayload,
  type ChatLifecycleMode,
} from "./prompt/sessionLifecycle.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
    };

    const lifecycle = body.lifecycle;
    let messages = body.messages;
    const context = body.context;
    const profileData = body.profileData;

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
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
