import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isPromptTestStagingConfigured,
  PromptTestProductionChatBlockedError,
  promptTestWouldHitProduction,
  PromptTestStagingNotConfiguredError,
  resolvePromptTestChatTarget,
} from "./promptTestChatConfig";

describe("promptTestChatConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires staging env vars and never falls back to production", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://prod.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "prod-anon-key");
    vi.stubEnv("VITE_PROMPT_TEST_SUPABASE_URL", "");
    vi.stubEnv("VITE_PROMPT_TEST_SUPABASE_PUBLISHABLE_KEY", "");

    expect(isPromptTestStagingConfigured()).toBe(false);
    expect(promptTestWouldHitProduction()).toBe(true);
    expect(() => resolvePromptTestChatTarget()).toThrow(PromptTestStagingNotConfiguredError);
  });

  it("resolves the staging draft chat edge when configured", () => {
    vi.stubEnv("VITE_PROMPT_TEST_SUPABASE_URL", "https://staging-branch.supabase.co/");
    vi.stubEnv("VITE_PROMPT_TEST_SUPABASE_PUBLISHABLE_KEY", "staging-anon-key");

    const target = resolvePromptTestChatTarget();

    expect(target.environment).toBe("staging");
    expect(target.endpoint).toBe("https://staging-branch.supabase.co/functions/v1/chat-staging");
    expect(target.publishableKey).toBe("staging-anon-key");
    expect(target.displayHost).toBe("staging-branch.supabase.co");
    expect(target.functionName).toBe("chat-staging");
    expect(promptTestWouldHitProduction()).toBe(false);
  });

  it("blocks targeting the production chat function slug", () => {
    vi.stubEnv("VITE_PROMPT_TEST_SUPABASE_URL", "https://staging-branch.supabase.co");
    vi.stubEnv("VITE_PROMPT_TEST_SUPABASE_PUBLISHABLE_KEY", "staging-anon-key");
    vi.stubEnv("VITE_PROMPT_TEST_CHAT_FUNCTION", "chat");

    expect(() => resolvePromptTestChatTarget()).toThrow(PromptTestProductionChatBlockedError);
  });
});
