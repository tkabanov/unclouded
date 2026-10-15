/** Test doubles for the realtime controller (WebRTC, media, API). Test-only module. */
import { vi } from "vitest";
import type {
  LevelMeter,
  RealtimeConversationApi,
  RealtimeConversationDeps,
  RtcAudioLike,
  RtcDataChannelLike,
  RtcPeerLike,
  RtcStreamLike,
  RtcTrackLike,
} from "./realtimeConversationController";
import type { RealtimeStartResult } from "../realtimeVoiceApi";

export class FakeTrack implements RtcTrackLike {
  stopped = false;
  onended: (() => void) | null = null;
  stop() {
    this.stopped = true;
  }
}

export class FakeStream implements RtcStreamLike {
  tracks = [new FakeTrack()];
  getTracks() {
    return this.tracks;
  }
  getAudioTracks() {
    return this.tracks;
  }
}

export class FakeDataChannel implements RtcDataChannelLike {
  readyState = "open";
  sent: Array<Record<string, unknown>> = [];
  closed = false;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.closed = true;
  }
  /** Deliver a server event as the data channel would. */
  emit(event: Record<string, unknown>) {
    this.onmessage?.({ data: JSON.stringify(event) });
  }
  sentTypes() {
    return this.sent.map((message) => message.type);
  }
}

export class FakePeer implements RtcPeerLike {
  connectionState = "new";
  closed = false;
  tracks: RtcTrackLike[] = [];
  dc = new FakeDataChannel();
  remoteSdp: string | null = null;
  failRemote = false;
  failOffer = false;
  ontrack: ((event: { streams: readonly RtcStreamLike[] }) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  addTrack(track: RtcTrackLike) {
    this.tracks.push(track);
  }
  createDataChannel() {
    return this.dc;
  }
  async createOffer() {
    if (this.failOffer) throw new Error("offer failed");
    return { sdp: "offer-sdp" };
  }
  async setLocalDescription() {}
  async setRemoteDescription(description: { sdp: string }) {
    if (this.failRemote) throw new Error("bad answer");
    this.remoteSdp = description.sdp;
  }
  close() {
    this.closed = true;
  }
  setState(state: string) {
    this.connectionState = state;
    this.onconnectionstatechange?.();
  }
}

export class FakeAudio implements RtcAudioLike {
  srcObject: unknown = null;
  autoplay = false;
  paused = false;
  playCalls = 0;
  blockPlay = false;
  play() {
    this.playCalls += 1;
    if (this.blockPlay) {
      const error = new Error("blocked");
      error.name = "NotAllowedError";
      return Promise.reject(error);
    }
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

export const START_RESULT: RealtimeStartResult = {
  realtimeSessionId: "rs-1",
  conversationId: "conv-1",
  sdpAnswer: "answer-sdp",
  model: "gpt-realtime-2.1",
  voice: "marin",
  expiresAt: new Date(60 * 60_000).toISOString(),
  heartbeatSec: 30,
  idleTimeoutSec: 600,
};

export function createFakeApi(): { [K in keyof RealtimeConversationApi]: ReturnType<typeof vi.fn> } & RealtimeConversationApi {
  return {
    start: vi.fn(async () => START_RESULT),
    connected: vi.fn(async () => undefined),
    heartbeat: vi.fn(async () => ({ stop: null })),
    usage: vi.fn(async () => ({ duplicate: false })),
    transcript: vi.fn(async () => ({ crisis: null })),
    tool: vi.fn(async () => ({ output: "tool result" })),
    end: vi.fn(async () => ({ usageStatus: "complete" })),
    endKeepalive: vi.fn(),
  } as never;
}

export type FakeEnv = {
  deps: RealtimeConversationDeps;
  api: ReturnType<typeof createFakeApi>;
  peer: FakePeer;
  stream: FakeStream;
  audio: FakeAudio;
  getUserMedia: ReturnType<typeof vi.fn>;
  meters: Array<LevelMeter & { value: number; closed: boolean }>;
  permissionDenied: () => void;
  stopPermissionWatch: ReturnType<typeof vi.fn>;
};

export function createFakeEnv(): FakeEnv {
  const api = createFakeApi();
  const peer = new FakePeer();
  const stream = new FakeStream();
  const audio = new FakeAudio();
  const meters: FakeEnv["meters"] = [];
  let onDenied: (() => void) | null = null;
  const stopPermissionWatch = vi.fn();
  const getUserMedia = vi.fn(async () => stream);
  const deps: RealtimeConversationDeps = {
    api,
    getUserMedia,
    createPeerConnection: () => peer,
    createAudioElement: () => audio,
    getAccessToken: async () => "access-token",
    createLevelMeter: () => {
      const meter = {
        value: 0,
        closed: false,
        read() {
          return meter.value;
        },
        close() {
          meter.closed = true;
        },
      };
      meters.push(meter);
      return meter;
    },
    watchMicPermission: (cb) => {
      onDenied = cb;
      return stopPermissionWatch;
    },
    now: () => Date.now(),
  };
  return {
    deps,
    api,
    peer,
    stream,
    audio,
    getUserMedia,
    meters,
    permissionDenied: () => onDenied?.(),
    stopPermissionWatch,
  };
}
