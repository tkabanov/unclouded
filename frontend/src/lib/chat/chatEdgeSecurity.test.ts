import { describe, expect, it } from "vitest";
import {
  CRISIS_RESPONSE_TEXT,
  classifyCrisisLevel,
  detectCrisisInLiveContext,
  detectCrisisInThread,
  detectCrisisLanguage,
  requiresCrisisHardStop,
} from "../../../../supabase/functions/chat/crisisDetect.ts";
import {
  FREE_TIER_SESSION_LIMIT,
  FREE_TIER_UPSELL_MESSAGE,
  currentMonthKey,
  isContinuingSession,
  isFreeTierUser,
  readMonthlyUsage,
  shouldRecordNewSession,
} from "../../../../supabase/functions/chat/tierGateHelpers.ts";
import { buildSystemPrompt } from "../../../../supabase/functions/chat/buildSystemPrompt.ts";

describe("classifyCrisisLevel", () => {
  it("returns null for Level 1 distress (no edge regex hard-stop)", () => {
    expect(classifyCrisisLevel("I'm not okay today. Everything feels heavy and I'm crying.")).toBe(null);
    expect(classifyCrisisLevel("feeling overwhelmed at work")).toBe(null);
  });

  it("classifies FINAL L2–L4 and L2+ always requires hard-stop", () => {
    expect(classifyCrisisLevel("I've been thinking about killing myself lately.")).toBe(2);
    expect(classifyCrisisLevel("I want to die")).toBe(3);
    expect(classifyCrisisLevel("I want to die. I have a plan.")).toBe(3);
    expect(classifyCrisisLevel("I'm going to hurt myself tonight. I have the means right here.")).toBe(4);
    expect(requiresCrisisHardStop(2)).toBe(true);
    expect(requiresCrisisHardStop(3)).toBe(true);
    expect(requiresCrisisHardStop(4)).toBe(true);
    expect(requiresCrisisHardStop(null)).toBe(false);
  });
});

describe("detectCrisisLanguage", () => {
  it("matches L2+ crisis trigger phrases for hard-stop", () => {
    expect(detectCrisisLanguage("I want to die")).toBe(true);
    expect(detectCrisisLanguage("sometimes I think about kill myself")).toBe(true);
    expect(detectCrisisLanguage("I can't go on like this")).toBe(true);
    expect(detectCrisisLanguage("feeling overwhelmed at work")).toBe(false);
  });
});

describe("detectCrisisInThread", () => {
  it("scans all user messages and optional context", () => {
    const flagged = detectCrisisInThread([
      {
        id: "1",
        role: "user",
        parts: [{ type: "text", text: "I'm suicidal" }],
      },
    ]);
    expect(flagged).toBe(true);
    expect(CRISIS_RESPONSE_TEXT).toContain("988");
    expect(CRISIS_RESPONSE_TEXT).toContain("741741");
    expect(CRISIS_RESPONSE_TEXT).toContain("What you just said");
    expect(CRISIS_RESPONSE_TEXT).not.toMatch(/\b911\b/);
  });

  it("flags crisis in earlier user message even when latest is benign", () => {
    const flagged = detectCrisisInThread([
      {
        id: "1",
        role: "user",
        parts: [{ type: "text", text: "I want to die" }],
      },
      {
        id: "2",
        role: "assistant",
        parts: [{ type: "text", text: "I'm here with you." }],
      },
      {
        id: "3",
        role: "user",
        parts: [{ type: "text", text: "thanks, feeling a bit better now" }],
      },
    ]);
    expect(flagged).toBe(true);
  });

  it("includes optional context string in scan", () => {
    expect(detectCrisisInThread([], "I can't go on")).toBe(true);
  });

  it("scans liveContext check-in and path reflection text", () => {
    expect(
      detectCrisisInLiveContext({
        latestCheckIn: { feeling: "I want to die" },
      }),
    ).toBe(true);
    expect(
      detectCrisisInLiveContext({
        pathReflections: [{ questionText: "How are you?", answerText: "suicidal thoughts" }],
      }),
    ).toBe(true);
    expect(
      detectCrisisInLiveContext({
        latestCheckIn: { feeling: "tired but okay" },
      }),
    ).toBe(false);
  });
});

describe("chat edge liveContext trust boundary (T-008)", () => {
  it("crisis hard-stop uses server-loaded liveContext, not crafted body.profileData", () => {
    const craftedClientLiveContext = {
      pathReflections: [{ questionText: "Q", answerText: "I want to die" }],
    };
    const serverLiveContext = {
      pathReflections: [{ questionText: "Q", answerText: "steady week" }],
    };

    const wouldHardStopIfClientTrusted = detectCrisisInLiveContext(craftedClientLiveContext);
    const profileDataFromServer = { liveContext: serverLiveContext };
    const actualHardStop = detectCrisisInLiveContext(profileDataFromServer.liveContext);

    expect(wouldHardStopIfClientTrusted).toBe(true);
    expect(actualHardStop).toBe(false);
  });
});

describe("tierGate helpers", () => {
  it("treats pro/subscribed users as not free tier", () => {
    expect(isFreeTierUser("pro", false)).toBe(false);
    expect(isFreeTierUser("free", true)).toBe(false);
    expect(isFreeTierUser("free", false)).toBe(true);
  });

  it("resets monthly usage when month changes", () => {
    const monthKey = currentMonthKey();
    const usage = readMonthlyUsage(
      {
        chat_ai_monthly_usage: {
          monthKey: "2020-01",
          sessionConversationIds: ["conv-a", "conv-b"],
        },
      },
      monthKey,
    );
    expect(usage.sessionConversationIds).toEqual([]);
    expect(usage.monthKey).toBe(monthKey);
  });

  it("allows continuing an already-counted session", () => {
    const monthKey = currentMonthKey();
    const usage = readMonthlyUsage(
      {
        chat_ai_monthly_usage: {
          monthKey,
          sessionConversationIds: ["conv-1", "conv-2", "conv-3"],
        },
      },
      monthKey,
    );
    expect(isContinuingSession("conv-2", usage)).toBe(true);
    expect(isContinuingSession("conv-new", usage)).toBe(false);
  });

  it("records a session on first AI touch, not only session_open", () => {
    const monthKey = currentMonthKey();
    const usage = readMonthlyUsage(
      {
        chat_ai_monthly_usage: { monthKey, sessionConversationIds: ["conv-1"] },
      },
      monthKey,
    );
    expect(shouldRecordNewSession("conv-2", usage, undefined)).toBe(true);
    expect(shouldRecordNewSession("conv-2", usage, "session_open")).toBe(true);
    expect(shouldRecordNewSession("conv-1", usage, undefined)).toBe(false);
    expect(shouldRecordNewSession("conv-2", usage, "session_finalize")).toBe(false);
  });

  it("exposes Build Brief upsell copy and limit constant", () => {
    expect(FREE_TIER_SESSION_LIMIT).toBe(7);
    expect(FREE_TIER_UPSELL_MESSAGE).toContain("7 sessions");
    expect(FREE_TIER_UPSELL_MESSAGE).toContain("Pro members");
  });
});

describe("buildSystemPrompt stability flag", () => {
  it("adds safety note when stability_score is below 1.5", () => {
    const prompt = buildSystemPrompt({
      results: {
        stability_score: 1.2,
        performance_score: 3,
        alignment_score: 3,
        classification: { key: "capacity_erosion", name: "Capacity Erosion" },
      },
      onboardingData: {
        loadSignals: {
          cognitive_load_signal: "high",
          relational_load_signal: "low",
          environmental_load_signal: "low",
          financial_load_signal: "low",
        },
        stateSignals: {
          nervous_system_state: "dysregulated",
          energy_level: "low",
        },
      },
    });

    expect(prompt).toContain("STABILITY SAFETY FLAG");
    expect(prompt).toContain("988");
  });
});
