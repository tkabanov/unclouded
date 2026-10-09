import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  handleVoiceTranscribe,
  handleVoiceTts,
} from "../../../../supabase/functions/chat/voice/voiceEdgeHandlers.ts";

/** Fake service client: `check_ai_budget` answers per mode; ledger writes are swallowed. */
function adminClient(allowed: { text: boolean; voice: boolean }) {
  const rpc = vi.fn(async (_fn: string, args: { p_mode: "text" | "voice" }) => ({
    data: { allowed: allowed[args.p_mode], tier: "free" },
    error: null,
  }));
  const from = vi.fn(() => {
    throw new Error("ledger not available in tests");
  });
  return { client: { rpc, from } as unknown as SupabaseClient, rpc };
}

/** Multipart parsing differs between jsdom and undici, so hand the handler the parsed form directly. */
function transcribeRequest() {
  const form = new FormData();
  form.append("file", new File([new Uint8Array([1, 2, 3])], "voice.webm", { type: "audio/webm" }));
  return { formData: async () => form } as unknown as Request;
}

function ttsRequest() {
  return new Request("https://example.com/functions/v1/chat?voice=tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Hello there" }),
  });
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("Deno", { env: { get: (name: string) => (name === "OPENAI_API_KEY" ? "sk-test" : undefined) } });
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("voice STT/TTS budget gate (NCLDD-52)", () => {
  it("STT returns 402 ai_monthly_limit_reached when the voice budget is used up, without calling OpenAI", async () => {
    const { client } = adminClient({ text: true, voice: false });
    const res = await handleVoiceTranscribe(transcribeRequest(), "user-1", client);
    expect(res.status).toBe(402);
    await expect(res.json()).resolves.toMatchObject({ code: "ai_monthly_limit_reached", mode: "voice" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("TTS returns 402 ai_monthly_limit_reached when the voice budget is used up, without calling OpenAI", async () => {
    const { client } = adminClient({ text: true, voice: false });
    const res = await handleVoiceTts(ttsRequest(), "user-1", client);
    expect(res.status).toBe(402);
    await expect(res.json()).resolves.toMatchObject({ code: "ai_monthly_limit_reached", mode: "voice" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("an exhausted text budget does not block voice", async () => {
    const { client, rpc } = adminClient({ text: false, voice: true });
    fetchMock.mockResolvedValueOnce(Response.json({ text: "hi", duration: 2 }));
    const stt = await handleVoiceTranscribe(transcribeRequest(), "user-1", client);
    expect(stt.status).toBe(200);
    await expect(stt.json()).resolves.toEqual({ text: "hi" });

    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array([9, 9]), { status: 200 }));
    const tts = await handleVoiceTts(ttsRequest(), "user-1", client);
    expect(tts.status).toBe(200);
    expect(tts.headers.get("Content-Type")).toBe("audio/mpeg");

    expect(rpc.mock.calls.every((call) => call[1].p_mode === "voice")).toBe(true);
  });

  it("fails open when the budget check errors", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { message: "db down" } }));
    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array([1]), { status: 200 }));
    const res = await handleVoiceTts(ttsRequest(), "user-1", { rpc, from: vi.fn() } as unknown as SupabaseClient);
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
