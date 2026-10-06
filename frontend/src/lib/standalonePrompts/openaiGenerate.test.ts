import { beforeEach, describe, expect, it, vi } from "vitest";

const generateTextMock = vi.fn();
const loadSettingsMock = vi.fn();

vi.mock("npm:ai", () => ({ generateText: (...args: unknown[]) => generateTextMock(...args) }));
vi.mock("../../../../supabase/functions/_shared/openai-provider.ts", () => ({
  createChatModel: () => "model",
}));
vi.mock("../../../../supabase/functions/_shared/serviceClient.ts", () => ({
  getServiceClient: () => ({}),
}));
vi.mock("../../../../supabase/functions/_shared/platformAiSettings.ts", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../../supabase/functions/_shared/platformAiSettings.ts")>();
  return { ...actual, loadPlatformAiSettings: (...args: unknown[]) => loadSettingsMock(...args) };
});

import { generateStandaloneText } from "../../../../supabase/functions/_shared/standalonePrompts/openaiGenerate.ts";
import {
  EMPTY_PLATFORM_AI_SETTINGS,
  PLATFORM_RULES_HEADER,
  TONE_OF_VOICE_HEADER,
} from "../../../../supabase/functions/_shared/platformAiSettings.ts";

describe("generateStandaloneText platform AI settings", () => {
  beforeEach(() => {
    generateTextMock.mockReset().mockResolvedValue({ text: "  reply  " });
    loadSettingsMock.mockReset();
  });

  it("wraps the system prompt with platform rules and tone", async () => {
    loadSettingsMock.mockResolvedValue({
      globalSystemPrompt: "Rule.",
      prohibitedTopics: ["politics"],
      toneOfVoice: "Warm.",
    });
    const text = await generateStandaloneText({ system: "Return JSON.", prompt: "p" });
    expect(text).toBe("reply");
    const system = generateTextMock.mock.calls[0][0].system as string;
    expect(system.indexOf(PLATFORM_RULES_HEADER)).toBe(0);
    expect(system.indexOf("Return JSON.")).toBeGreaterThan(0);
    expect(system.indexOf(TONE_OF_VOICE_HEADER)).toBeGreaterThan(system.indexOf("Return JSON."));
  });

  it("leaves the system prompt unchanged when settings are empty", async () => {
    loadSettingsMock.mockResolvedValue(EMPTY_PLATFORM_AI_SETTINGS);
    await generateStandaloneText({ system: "Return JSON.", prompt: "p" });
    expect(generateTextMock.mock.calls[0][0].system).toBe("Return JSON.");
  });
});
