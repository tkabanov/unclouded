import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { access_token: "token" } }, error: null })),
    },
  },
}));

import { ChatEdgeError } from "@/lib/chat/chatAiReplyStub";
import { synthesizeKotaSpeech } from "@/lib/chat/voiceSessionApi";
import {
  AI_MONTHLY_LIMIT_CODE,
  FREE_TIER_LIMIT_CODE,
  FREE_TIER_UPSELL_MESSAGE,
  formatMonthlyAiLimitMessage,
  isSessionLimitCode,
  sessionLimitNoticeFor,
} from "./chatSessionLimit";

describe("monthly AI limit copy (NCLDD-52)", () => {
  it("names the mode and the UTC reset", () => {
    expect(formatMonthlyAiLimitMessage("text")).toBe(
      "You've reached this month's AI text limit. It resets on the 1st (UTC).",
    );
    expect(formatMonthlyAiLimitMessage("voice")).toBe(
      "You've reached this month's AI voice limit. It resets on the 1st (UTC).",
    );
    expect(formatMonthlyAiLimitMessage()).toContain("AI text limit");
  });

  it("treats both the AI budget and the Free session limit as session-blocking", () => {
    expect(isSessionLimitCode(AI_MONTHLY_LIMIT_CODE)).toBe(true);
    expect(isSessionLimitCode(FREE_TIER_LIMIT_CODE)).toBe(true);
    expect(isSessionLimitCode("journal_reflection_tier_required")).toBe(false);
    expect(isSessionLimitCode(undefined)).toBe(false);
    expect(isSessionLimitCode(null)).toBe(false);
  });

  it("keeps the AI budget notice distinct from the Free 7-session upsell", () => {
    const aiMessage = formatMonthlyAiLimitMessage("voice");
    expect(sessionLimitNoticeFor(AI_MONTHLY_LIMIT_CODE, aiMessage)).toBe(aiMessage);
    expect(sessionLimitNoticeFor(FREE_TIER_LIMIT_CODE, "anything")).toBe(FREE_TIER_UPSELL_MESSAGE);
    expect(aiMessage).not.toBe(FREE_TIER_UPSELL_MESSAGE);
  });
});

describe("voice API limit error (NCLDD-52)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps a voice 402 ai_monthly_limit_reached to a session-blocking ChatEdgeError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ error: "Monthly AI voice limit reached.", code: AI_MONTHLY_LIMIT_CODE, mode: "voice" }, { status: 402 }),
      ),
    );
    const error = await synthesizeKotaSpeech("Hello").catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ChatEdgeError);
    expect((error as ChatEdgeError).code).toBe(AI_MONTHLY_LIMIT_CODE);
    expect((error as ChatEdgeError).message).toBe(formatMonthlyAiLimitMessage("voice"));
    expect(isSessionLimitCode((error as ChatEdgeError).code)).toBe(true);
  });

  it("keeps other voice failures as plain errors (no session block)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "Speech synthesis failed" }, { status: 502 })));
    const error = await synthesizeKotaSpeech("Hello").catch((err: unknown) => err);
    expect(error).not.toBeInstanceOf(ChatEdgeError);
    expect((error as Error).message).toBe("Speech synthesis failed");
  });
});
