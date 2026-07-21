/** Addendum quick check-in — enforce single-sentence acknowledgment (no questions). */

function stripTrailingQuestions(text: string): string {
  let result = text.trim();
  if (!result) return result;

  const questionIndex = result.indexOf("?");
  if (questionIndex >= 0) {
    result = result.slice(0, questionIndex).trim();
  }

  result = result.replace(/\s+(what|how|why|when|where|who|could|would|can|do|does|did|is|are|will)\b[^.!?]*$/i, "").trim();

  if (result && !/[.!?]$/.test(result)) {
    result = `${result}.`;
  }

  return result;
}

function firstSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const match = trimmed.match(/^[^.!?]+[.!?]?/);
  if (match?.[0]?.trim()) return match[0].trim();

  return trimmed.split(/[.!?]/)[0]?.trim() ?? trimmed;
}

/** Normalize Kota quick-check-in reply to one brief acknowledgment sentence. */
export function enforceQuickCheckinResponse(raw: string): string {
  const sentence = stripTrailingQuestions(firstSentence(raw.replace(/\s+/g, " ").trim()));
  if (!sentence) {
    return "I hear you.";
  }
  return sentence.slice(0, 240);
}

export function quickCheckinResponseViolatesRules(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  if (trimmed.includes("?")) return true;
  if (/[.!?]\s+\S/.test(trimmed)) return true;
  return trimmed.length > 280;
}
