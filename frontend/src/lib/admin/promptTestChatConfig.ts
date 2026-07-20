/**
 * REQ-13 — Prompt test suite must run against a staging/draft chat edge,
 * never the production `chat` function used by live coaching sessions.
 */

export type PromptTestChatTarget = {
  endpoint: string;
  publishableKey: string;
  environment: "staging";
  displayHost: string;
  functionName: string;
};

export const PROMPT_TEST_CHAT_FUNCTION_DEFAULT = "chat-staging" as const;

export class PromptTestStagingNotConfiguredError extends Error {
  constructor() {
    super(
      "Prompt tests require staging configuration (VITE_PROMPT_TEST_SUPABASE_URL and VITE_PROMPT_TEST_SUPABASE_PUBLISHABLE_KEY). REQ-13 runs against a draft chat edge, not production.",
    );
    this.name = "PromptTestStagingNotConfiguredError";
  }
}

export class PromptTestProductionChatBlockedError extends Error {
  constructor() {
    super(
      "Prompt tests cannot target the production chat function. Set VITE_PROMPT_TEST_CHAT_FUNCTION=chat-staging (default).",
    );
    this.name = "PromptTestProductionChatBlockedError";
  }
}

export function resolvePromptTestChatFunctionName(): string {
  const configured = import.meta.env.VITE_PROMPT_TEST_CHAT_FUNCTION?.trim();
  const functionName = configured || PROMPT_TEST_CHAT_FUNCTION_DEFAULT;
  if (functionName === "chat") {
    throw new PromptTestProductionChatBlockedError();
  }
  return functionName;
}

export function isPromptTestStagingConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_PROMPT_TEST_SUPABASE_URL?.trim() &&
      import.meta.env.VITE_PROMPT_TEST_SUPABASE_PUBLISHABLE_KEY?.trim(),
  );
}

/** Returns true when admin prompt tests would incorrectly use production chat. */
export function promptTestWouldHitProduction(): boolean {
  return !isPromptTestStagingConfigured();
}

export function resolvePromptTestChatTarget(): PromptTestChatTarget {
  const stagingUrl = import.meta.env.VITE_PROMPT_TEST_SUPABASE_URL?.trim();
  const stagingKey = import.meta.env.VITE_PROMPT_TEST_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!stagingUrl || !stagingKey) {
    throw new PromptTestStagingNotConfiguredError();
  }

  const functionName = resolvePromptTestChatFunctionName();
  const normalizedUrl = stagingUrl.replace(/\/$/, "");
  return {
    endpoint: `${normalizedUrl}/functions/v1/${functionName}`,
    publishableKey: stagingKey,
    environment: "staging",
    displayHost: new URL(normalizedUrl).host,
    functionName,
  };
}
