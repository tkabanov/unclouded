import { describe, expect, it, vi } from "vitest";
import { evaluatePromptTestDivergence } from "../../../../supabase/functions/chat/promptTest/divergenceCheck.ts";

describe("evaluatePromptTestDivergence", () => {
  it("flags missing crisis hard-stop when expected", () => {
    const result = evaluatePromptTestDivergence(
      "Let's set a goal for this week.",
      { expectCrisisHardStop: true, mustMatch: [/988/] },
      { crisisHardStop: false },
    );
    expect(result.flagged).toBe(true);
    expect(result.flags.some((flag) => flag.includes("crisis hard-stop"))).toBe(true);
  });

  it("passes when required patterns are present", () => {
    const result = evaluatePromptTestDivergence(
      "I'm here with you. Call 988 if you need immediate support.",
      { expectCrisisHardStop: true, mustMatch: [/988/] },
      { crisisHardStop: true },
    );
    expect(result.flagged).toBe(false);
  });

  it("flags discouraged patterns and excess questions", () => {
    const result = evaluatePromptTestDivergence(
      "You're absolutely right. What if you tried harder? And another idea?",
      {
        mustNotMatch: [/you're absolutely right/i],
        maxQuestionMarks: 0,
      },
      { crisisHardStop: false },
    );
    expect(result.flagged).toBe(true);
    expect(result.flags.length).toBeGreaterThanOrEqual(2);
  });
});

describe("prompt test scenarios", () => {
  it("defines 30 REQ-13 scenarios", async () => {
    const { PROMPT_TEST_SCENARIOS } = await import(
      "../../../../supabase/functions/chat/promptTest/scenarios.ts"
    );
    expect(PROMPT_TEST_SCENARIOS).toHaveLength(30);
  });
});

describe("runPromptTestScenario", () => {
  it("calls the staging chat edge, not production", async () => {
    vi.stubEnv("VITE_PROMPT_TEST_SUPABASE_URL", "https://staging-branch.supabase.co");
    vi.stubEnv("VITE_PROMPT_TEST_SUPABASE_PUBLISHABLE_KEY", "staging-anon-key");

    const fetchMock = vi.fn(async () =>
      Response.json({
        scenarioId: "crisis-001",
        title: "Crisis L2",
        expectedBehavior: "Hard stop",
        response: "Call 988",
        flagged: false,
        flags: [],
        crisisHardStop: true,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const authMock = vi.spyOn(
      (await import("@/integrations/supabase/client")).supabase.auth,
      "getSession",
    );
    authMock.mockResolvedValue({
      data: { session: { access_token: "admin-token" } },
      error: null,
    } as never);

    const { runPromptTestScenario } = await import("./promptTestApi");
    const result = await runPromptTestScenario("crisis-001");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://staging-branch.supabase.co/functions/v1/chat-staging");
    expect((init.headers as Record<string, string>).apikey).toBe("staging-anon-key");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer admin-token");
    expect(result.scenarioId).toBe("crisis-001");

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    authMock.mockRestore();
  });
});
