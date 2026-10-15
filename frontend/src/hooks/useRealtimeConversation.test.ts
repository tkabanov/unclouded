import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRealtimeConversation } from "./useRealtimeConversation";
import { createFakeEnv, type FakeEnv } from "@/lib/realtime/rtc/realtimeTestFakes";

let env: FakeEnv;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  env = createFakeEnv();
});

afterEach(() => {
  vi.useRealTimers();
});

async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe("useRealtimeConversation", () => {
  it("starts, goes live, exposes the transcript and ends", async () => {
    const { result } = renderHook(() => useRealtimeConversation(() => env.deps));
    expect(result.current.state.phase).toBe("idle");

    act(() => result.current.start("marin"));
    await flush();
    act(() => env.peer.setState("connected"));
    await flush();
    expect(result.current.state.phase).toBe("listening");
    expect(result.current.conversationId).toBe("conv-1");

    act(() => {
      env.peer.dc.emit({
        type: "conversation.item.input_audio_transcription.completed",
        item_id: "u1",
        transcript: "Hello",
      });
    });
    expect(result.current.transcript.map((item) => item.text)).toEqual(["Hello"]);

    act(() => result.current.end());
    await flush();
    expect(result.current.state).toMatchObject({ phase: "ended", endReason: "user_ended" });
    expect(env.api.end).toHaveBeenCalled();
  });

  it("updates the level from animation frames while busy", async () => {
    const { result } = renderHook(() => useRealtimeConversation(() => env.deps));
    act(() => result.current.start("marin"));
    await flush();
    act(() => env.peer.setState("connected"));
    await flush();
    env.meters[0].value = 1;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(result.current.level).toBeGreaterThan(0.5);
  });

  it("wires window events: offline grace, online, pagehide", async () => {
    const { result } = renderHook(() => useRealtimeConversation(() => env.deps));
    act(() => result.current.start("marin"));
    await flush();
    act(() => env.peer.setState("connected"));
    await flush();

    act(() => {
      window.dispatchEvent(new Event("offline"));
      window.dispatchEvent(new Event("online"));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(result.current.state.phase).toBe("listening");

    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(env.api.endKeepalive).toHaveBeenCalledWith(expect.objectContaining({ reason: "abandoned" }), "access-token");
  });

  it("cleans up on unmount", async () => {
    const { result, unmount } = renderHook(() => useRealtimeConversation(() => env.deps));
    act(() => result.current.start("marin"));
    await flush();
    act(() => env.peer.setState("connected"));
    await flush();
    unmount();
    expect(env.peer.closed).toBe(true);
    expect(env.stream.tracks[0].stopped).toBe(true);
    expect(env.api.endKeepalive).toHaveBeenCalledWith(expect.objectContaining({ reason: "user_ended" }), "access-token");
  });

  it("retry and resumePlayback delegate to the controller", async () => {
    const error = new Error("busy");
    error.name = "NotReadableError";
    env.getUserMedia.mockRejectedValueOnce(error);
    const { result } = renderHook(() => useRealtimeConversation(() => env.deps));
    act(() => result.current.start("marin"));
    await flush();
    expect(result.current.error).toMatchObject({ kind: "mic_busy" });
    act(() => {
      result.current.retry();
      result.current.resumePlayback();
    });
    expect(env.api.start).not.toHaveBeenCalled();
  });
});
