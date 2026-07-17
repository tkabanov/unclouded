const DEFAULT_CONTEXT_LIMIT = 6000;

/** Rough token estimate (~4 characters per token). */
export function estimatePromptTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/** Whether conversation context should be compressed before sending to the model. */
export function shouldCompressContext(
  tokens: number,
  limit = DEFAULT_CONTEXT_LIMIT,
): boolean {
  return tokens >= limit;
}
