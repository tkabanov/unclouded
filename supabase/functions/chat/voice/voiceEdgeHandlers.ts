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

function jsonError(status: number, error: string): Response {
  return jsonResponse(status, { error });
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
export async function handleVoiceTranscribe(req: Request): Promise<Response> {
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

  const whisperForm = new FormData();
  whisperForm.append("file", file, file.name || "voice.webm");
  whisperForm.append("model", "whisper-1");
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

  const payload = (await response.json()) as { text?: string };
  return jsonResponse(200, { text: typeof payload.text === "string" ? payload.text : "" });
}

/** OpenAI TTS — REQ-14 Kota spoken replies (Nova voice default). */
export async function handleVoiceTts(req: Request): Promise<Response> {
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

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text.slice(0, MAX_TTS_CHARS),
      voice,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    console.error("OpenAI TTS failed", response.status, await response.text());
    return jsonError(502, "Speech synthesis failed");
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
