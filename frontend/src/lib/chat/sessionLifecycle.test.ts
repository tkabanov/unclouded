import { describe, expect, it } from "vitest";

import {
  buildCheckInOpeningTemplate,
  buildSessionLifecycleInstruction,
  readTodayCheckInOpening,
  resolveSessionOpeningTemplate,
} from "../../../../supabase/functions/chat/prompt/sessionLifecycle.ts";
import type { ProfileData } from "../../../../supabase/functions/chat/prompt/types.ts";

function baseProfile(overrides: Partial<ProfileData> = {}): ProfileData {
  return {
    firstName: "Alex",
    onboardingData: {},
    ...overrides,
  };
}

function todayIso(): string {
  return new Date().toISOString();
}

describe("readTodayCheckInOpening", () => {
  it("returns feeling word when check-in was submitted today", () => {
    expect(
      readTodayCheckInOpening(
        baseProfile({
          liveContext: {
            latestCheckIn: {
              date: todayIso(),
              pulse: 4,
              feeling: "drained",
            },
          },
        }),
      ),
    ).toEqual({ feelingWord: "drained", pulse: 4 });
  });

  it("ignores stale check-ins from prior days", () => {
    expect(
      readTodayCheckInOpening(
        baseProfile({
          liveContext: {
            latestCheckIn: {
              date: "2020-01-01T09:00:00.000Z",
              pulse: 4,
              feeling: "drained",
            },
          },
        }),
      ),
    ).toBeNull();
  });
});

describe("resolveSessionOpeningTemplate", () => {
  it("opens with today's feeling word before last session topic (Block 3.34)", () => {
    const opening = resolveSessionOpeningTemplate(
      baseProfile({
        onboardingData: {
          last_session_topic_text: "work stress",
        },
        liveContext: {
          latestCheckIn: {
            date: todayIso(),
            pulse: 3,
            feeling: "overwhelmed",
          },
        },
      }),
    );

    expect(opening.kind).toBe("check_in_today");
    expect(opening.template).toContain("your check-in today says overwhelmed");
    expect(opening.template).not.toContain("work stress");
  });

  it("uses pulse-only opening when feeling word is absent", () => {
    const opening = resolveSessionOpeningTemplate(
      baseProfile({
        liveContext: {
          latestCheckIn: {
            date: todayIso(),
            pulse: 6,
            feeling: "",
          },
        },
      }),
    );

    expect(opening.kind).toBe("check_in_today");
    expect(opening.template).toContain("came in at 6/10");
  });

  it("keeps crisis aftercare ahead of check-in opening", () => {
    const opening = resolveSessionOpeningTemplate(
      baseProfile({
        liveContext: {
          hasPriorCrisisSession: true,
          latestCheckIn: {
            date: todayIso(),
            pulse: 5,
            feeling: "steady",
          },
        },
      }),
    );

    expect(opening.kind).toBe("crisis_aftercare");
    expect(opening.template).not.toContain("check-in today");
  });

  it("buildSessionLifecycleInstruction forbids coaching topic recap on crisis aftercare open", () => {
    const instruction = buildSessionLifecycleInstruction(
      "session_open",
      baseProfile({
        firstName: "Fedor",
        onboardingData: {
          last_session_topic_text: "Navigating pressure to be productive after work",
        },
        liveContext: {
          hasPriorCrisisSession: true,
        },
      }),
    );

    expect(instruction).toContain("Opening kind: crisis_aftercare");
    expect(instruction).toContain("hard place");
    expect(instruction).toContain("Do NOT recap prior coaching topics");
    expect(instruction).toContain("Do NOT reference last_session_topic");
    expect(instruction).not.toContain("One specific context sentence before agenda");
  });

  it("uses after-module opening when a module was completed recently", () => {
    const opening = resolveSessionOpeningTemplate(
      baseProfile({
        onboardingData: {
          last_completed_module_name: "Identity Lens",
          last_completed_module_at: new Date().toISOString(),
        },
      }),
    );

    expect(opening.kind).toBe("returning_after_module");
    expect(opening.template).toContain("you just completed Identity Lens");
    expect(opening.template).toContain("Alex");
  });

  it("prefers after-module opening over generic returning session", () => {
    const opening = resolveSessionOpeningTemplate(
      baseProfile({
        onboardingData: {
          last_completed_module_name: "Identity Lens",
          last_completed_module_at: new Date().toISOString(),
          last_session_topic_text: "work stress",
        },
      }),
    );

    expect(opening.kind).toBe("returning_after_module");
    expect(opening.template).not.toContain("Last time we talked about work stress");
  });

  it("falls back to returning session when module completion is stale", () => {
    const opening = resolveSessionOpeningTemplate(
      baseProfile({
        onboardingData: {
          last_completed_module_name: "Identity Lens",
          last_completed_module_at: "2020-01-01T00:00:00.000Z",
          last_session_topic_text: "boundaries at work",
        },
      }),
    );

    expect(opening.kind).toBe("returning");
    expect(opening.template.toLowerCase()).toContain("boundaries at work");
    expect(opening.template).toContain("Alex");
  });

  it("uses generic memory hint on Free tier without session memory detail", () => {
    const opening = resolveSessionOpeningTemplate(
      baseProfile({
        tier: "free",
        subscribed: false,
        onboardingData: {
          last_session_topic_text: "boundaries at work",
          chat_session_memory: [
            {
              conversationId: "c1",
              closedAt: "2026-07-01",
              topic: "boundaries at work",
              summaryStub: "Named exhaustion at work.",
              unresolvedThread: "whether to tell their manager",
            },
          ],
        },
      }),
    );

    expect(opening.kind).toBe("returning");
    expect(opening.template).toContain("I've been sitting with what you shared.");
    expect(opening.template).not.toContain("manager");
    expect(opening.template).not.toContain("still open");
  });

  it("uses return after absence when gap is 10+ days and no check-in today", () => {
    const opening = resolveSessionOpeningTemplate(
      baseProfile({
        liveContext: {
          daysSinceLastSession: 14,
        },
      }),
    );

    expect(opening.kind).toBe("return_after_absence");
    expect(opening.template).toContain("Good to have you back");
  });

  it("prefers today's check-in opening over return after absence", () => {
    const opening = resolveSessionOpeningTemplate(
      baseProfile({
        liveContext: {
          daysSinceLastSession: 14,
          latestCheckIn: {
            date: new Date().toISOString(),
            pulse: 5,
            feeling: "steady",
          },
        },
      }),
    );

    expect(opening.kind).toBe("check_in_today");
    expect(opening.template).not.toContain("Good to have you back");
  });

  it("formats combined feeling and pulse check-in opening", () => {
    expect(
      buildCheckInOpeningTemplate("Alex", { feelingWord: "steady", pulse: 7 }),
    ).toBe("Alex, your check-in today says steady (7/10) — let's start there.");
  });
});

describe("buildSessionLifecycleInstruction — session_close", () => {
  it("asks for commitment only — values bridge is deferred to session_close_ack", async () => {
    const { buildSessionLifecycleInstruction } = await import(
      "../../../../supabase/functions/chat/prompt/sessionLifecycle.ts"
    );

    const instruction = buildSessionLifecycleInstruction(
      "session_close",
      baseProfile({
        liveContext: {
          memoryFactsBlock: "Stated goals: be present with my kids at dinner",
        },
      }),
    );

    expect(instruction).toContain("COMMITMENT REQUEST");
    expect(instruction).toContain("Do NOT ask \"How does this connect to what you actually care about most right now?\"");
    expect(instruction).toContain("What's one thing you're willing to do before we talk again?");
    expect(instruction).not.toContain("COMMITMENT-TO-VALUES BRIDGE");
  });

  it("does not include values anchor note on session_close", async () => {
    const { buildSessionLifecycleInstruction } = await import(
      "../../../../supabase/functions/chat/prompt/sessionLifecycle.ts"
    );

    const instruction = buildSessionLifecycleInstruction("session_close", baseProfile());
    expect(instruction).not.toContain("No stored values anchor on file");
  });
});

describe("buildSessionLifecycleInstruction — session_close_ack", () => {
  it("applies Block 3.33 values bridge after the user states commitment", async () => {
    const { buildSessionLifecycleInstruction } = await import(
      "../../../../supabase/functions/chat/prompt/sessionLifecycle.ts"
    );

    const instruction = buildSessionLifecycleInstruction(
      "session_close_ack",
      baseProfile({
        liveContext: {
          memoryFactsBlock: "Stated goals: be present with my kids at dinner",
        },
      }),
    );

    expect(instruction).toContain("COMMITMENT-TO-VALUES BRIDGE");
    expect(instruction).toContain("be present with my kids at dinner");
    expect(instruction).toContain("do NOT ask another question");
    expect(instruction).toContain("You said");
    expect(instruction).toContain("Do NOT repeat or paraphrase the previous assistant message");
    expect(instruction).not.toContain("What's one thing you're willing to do before we talk again?");
  });

  it("infers values link when no anchor is stored", async () => {
    const { buildSessionLifecycleInstruction } = await import(
      "../../../../supabase/functions/chat/prompt/sessionLifecycle.ts"
    );

    const instruction = buildSessionLifecycleInstruction("session_close_ack", baseProfile());
    expect(instruction).toContain("No stored values anchor on file");
    expect(instruction).toContain("do not ask another question");
    expect(instruction).toContain('Do NOT ask "How does this connect to what you actually care about most right now?"');
  });
});

describe("buildSessionCloseAckUserPrompt", () => {
  it("includes user commitment, prior assistant text, and anti-repeat rules", async () => {
    const { buildSessionCloseAckUserPrompt } = await import(
      "../../../../supabase/functions/chat/prompt/sessionLifecycle.ts"
    );

    const prompt = buildSessionCloseAckUserPrompt(
      [
        {
          id: "u1",
          role: "user",
          parts: [{ type: "text", text: "Work is crushing me." }],
        },
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "What's one thing you're willing to do before we talk again?",
            },
          ],
        },
        {
          id: "u2",
          role: "user",
          parts: [{ type: "text", text: "Text my sister tomorrow morning." }],
        },
      ],
      baseProfile({
        liveContext: {
          memoryFactsBlock: "Stated goals: be present with my kids at dinner",
        },
      }),
    );

    expect(prompt).toContain("Text my sister tomorrow morning.");
    expect(prompt).toContain("What's one thing you're willing to do before we talk again?");
    expect(prompt).toContain("DO NOT repeat or paraphrase this");
    expect(prompt).toContain("be present with my kids at dinner");
    expect(prompt).toContain("You said");
    expect(prompt).toContain("COMMITMENT-TO-VALUES BRIDGE");
  });
});

describe("buildSessionCloseUserPrompt", () => {
  it("asks for commitment only without values bridge", async () => {
    const { buildSessionCloseUserPrompt } = await import(
      "../../../../supabase/functions/chat/prompt/sessionLifecycle.ts"
    );

    const prompt = buildSessionCloseUserPrompt(
      [
        {
          id: "u1",
          role: "user",
          parts: [{ type: "text", text: "I keep avoiding hard conversations." }],
        },
        {
          id: "a1",
          role: "assistant",
          parts: [{ type: "text", text: "What would asking for help look like?" }],
        },
      ],
      baseProfile(),
    );

    expect(prompt).toContain("COMMITMENT REQUEST");
    expect(prompt).toContain("What's one thing you're willing to do before we talk again?");
    expect(prompt).not.toContain("COMMITMENT-TO-VALUES BRIDGE");
  });
});

describe("resolveValuesBridgeAnchors", () => {
  it("extracts stated goals and recent session summaries", async () => {
    const { resolveValuesBridgeAnchors } = await import(
      "../../../../supabase/functions/chat/prompt/sessionLifecycle.ts"
    );
    const { CHAT_SESSION_MEMORY_KEY } = await import(
      "../../../../supabase/functions/chat/sessionMemory/sessionMemoryHelpers.ts"
    );

    const anchors = resolveValuesBridgeAnchors(
      baseProfile({
        liveContext: {
          memoryFactsBlock: "Stated goals: protect evenings with my kids\nUser insights: I shut down when overwhelmed",
        },
        onboardingData: {
          [CHAT_SESSION_MEMORY_KEY]: [
            {
              conversationId: "c1",
              closedAt: "2026-07-18",
              topic: "presence",
              summaryStub: "User said dinner presence is the line they won't cross.",
            },
          ],
        },
      }),
    );

    expect(anchors).toContain("protect evenings with my kids");
    expect(anchors.some((anchor) => anchor.includes("dinner presence"))).toBe(true);
  });
});
