import type { ChatMessage } from "@/components/chat/types";

/** Session-close prompt id while awaiting commitment (stable after ack messages arrive). */
export function resolveCommitmentPromptMessageId(
  messages: ChatMessage[],
  awaitingCommitment: boolean,
  closePromptMessageId?: string | null,
): string | null {
  if (!awaitingCommitment) return null;

  if (closePromptMessageId) {
    const exists = messages.some((message) => message.id === closePromptMessageId);
    if (exists) return closePromptMessageId;
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === "assistant") return message.id;
  }

  return null;
}