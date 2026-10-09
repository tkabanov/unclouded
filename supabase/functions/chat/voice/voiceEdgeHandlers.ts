import {
  AI_MONTHLY_LIMIT_CODE,
  checkAiBudget,
  recordAiUsage,
} from "../../_shared/aiUsage.ts";
import { scheduleEdgeBackgroundWork } from "../../_shared/edgeBackground.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const KOTA_TTS_VOICE = "nova" as const;
export const KOTA_TTS_VOICES = ["alloy", "nova", "echo", "fable", "onyx", "shimmer"] as const;

const MAX_TTS_CHARS = 4096;

function jsonResponse(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(status: number, error: string, extra: Record<string, unknown> = {}): Response {
  return jsonResponse(status, { error, ...extra });
}

const STT_MODEL = "whisper-1";
const TTS_MODEL = "tts-1";

/** NCLDD-52: block voice STT/TTS once the monthly voice budget is used up (fails open on errors). */
async function voiceBudgetGate(admin: SupabaseClient | null, userId: string) {
  if (!admin) return null;
  const budget = await checkAiBudget(admin, userId, "voice");
  return { admin, budget };
}

function budgetExceededResponse(): Response {
  return jsonError(402, "Monthly AI voice limit reached.", {
    code: AI_MONTHLY_LIMIT_CODE,
    mode: "voice",
  });
}

function resolveOpenAiKey(): string | null {
  const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  return apiKey || null;
}

export function resolveTtsVoice(requested: unknown): string {
  if (typeof requested !== "string") return KOTA_TTS_VOICE;
  const normalized = requested.trim().toLowerCase();
  return (KOTA_TTS_VOICES as readonly string[]).includes(normalized) ? normalized : KOTA_TTS_VOICE;
}

/** Whisper STT — REQ-14 voice input. */
export async function handleVoiceTranscribe(
  req: Request,
  userId: string,
  admin: SupabaseClient | null,
): Promise<Response> {
  const apiKey = resolveOpenAiKey();
  if (!apiKey) {
    return jsonError(500, "Missing OPENAI_API_KEY");
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return jsonError(400, "Expected multipart form data");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return jsonError(400, "Audio file is required");
  }

  const gate = await voiceBudgetGate(admin, userId);
  if (gate && !gate.budget.allowed) return budgetExceededResponse();

  const whisperForm = new FormData();
  whisperForm.append("file", file, file.name || "voice.webm");
  whisperForm.append("model", STT_MODEL);
  // verbose_json also returns the audio duration used for the cost estimate.
  whisperForm.append("response_format", "verbose_json");
  const language = formData.get("language");
  if (typeof language === "string" && language.trim()) {
    whisperForm.append("language", language.trim());
  }

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: whisperForm,
  });

  if (!response.ok) {
    console.error("Whisper transcription failed", response.status, await response.text());
    return jsonError(502, "Transcription failed");
  }

  const payload = (await response.json()) as { text?: string; duration?: number };
  if (gate) {
    const conversationId = formData.get("conversationId");
    scheduleEdgeBackgroundWork(
      recordAiUsage(gate.admin, {
        userId,
        conversationId: typeof conversationId === "string" ? conversationId : null,
        mode: "voice",
        source: "stt",
        model: STT_MODEL,
        usage: { audioSeconds: typeof payload.duration === "number" ? payload.duration : 0 },
        tier: gate.budget.tier,
      }),
    );
  }
  return jsonResponse(200, { text: typeof payload.text === "string" ? payload.text : "" });
}

/** OpenAI TTS — REQ-14 Kota spoken replies (Nova voice default). */
export async function handleVoiceTts(
  req: Request,
  userId: string,
  admin: SupabaseClient | null,
): Promise<Response> {
  const apiKey = resolveOpenAiKey();
  if (!apiKey) {
    return jsonError(500, "Missing OPENAI_API_KEY");
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return jsonError(400, "text is required");
  }

  const voice = resolveTtsVoice(body.voice);

  const gate = await voiceBudgetGate(admin, userId);
  if (gate && !gate.budget.allowed) return budgetExceededResponse();
  const input = text.slice(0, MAX_TTS_CHARS);

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      input,
      voice,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    console.error("OpenAI TTS failed", response.status, await response.text());
    return jsonError(502, "Speech synthesis failed");
  }

  if (gate) {
    scheduleEdgeBackgroundWork(
      recordAiUsage(gate.admin, {
        userId,
        conversationId: typeof body.conversationId === "string" ? body.conversationId : null,
        mode: "voice",
        source: "tts",
        model: TTS_MODEL,
        usage: { ttsChars: input.length },
        tier: gate.budget.tier,
      }),
    );
  }

  const audio = await response.arrayBuffer();
  return new Response(audio, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}

export function resolveVoiceRoute(req: Request): "transcribe" | "tts" | null {
  const mode = new URL(req.url).searchParams.get("voice");
  if (mode === "transcribe" || mode === "tts") return mode;
  return null;
}
