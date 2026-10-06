import { generateText } from "npm:ai";
import { createChatModel } from "../openai-provider.ts";
import { getServiceClient } from "../serviceClient.ts";
import { loadPlatformAiSettings, withPlatformSettings } from "../platformAiSettings.ts";

/** User-facing standalone generations — wrapped with platform AI settings (NCLDD-53). */
export async function generateStandaloneText(params: {
  system: string;
  prompt: string;
  temperature?: number;
}): Promise<string> {
  const platformSettings = await loadPlatformAiSettings(getServiceClient);
  const { text } = await generateText({
    model: createChatModel(),
    system: withPlatformSettings(params.system, platformSettings),
    prompt: params.prompt,
    temperature: params.temperature ?? 0.55,
  });
  return text.trim();
}
