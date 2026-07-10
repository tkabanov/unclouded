import { describe, expect, it } from "vitest";
import { currentMonthKey } from "../../../../supabase/functions/chat/tierGateHelpers.ts";
import {
  canStartNewChatSession,
  isAtFreeTierSessionLimit,
} from "./chatSessionLimit";

describe("chatSessionLimit", () => {
  const monthKey = currentMonthKey();

  it("allows Pro and subscribed users regardless of usage", () => {
    const usage = {
      chat_ai_monthly_usage: {
        monthKey,
        sessionConversationIds: ["a", "b", "c"],
      },
    };
    expect(isAtFreeTierSessionLimit({ tier: "pro", subscribed: false, onboardingData: usage })).toBe(
      false,
    );
    expect(isAtFreeTierSessionLimit({ tier: "free", subscribed: true, onboardingData: usage })).toBe(
      false,
    );
    expect(canStartNewChatSession({ tier: "pro", subscribed: false, onboardingData: usage })).toBe(
      true,
    );
  });

  it("blocks Free users at three recorded sessions this month", () => {
    const onboardingData = {
      chat_ai_monthly_usage: {
        monthKey,
        sessionConversationIds: ["conv-1", "conv-2", "conv-3"],
      },
    };
    expect(isAtFreeTierSessionLimit({ tier: "free", subscribed: false, onboardingData })).toBe(
      true,
    );
    expect(canStartNewChatSession({ tier: "free", subscribed: false, onboardingData })).toBe(
      false,
    );
  });

  it("allows Free users below the monthly limit", () => {
    const onboardingData = {
      chat_ai_monthly_usage: {
        monthKey,
        sessionConversationIds: ["conv-1", "conv-2"],
      },
    };
    expect(isAtFreeTierSessionLimit({ tier: "free", subscribed: false, onboardingData })).toBe(
      false,
    );
    expect(canStartNewChatSession({ tier: "explorer", subscribed: false, onboardingData })).toBe(
      true,
    );
  });
});
