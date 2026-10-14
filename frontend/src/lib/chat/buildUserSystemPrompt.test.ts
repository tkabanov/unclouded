import { describe, expect, it } from "vitest";
import {
  buildSystemPrompt,
  type ProfileData,
} from "../../../../supabase/functions/chat/buildSystemPrompt.ts";
import {
  PLATFORM_RULES_REMINDER_HEADER,
  TONE_OF_VOICE_HEADER,
  type PlatformAiSettings,
} from "../../../../supabase/functions/_shared/platformAiSettings.ts";
import { modeFromSessionType } from "../../../../supabase/functions/_shared/aiUsage.ts";
import {
  applyRequestLiveContext,
  buildSystemWithLifecycle,
} from "../../../../supabase/functions/chat/buildUserSystemPrompt.ts";
import { parseChatRequestBody } from "../../../../supabase/functions/chat/parseChatRequestBody.ts";
import {
  REALTIME_VOICE_ADDENDUM,
  isVoiceSessionType,
} from "../../../../supabase/functions/chat/prompt/realtimeVoicePrompts.ts";
import {
  REALTIME_CONVERSATION_MIN_TIER,
  canUseRealtimeConversation,
} from "../../../../supabase/functions/chat/tierGateHelpers.ts";
import {
  buildSessionLifecycleInstruction,
  type ChatLifecycleMode,
} from "../../../../supabase/functions/chat/prompt/sessionLifecycle.ts";

// Pre-extraction `buildSystemWithLifecycle` from chat/index.ts (NCLDD-57 S2 baseline).
function legacyBuildSystemWithLifecycle(
  profileData: ProfileData | undefined,
  context: string | undefined,
  lifecycle: ChatLifecycleMode | undefined,
  platformSettings?: PlatformAiSettings | null,
): string {
  const instruction = lifecycle
    ? buildSessionLifecycleInstruction(lifecycle, profileData ?? {}, context)
    : undefined;
  return buildSystemPrompt(profileData, context, undefined, platformSettings, instruction);
}

const SETTINGS: PlatformAiSettings = {
  globalSystemPrompt: "",
  platformRules: "Never give medical diagnoses.",
  prohibitedTopics: ["politics"],
  toneOfVoice: "Warm and direct.",
};

function fixtureProfile(
  sessionType: "text" | "voice" | "voice_conversation",
  voiceEmotionDetected = false,
): ProfileData {
  return {
    firstName: "Alex",
    roleType: "professional",
    primaryPillar: "stability",
    subscribed: false,
    tier: "free",
    results: {
      stability_score: 3.6,
      performance_score: 3.4,
      alignment_score: 3.9,
      classification: { key: "optimization_ready", name: "Optimization Ready" },
      tradeoff_statement: "Output vs recovery",
      recovery_mode_active: false,
      grief_mode_active: false,
      trauma_informed_mode: false,
    },
    onboardingData: {
      behavioralFingerprint: "Driver / Depletion Risk",
      modules_completed_count_number: 1,
      session_count_number: 3,
      loadSignals: { cognitive_load_signal: "medium" },
      stateSignals: { nervous_system_state: "regulated", energy_level: "steady" },
    },
    liveContext: {
      sessionType,
      voiceEmotionDetected,
      exchangeCount: 2,
      sessionCount: 3,
      streakDays: 4,
      daysSinceLastSession: 2,
    },
  } as ProfileData;
}

const CASES: Array<{
  name: string;
  sessionType: "text" | "voice";
  emotion?: boolean;
  lifecycle?: ChatLifecycleMode;
  context?: string;
  settings?: PlatformAiSettings | null;
}> = [
  { name: "text turn, no platform settings", sessionType: "text" },
  { name: "text turn, platform settings", sessionType: "text", settings: SETTINGS },
  { name: "voice turn, no platform settings", sessionType: "voice", emotion: true },
  { name: "voice turn, platform settings", sessionType: "voice", settings: SETTINGS },
  { name: "session_open text, no platform settings", sessionType: "text", lifecycle: "session_open" },
  {
    name: "session_open voice, platform settings",
    sessionType: "voice",
    lifecycle: "session_open",
    context: "voice-coaching",
    settings: SETTINGS,
  },
];

describe("buildUserSystemPrompt extraction (NCLDD-57 S2)", () => {
  for (const c of CASES) {
    it(`system prompt is byte-identical to the pre-extraction snapshot: ${c.name}`, () => {
      const profile = fixtureProfile(c.sessionType, c.emotion);
      const system = buildSystemWithLifecycle(profile, c.context, c.lifecycle, undefined, c.settings);
      expect(system).toBe(legacyBuildSystemWithLifecycle(profile, c.context, c.lifecycle, c.settings));
      expect(system).toMatchSnapshot();
    });
  }
});

describe("voice_conversation prompt (NCLDD-57 S2)", () => {
  const SEP = "\n\n---\n\n";

  it("treats voice_conversation as voice: Block 3.36 + emotion acknowledgment", () => {
    const system = buildSystemWithLifecycle(fixtureProfile("voice_conversation", true), undefined, undefined);
    expect(system).toContain("session_type: voice_conversation");
    expect(system).toContain("Activate Voice Session Adaptation Protocol (Block 3.36)");
    expect(system).toContain("I can hear something in how you said that.");
  });

  it("adds the realtime addendum only for voice_conversation", () => {
    for (const type of ["text", "voice"] as const) {
      expect(buildSystemWithLifecycle(fixtureProfile(type), undefined, undefined, undefined, SETTINGS)).not.toContain(
        REALTIME_VOICE_ADDENDUM,
      );
    }
    expect(
      buildSystemWithLifecycle(fixtureProfile("voice_conversation"), undefined, undefined, undefined, SETTINGS),
    ).toContain(REALTIME_VOICE_ADDENDUM);
  });

  it("places the addendum before the lifecycle instruction, rules reminder and tone", () => {
    const profile = fixtureProfile("voice_conversation");
    const system = buildSystemWithLifecycle(profile, undefined, "session_open", undefined, SETTINGS);
    const instruction = buildSessionLifecycleInstruction("session_open", profile, undefined);
    const blocks = system.split(SEP);
    const at = (needle: string) => blocks.findIndex((block) => block.includes(needle));
    const addendumAt = blocks.indexOf(REALTIME_VOICE_ADDENDUM);
    expect(addendumAt).toBeGreaterThan(0);
    expect(blocks[addendumAt + 1]).toBe(instruction);
    expect(blocks[addendumAt + 2]).toContain(PLATFORM_RULES_REMINDER_HEADER);
    expect(blocks[addendumAt + 3]).toContain(TONE_OF_VOICE_HEADER);
    expect(at(TONE_OF_VOICE_HEADER)).toBe(blocks.length - 1);
  });

  it("keeps the addendum before the rules reminder without a lifecycle instruction", () => {
    const blocks = buildSystemWithLifecycle(
      fixtureProfile("voice_conversation"),
      undefined,
      undefined,
      undefined,
      SETTINGS,
    ).split(SEP);
    const addendumAt = blocks.indexOf(REALTIME_VOICE_ADDENDUM);
    expect(blocks[addendumAt + 1]).toContain(PLATFORM_RULES_REMINDER_HEADER);
  });

  it("is the last block when there are no platform settings", () => {
    const blocks = buildSystemWithLifecycle(fixtureProfile("voice_conversation"), undefined, undefined).split(SEP);
    expect(blocks[blocks.length - 1]).toBe(REALTIME_VOICE_ADDENDUM);
  });

  it("uses the voice close notes for voice_conversation", () => {
    const profile = fixtureProfile("voice_conversation");
    expect(buildSessionLifecycleInstruction("session_close", profile, undefined)).toContain("Voice session:");
    expect(buildSessionLifecycleInstruction("session_close_ack", profile, undefined)).toContain("Voice session:");
  });
});

describe("voice_conversation session type plumbing (NCLDD-57 S2)", () => {
  it("parseChatRequestBody accepts voice_conversation and still drops unknown types", () => {
    expect(parseChatRequestBody({ sessionType: "voice_conversation" }).sessionType).toBe("voice_conversation");
    expect(parseChatRequestBody({ sessionType: " voice " }).sessionType).toBe("voice");
    expect(parseChatRequestBody({ sessionType: "quick_checkin" }).sessionType).toBeUndefined();
  });

  it("maps voice_conversation to usage mode voice", () => {
    expect(modeFromSessionType("voice_conversation")).toBe("voice");
    expect(modeFromSessionType("voice")).toBe("voice");
    expect(modeFromSessionType("text")).toBe("text");
    expect(modeFromSessionType("quick_checkin")).toBe("text");
    expect(modeFromSessionType(undefined)).toBe("text");
  });

  it("isVoiceSessionType covers both voice delivery types", () => {
    expect(isVoiceSessionType("voice")).toBe(true);
    expect(isVoiceSessionType("voice_conversation")).toBe(true);
    expect(isVoiceSessionType("text")).toBe(false);
    expect(isVoiceSessionType(null)).toBe(false);
  });

  it("applyRequestLiveContext sets session type, emotion and exchange count", () => {
    const profile = fixtureProfile("text", true);
    applyRequestLiveContext(profile, { sessionType: "voice_conversation", exchangeCount: 5 });
    expect(profile.liveContext).toMatchObject({
      sessionType: "voice_conversation",
      voiceEmotionDetected: false,
      exchangeCount: 5,
    });

    applyRequestLiveContext(profile, { voiceEmotionDetected: true, exchangeCount: 0 });
    expect(profile.liveContext).toMatchObject({
      sessionType: "voice_conversation",
      voiceEmotionDetected: true,
      exchangeCount: 0,
    });

    const noLive = { ...fixtureProfile("text"), liveContext: undefined };
    applyRequestLiveContext(noLive, { sessionType: "voice", exchangeCount: 1 });
    expect(noLive.liveContext).toBeUndefined();
  });
});

describe("canUseRealtimeConversation (NCLDD-57 §5.5)", () => {
  it("allows every tier today", () => {
    expect(REALTIME_CONVERSATION_MIN_TIER).toBe("free");
    for (const tier of ["free", "pro", "premium"] as const) {
      expect(canUseRealtimeConversation(tier)).toBe(true);
    }
  });

  it("honours a higher minimum tier", () => {
    expect(canUseRealtimeConversation("free", "pro")).toBe(false);
    expect(canUseRealtimeConversation("pro", "pro")).toBe(true);
    expect(canUseRealtimeConversation("premium", "pro")).toBe(true);
    expect(canUseRealtimeConversation("pro", "premium")).toBe(false);
    expect(canUseRealtimeConversation("premium", "premium")).toBe(true);
  });
});
