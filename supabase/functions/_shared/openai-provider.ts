import { createOpenAI } from "npm:@ai-sdk/openai";
import type { LanguageModel } from "npm:ai";

const DEFAULT_MODEL = "gpt-4o-mini";

export function resolveOpenAiModelId(): string {
  return Deno.env.get("OPENAI_MODEL")?.trim() || DEFAULT_MODEL;
}

export function createChatModel(): LanguageModel {
  const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const openai = createOpenAI({ apiKey });
  return openai(resolveOpenAiModelId());
}
