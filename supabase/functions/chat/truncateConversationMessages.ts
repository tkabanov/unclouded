import type { UIMessage } from "npm:ai";

/** Prompt Library §11 — keep the last N user exchanges in the thread. */
export const MAX_CONVERSATION_EXCHANGES = 20;

const SESSION_START_MARKER = "[SESSION START]";

function messageText(message: UIMessage): string {
  if (!Array.isArray(message.parts)) return "";
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } =>
        part.type === "text" && typeof part.text === "string",
    )
    .map((part) => part.text)
    .join("");
}

/**
 * Trim conversation history to the most recent exchanges before model invocation.
 * An exchange is counted per user message (excluding the synthetic session opener).
 */
export function truncateConversationMessages(messages: UIMessage[]): UIMessage[] {
  if (messages.length === 0) return messages;

  const userIndices: number[] = [];
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.role !== "user") continue;
    const text = messageText(message).trim();
    if (!text || text === SESSION_START_MARKER) continue;
    userIndices.push(index);
  }

  if (userIndices.length <= MAX_CONVERSATION_EXCHANGES) {
    return messages;
  }

  const cutIndex = userIndices[userIndices.length - MAX_CONVERSATION_EXCHANGES];
  return messages.slice(cutIndex);
}
