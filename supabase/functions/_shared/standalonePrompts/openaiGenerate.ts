import { generateText } from "npm:ai";
import { createChatModel, resolveOpenAiModelId } from "../openai-provider.ts";
import { normalizeUsage, recordAiUsage, type AiUsageSource } from "../aiUsage.ts";
import { scheduleEdgeBackgroundWork } from "../edgeBackground.ts";
import { getServiceClient } from "../serviceClient.ts";
import { loadPlatformAiSettings, withPlatformSettings } from "../platformAiSettings.ts";

/** User-facing standalone generations — wrapped with platform AI settings (NCLDD-53). */
export async function generateStandaloneText(params: {
  system: string;
  prompt: string;
  temperature?: number;
  /** NCLDD-52: who to attribute the call to in the AI usage ledger (mode `other`). */
  usage?: { userId: string; source: AiUsageSource };
}): Promise<string> {
  const platformSettings = await loadPlatformAiSettings(getServiceClient);
  const { text, usage } = await generateText({
    model: createChatModel(),
    system: withPlatformSettings(params.system, platformSettings),
    prompt: params.prompt,
    temperature: params.temperature ?? 0.55,
  });
  if (params.usage) {
    const admin = getServiceClient();
    scheduleEdgeBackgroundWork(
      recordAiUsage(admin, {
        userId: params.usage.userId,
        mode: "other",
        source: params.usage.source,
        model: resolveOpenAiModelId(),
        usage: normalizeUsage(usage),
      }),
    );
  }
  return text.trim();
}
