import type { UIMessage } from "npm:ai";
import type { ChatLifecycleMode } from "./prompt/sessionLifecycle.ts";

/** Client chat POST body — `profileData` / `liveContext` are never accepted (T-008). */
export type ChatRequestBody = {
  messages?: UIMessage[];
  context?: string;
  lifecycle?: ChatLifecycleMode;
  conversationId?: string;
};

/** Parse and sanitize the chat edge request; drops untrusted `profileData`. */
export function parseChatRequestBody(raw: unknown): ChatRequestBody {
  if (!raw || typeof raw !== "object") return {};
  const body = raw as Record<string, unknown>;

  const conversationId =
    typeof body.conversationId === "string" ? body.conversationId.trim() : undefined;

  return {
    messages: Array.isArray(body.messages) ? (body.messages as UIMessage[]) : undefined,
    context: typeof body.context === "string" ? body.context : undefined,
    lifecycle: body.lifecycle as ChatLifecycleMode | undefined,
    conversationId: conversationId || undefined,
  };
}
