/**
 * NCLDD-57: speech-to-speech Conversation mode (OpenAI Realtime). The same coaching prompt as chat
 * is used; this addendum only adapts delivery for live spoken turns.
 */

export type ChatSessionType = "text" | "voice" | "voice_conversation";

/** Voice delivery (Block 3.36) applies to push-to-talk voice and realtime conversation. */
export function isVoiceSessionType(sessionType: unknown): boolean {
  return sessionType === "voice" || sessionType === "voice_conversation";
}

export const REALTIME_VOICE_ADDENDUM = `REALTIME VOICE CONVERSATION — delivery rules for this live spoken session:
- Your words are spoken aloud as you generate them. Keep each turn short: usually one to three sentences, then pause for the user.
- Speak naturally. No markdown, headings, bullet or numbered lists, emojis, links, or URLs — nothing that only works on a screen.
- The user can interrupt you at any time. If they do, stop, follow where they went, and do not restart or repeat what you were saying.
- Ask at most one question per turn.
- Never claim to look something up, check a library, or cite sources unless a tool in this session actually returned that information.`;

/** Addendum for the realtime session type only; undefined for text and push-to-talk voice. */
export function buildRealtimeVoiceAddendum(sessionType: unknown): string | undefined {
  return sessionType === "voice_conversation" ? REALTIME_VOICE_ADDENDUM : undefined;
}
