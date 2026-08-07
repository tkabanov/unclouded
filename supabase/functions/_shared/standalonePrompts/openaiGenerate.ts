import { generateText } from "npm:ai";
import { createChatModel } from "../openai-provider.ts";

export async function generateStandaloneText(params: {
  system: string;
  prompt: string;
  temperature?: number;
}): Promise<string> {
  const { text } = await generateText({
    model: createChatModel(),
    system: params.system,
    prompt: params.prompt,
    temperature: params.temperature ?? 0.55,
  });
  return text.trim();
}
