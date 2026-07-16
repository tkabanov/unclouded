import type { UIMessage } from "npm:ai";
import { sanitizePromptField } from "./profileHelpers.ts";

export const CONVERSATION_TITLE_SYSTEM_PROMPT = `You generate short, clear conversation titles based on a users message and models answer.

Rules:
- Return ONLY the title, no explanations.
- Max 5 words.
- Use the same language as the user message.
- Make it specific to the intent (not generic).
- No punctuation at the end.
- No quotes.`;

export const DEFAULT_CONVERSATION_TITLE = "New conversation";

const BUBBLE_DEFAULT_CONVERSATION_TITLE = "New Conversation";

export function isDefaultConversationTitle(title: string | null | undefined): boolean {
  const trimmed = (title ?? "").trim();
  if (!trimmed) return true;
  const normalized = trimmed.toLowerCase();
  return (
    normalized === DEFAULT_CONVERSATION_TITLE.toLowerCase() ||
    normalized === BUBBLE_DEFAULT_CONVERSATION_TITLE.toLowerCase()
  );
}

function readTextPart(message: UIMessage): string {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  const textParts = parts
    .filter((part): part is { type: "text"; text: string } =>
      Boolean(part && typeof part === "object" && (part as { type?: string }).type === "text")
    )
    .map((part) => part.text.trim())
    .filter(Boolean);
  return textParts.join("\n").trim();
}

export function extractLatestUserAssistantPair(
  messages: UIMessage[],
): { userMessage: string; assistantMessage: string } | null {
  let userMessage: string | null = null;
  let assistantMessage: string | null = null;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || (message.role !== "user" && message.role !== "assistant")) continue;

    const text = readTextPart(message);
    if (!text) continue;

    if (message.role === "assistant" && !assistantMessage) {
      assistantMessage = text;
      continue;
    }

    if (message.role === "user" && assistantMessage && !userMessage) {
      userMessage = text;
      break;
    }
  }

  if (!userMessage || !assistantMessage) return null;
  return { userMessage, assistantMessage };
}

export function buildConversationTitleUserPrompt(
  userMessage: string,
  assistantMessage: string,
): string {
  return `User message: ${sanitizePromptField(userMessage, 1200)}
Model answer: ${sanitizePromptField(assistantMessage, 1200)}`;
}

export function sanitizeConversationTitle(text: string): string | null {
  const trimmed = text.trim().replace(/^["'`]+|["'`]+$/g, "").replace(/[.!?]+$/g, "").trim();
  if (!trimmed) return null;

  const words = trimmed.split(/\s+/).filter(Boolean);
  const limited = words.slice(0, 5).join(" ");
  const sanitized = sanitizePromptField(limited, 80);
  return sanitized || null;
}
