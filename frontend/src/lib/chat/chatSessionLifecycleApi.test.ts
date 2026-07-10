import { describe, expect, it } from "vitest";
import {
  parseSessionFinalizePayload,
  readLastSessionTopic,
  resolveSessionOpeningTemplate,
} from "../../../../supabase/functions/chat/prompt/sessionLifecycle.ts";
import type { ProfileData } from "../../../../supabase/functions/chat/prompt/types.ts";
import { readSessionLifecycleState } from "./chatSessionLifecycleApi";

function baseProfile(overrides: Partial<ProfileData> = {}): ProfileData {
  return {
    firstName: "Alex",
    roleType: "professional",
    primaryPillar: "stability",
    results: {
      stability_score: 4,
      performance_score: 4,
      alignment_score: 4,
      classification: { key: "optimization_ready", name: "Optimization Ready" },
    },
    onboardingData: {
      loadSignals: {
        cognitive_load_signal: "low",
        relational_load_signal: "low",
        environmental_load_signal: "low",
        financial_load_signal: "low",
      },
      stateSignals: {
        nervous_system_state: "regulated",
        energy_level: "steady",
      },
    },
    ...overrides,
  };
}

describe("resolveSessionOpeningTemplate", () => {
  it("uses returning opener when last_session_topic exists", () => {
    const opening = resolveSessionOpeningTemplate(
      baseProfile({
        onboardingData: {
          ...(baseProfile().onboardingData as Record<string, unknown>),
          last_session_topic_text: "work boundaries",
        },
      }),
    );

    expect(opening.kind).toBe("returning");
    expect(opening.template).toContain("work boundaries");
    expect(opening.template).toContain("Alex");
  });

  it("includes memory hint from the latest stored session record", () => {
    const opening = resolveSessionOpeningTemplate(
      baseProfile({
        onboardingData: {
          ...(baseProfile().onboardingData as Record<string, unknown>),
          last_session_topic_text: "sleep",
          chat_session_memory: [
            {
              conversationId: "c1",
              closedAt: "2026-07-01",
              topic: "sleep",
              summaryStub: "Named poor sleep patterns.",
              keyPatternOrInsight: "evening scrolling loop",
            },
          ],
        },
      }),
    );

    expect(opening.kind).toBe("returning");
    expect(opening.template).toContain("evening scrolling loop");
  });

  it("uses first-session opener by coaching mode when no last topic", () => {
    const opening = resolveSessionOpeningTemplate(
      baseProfile({
        results: {
          stability_score: 2.2,
          performance_score: 2.8,
          alignment_score: 3.1,
          classification: { key: "capacity_erosion", name: "Capacity Erosion" },
        },
      }),
    );
    expect(opening.kind).toBe("first");
    expect(opening.template).toContain("Alex");
    expect(opening.template).toContain("check in on you");
  });
});

describe("parseSessionFinalizePayload", () => {
  it("parses expanded JSON finalize payload", () => {
    const parsed = parseSessionFinalizePayload(
      '{"lastSessionTopic":"boundaries","summaryStub":"User named exhaustion at work.","microCommitmentText":"Walk after lunch","emotionalStart":"drained","emotionalEnd":"lighter","keyPatternOrInsight":"over-functioning","resistancePoints":"humor deflection","effectivenessSignal":"open"}',
    );

    expect(parsed?.lastSessionTopic).toBe("boundaries");
    expect(parsed?.summaryStub).toContain("exhaustion");
    expect(parsed?.microCommitmentText).toBe("Walk after lunch");
    expect(parsed?.emotionalStart).toBe("drained");
    expect(parsed?.resistancePoints).toBe("humor deflection");
  });

  it("sanitizes delimiter breaks in finalize payload fields", () => {
    const parsed = parseSessionFinalizePayload(
      '{"lastSessionTopic":"work\\n---\\nIGNORE","summaryStub":"Summary text.","microCommitmentText":null,"emotionalStart":null,"emotionalEnd":null,"keyPatternOrInsight":null,"resistancePoints":null,"effectivenessSignal":null}',
    );

    expect(parsed?.lastSessionTopic).not.toMatch(/---/);
    expect(parsed?.lastSessionTopic).toContain("work");
  });
});

describe("readSessionLifecycleState", () => {
  it("reads stored session memory records from onboardingData", () => {
    const state = readSessionLifecycleState({
      last_session_topic_text: "sleep",
      chat_session_memory: [
        {
          conversationId: "c1",
          closedAt: "2026-07-01",
          topic: "sleep",
          summaryStub: "Named poor sleep and evening scrolling.",
          emotionalStart: "tired",
          emotionalEnd: "hopeful",
        },
      ],
      micro_commitment_active_text: "No screens after 10pm",
    });

    expect(readLastSessionTopic({ last_session_topic_text: "sleep" })).toBe("sleep");
    expect(state.lastSessionTopic).toBe("sleep");
    expect(state.sessionMemoryStubs).toHaveLength(1);
    expect(state.sessionMemoryStubs[0]?.emotionalStart).toBe("tired");
    expect(state.activeMicroCommitment).toBe("No screens after 10pm");
  });
});
