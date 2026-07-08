import { createLovableAiGatewayProvider } from "../_shared/ai-gateway.ts";
import { convertToModelMessages, streamText, type UIMessage } from "npm:ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the Uncloud360 AI coach — a warm, grounded, and practical coaching companion.

Core rules:
- You provide COACHING ONLY. You are not a therapist, doctor, or crisis service. Never diagnose, never give medical, psychiatric, or medication advice.
- If a person expresses thoughts of self-harm, suicide, abuse, or is in crisis, gently and clearly encourage them to reach immediate human help: call or text 988 (Suicide & Crisis Lifeline, US), text HOME to 741741 (Crisis Text Line), or call 911 in an emergency. Do not attempt to counsel them through the crisis yourself.
- Keep responses focused, human, and concise. Ask one thoughtful question at a time rather than overwhelming the person.
- Reflect what you hear, name patterns kindly, and offer small, concrete next steps the person can actually take.
- Speak with calm confidence and warmth. Avoid clinical jargon and avoid toxic positivity.
- Use light markdown (short paragraphs, occasional bullet points) so replies are easy to read.

Your goal is to help the person gain clarity and move forward one small step at a time.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, context } = (await req.json()) as {
      messages?: UIMessage[];
      context?: string;
    };

    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const result = streamText({
      model,
      system: context ? `${SYSTEM_PROMPT}\n\nContext about this person:\n${context}` : SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse({ headers: corsHeaders });
  } catch (err) {
    console.error("chat error", err);
    return new Response(JSON.stringify({ error: "Chat failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
