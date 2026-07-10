/** Bubble custom.chatconversation fields for RE - chat header (bTIRb). */
export type ChatConversation = {
  /** title binding → bTIRh */
  title: string;
  /** mode badge binding → bTIRi */
  modeBadgeText: string;
  /** coaching disclaimer badge caption → bTIRs */
  disclaimerBadgeText: string;
};

/** Bubble custom.chatmessage row for RepeatingGroup bTISM. */
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  /** content binding → bTISS (user) / bTIUQ (assistant) */
  content: string;
};

export const CHAT_CONVERSATION_DEFAULTS = {
  title: "Select a conversation",
  modeBadgeText: "Professional • Executive Coaching",
  disclaimerBadgeText: "Coaching only — not therapy or medical advice",
} as const;

export const CHAT_ASSISTANT_DISCLAIMER =
  "This is coaching guidance, not therapy or medical advice. For crisis support, call 988.";

/** Quick-prompt suggestion chips in composer toolbar (bTITH) — send as user message. */
export type ChatComposerMode = "plan" | "reflect" | "goal" | "stress";

export const CHAT_COMPOSER_MODES: ReadonlyArray<{
  id: ChatComposerMode;
  bubbleId: string;
  label: string;
}> = [
  { id: "plan", bubbleId: "bTITI", label: "Plan my week ahead" },
  { id: "reflect", bubbleId: "bTITM", label: "Reflect on a recent challenge" },
  { id: "goal", bubbleId: "bTITN", label: "Review my current goals" },
  { id: "stress", bubbleId: "bTITO", label: "Work through a stressful situation" },
] as const;

export const CHAT_COMPOSER_DEFAULTS = {
  input_caption: "Your message",
  input_placeholder: "Share what's on your mind...",
  send_label: "Send",
} as const;

/** Static HTML from IR element bTIne (chat scroll inversion styles). */
export const CHAT_BEHAVIOR_HTML = `<style>
#rg-chat {
  transform: rotate(180deg);
  direction: rtl;
  will-change: transform;
  backface-visibility: hidden;
  transform-style: preserve-3d;
}

#rg-chat-cell {
  transform: rotate(180deg);
  direction: ltr;
}
</style>`;
