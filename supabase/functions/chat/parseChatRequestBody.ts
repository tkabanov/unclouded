import type { UIMessage } from "npm:ai";
import type { ChatLifecycleMode } from "./prompt/sessionLifecycle.ts";

/** Client chat POST body — `profileData` / `liveContext` are never accepted (T-008). */
export type ChatRequestBody = {
  messages?: UIMessage[];
  context?: string;
  lifecycle?: ChatLifecycleMode;
  conversationId?: string;
  sessionType?: "text" | "voice" | "quick_checkin";
  exchangeCount?: number;
  promptTestScenarioId?: string;
  voiceEmotionDetected?: boolean;
};

/** Parse and sanitize the chat edge request; drops untrusted `profileData`. */
export function parseChatRequestBody(raw: unknown): ChatRequestBody {
  if (!raw || typeof raw !== "object") return {};
  const body = raw as Record<string, unknown>;

  const conversationId =
    typeof body.conversationId === "string" ? body.conversationId.trim() : undefined;

  const rawSessionType =
    typeof body.sessionType === "string" ? body.sessionType.trim() : undefined;
  const sessionType =
    rawSessionType === "text" ||
    rawSessionType === "voice" ||
    rawSessionType === "quick_checkin"
      ? rawSessionType
      : undefined;

  const exchangeCount =
    typeof body.exchangeCount === "number" && Number.isFinite(body.exchangeCount)
      ? Math.max(0, Math.floor(body.exchangeCount))
      : undefined;

  const promptTestScenarioId =
    typeof body.promptTestScenarioId === "string" ? body.promptTestScenarioId.trim() : undefined;

  const voiceEmotionDetected = body.voiceEmotionDetected === true ? true : undefined;

  return {
    messages: Array.isArray(body.messages) ? (body.messages as UIMessage[]) : undefined,
    context: typeof body.context === "string" ? body.context : undefined,
    lifecycle: body.lifecycle as ChatLifecycleMode | undefined,
    conversationId: conversationId || undefined,
    sessionType,
    exchangeCount,
    promptTestScenarioId: promptTestScenarioId || undefined,
    voiceEmotionDetected,
  };
}
