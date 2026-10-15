/**
 * NCLDD-57 S5a — real browser implementations of the controller's injected surface.
 */
import { supabase } from "@/integrations/supabase/client";
import { VOICE_INPUT_MEDIA_CONSTRAINTS, computeTimeDomainRms } from "@/lib/chat/voiceSessionApi";
import {
  callRealtimeTool,
  endRealtimeSession,
  endRealtimeSessionKeepalive,
  markRealtimeConnected,
  persistRealtimeTranscript,
  reportRealtimeUsage,
  sendRealtimeHeartbeat,
  startRealtimeSession,
} from "../realtimeVoiceApi";
import type {
  LevelMeter,
  RealtimeConversationApi,
  RealtimeConversationDeps,
  RtcAudioLike,
  RtcPeerLike,
  RtcStreamLike,
} from "./realtimeConversationController";

/** Speech RMS rarely exceeds ~0.25; scale so normal speech fills most of 0..1. */
const LEVEL_GAIN = 4;

export const realtimeConversationApi: RealtimeConversationApi = {
  start: startRealtimeSession,
  connected: markRealtimeConnected,
  heartbeat: sendRealtimeHeartbeat,
  usage: reportRealtimeUsage,
  transcript: persistRealtimeTranscript,
  tool: callRealtimeTool,
  end: endRealtimeSession,
  endKeepalive: endRealtimeSessionKeepalive,
};

function audioContextCtor(): typeof AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

/** RMS level of a stream via an AnalyserNode; null when Web Audio is unavailable. */
export function createAnalyserLevelMeter(stream: RtcStreamLike): LevelMeter | null {
  const Ctor = audioContextCtor();
  if (!Ctor) return null;
  try {
    const context = new Ctor();
    const source = context.createMediaStreamSource(stream as unknown as MediaStream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const frame = new Float32Array(analyser.fftSize);
    return {
      read() {
        analyser.getFloatTimeDomainData(frame);
        return Math.min(1, computeTimeDomainRms(frame) * LEVEL_GAIN);
      },
      close() {
        try {
          source.disconnect();
        } catch {
          // ignore
        }
        void context.close().catch(() => undefined);
      },
    };
  } catch {
    return null;
  }
}

/** Notify when the microphone permission becomes `denied` (where the Permissions API exists). */
export function watchMicPermission(onDenied: () => void): () => void {
  let status: PermissionStatus | null = null;
  let cancelled = false;
  const onChange = () => {
    if (status?.state === "denied") onDenied();
  };
  navigator.permissions
    ?.query({ name: "microphone" as PermissionName })
    .then((result) => {
      if (cancelled) return;
      status = result;
      result.addEventListener("change", onChange);
    })
    .catch(() => undefined);
  return () => {
    cancelled = true;
    status?.removeEventListener("change", onChange);
  };
}

export function createBrowserRealtimeDeps(): RealtimeConversationDeps {
  return {
    api: realtimeConversationApi,
    getUserMedia: () =>
      navigator.mediaDevices.getUserMedia(VOICE_INPUT_MEDIA_CONSTRAINTS) as unknown as Promise<RtcStreamLike>,
    createPeerConnection: () => new RTCPeerConnection() as unknown as RtcPeerLike,
    createAudioElement: () => {
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.setAttribute("playsinline", "");
      return audio as unknown as RtcAudioLike;
    },
    getAccessToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
    createLevelMeter: createAnalyserLevelMeter,
    watchMicPermission,
    log: (message, detail) => console.warn(message, detail),
  };
}
