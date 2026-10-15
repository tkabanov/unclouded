/**
 * NCLDD-57 S5a — Conversation mode (OpenAI Realtime over WebRTC) for `/coaching/voice`.
 * Thin React wrapper over `RealtimeConversationController`; see that file for the flow.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isSessionBusy } from "@/lib/realtime/realtimeSessionMachine";
import type { RealtimeVoice } from "@/lib/realtime/realtimeVoices";
import {
  RealtimeConversationController,
  type RealtimeConversationDeps,
  type RealtimeConversationSnapshot,
} from "@/lib/realtime/rtc/realtimeConversationController";
import { createBrowserRealtimeDeps } from "@/lib/realtime/rtc/browserRealtimeDeps";

/** Ignore level changes smaller than this (avoids a re-render every animation frame). */
const LEVEL_EPSILON = 0.01;

export type UseRealtimeConversationResult = RealtimeConversationSnapshot & {
  /** Smoothed 0..1 audio level for the orb (Kota while speaking, the mic otherwise). */
  level: number;
  /** Call from the Start tap handler (autoplay unlock happens synchronously). */
  start: (voice: RealtimeVoice, conversationId?: string | null) => void;
  end: () => void;
  retry: () => void;
  /** Tap handler for "Tap to enable sound" after autoplay was blocked. */
  resumePlayback: () => void;
};

export function useRealtimeConversation(
  createDeps: () => RealtimeConversationDeps = createBrowserRealtimeDeps,
): UseRealtimeConversationResult {
  const controllerRef = useRef<RealtimeConversationController | null>(null);
  if (!controllerRef.current) controllerRef.current = new RealtimeConversationController(createDeps());
  const controller = controllerRef.current;

  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [level, setLevel] = useState(0);

  useEffect(() => {
    const onPageHide = () => controller.handlePageHide();
    const onOffline = () => controller.handleOffline();
    const onOnline = () => controller.handleOnline();
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onPageHide);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onPageHide);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      controller.dispose();
    };
  }, [controller]);

  const busy = isSessionBusy(snapshot.state.phase);
  useEffect(() => {
    if (!busy || typeof requestAnimationFrame !== "function") {
      setLevel(0);
      return;
    }
    let frame = 0;
    let last = 0;
    const loop = () => {
      const next = controller.readLevel();
      if (Math.abs(next - last) >= LEVEL_EPSILON || (next === 0 && last !== 0)) {
        last = next;
        setLevel(next);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [busy, controller]);

  const start = useCallback(
    (voice: RealtimeVoice, conversationId?: string | null) => void controller.start(voice, conversationId),
    [controller],
  );
  const end = useCallback(() => controller.end(), [controller]);
  const retry = useCallback(() => void controller.retry(), [controller]);
  const resumePlayback = useCallback(() => controller.resumePlayback(), [controller]);

  return { ...snapshot, level, start, end, retry, resumePlayback };
}
