import { convertToModelMessages, streamText, type UIMessage } from "npm:ai";
import { createChatModel } from "../_shared/openai-provider.ts";
import { buildSystemPrompt, type ProfileData } from "./buildSystemPrompt.ts";

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

    const { messages, context, profileData } = (await req.json()) as {
      messages?: UIMessage[];
      context?: string;
      profileData?: ProfileData;
    };

    if (!Array.isArray(messages)) {
      return jsonError(400, "Messages are required");
    }

    const result = streamText({
      model,
      system: buildSystemPrompt(profileData, context),
      messages: await convertToModelMessages(messages),
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
