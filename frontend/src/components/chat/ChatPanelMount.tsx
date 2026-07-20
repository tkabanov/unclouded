import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ChatReusable } from "./ChatReusable";
import VoiceSessionMicButton from "./VoiceSessionMicButton";
import type { ChatConversation, ChatMessage } from "./types";
import { CHAT_CONVERSATION_DEFAULTS } from "./types";
import {
  fetchConversationById,
  isDefaultConversationTitle,
  renameConversation,
  type ConversationListItem,
} from "@/lib/chat/chatConversationsApi";
import { generateAiReplyStub, type ChatAiProfileData, ChatEdgeError } from "@/lib/chat/chatAiReplyStub";
import { FREE_TIER_UPSELL_MESSAGE } from "@/lib/chat/chatSessionLimit";
import { touchConversationAfterMessage } from "@/lib/chat/chatConversationsApi";
import {
  fetchMessagesForConversation,
  insertAssistantMessage,
  insertUserMessage,
} from "@/lib/chat/chatMessagesApi";
import {
  finalizeSessionFromThread,
  requestConversationTitle,
  requestSessionClose,
  requestSessionOpening,
} from "@/lib/chat/chatSessionLifecycleApi";
import { readPreferredCoachingMode } from "@/lib/dashboard/coachingModeApi";
import { formatChatModeBadgeText } from "@/lib/enums/coachingMode";
import { playVoiceCloseRitualSilence, synthesizeKotaSpeech } from "@/lib/chat/voiceSessionApi";
import { playKotaSpeech, useVoiceSessionRecorder } from "@/hooks/useVoiceSessionRecorder";
import { cn } from "@/lib/utils";

export interface ChatPanelMountProps {
  conversationId: string;
  userId: string;
  onboardingData?: Record<string, unknown> | null;
  context?: string;
  profileData?: ChatAiProfileData;
  onThreadUpdated?: () => void;
  onSessionClosed?: () => void;
  className?: string;
}

/**
 * CHAT-03/05 — mount DS-06 ChatReusable at bTIUt with messaging + session lifecycle (T-004).
 */
export default function ChatPanelMount({
  conversationId,
  userId,
  onboardingData,
  context,
  profileData,
  onThreadUpdated,
  onSessionClosed,
  className,
}: ChatPanelMountProps) {
  const [conversationMeta, setConversationMeta] = useState<ConversationListItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composerValue, setComposerValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [awaitingAssistantReply, setAwaitingAssistantReply] = useState(false);
  const [awaitingCommitment, setAwaitingCommitment] = useState(false);
  const [sessionClosed, setSessionClosed] = useState(false);
  const [sessionLimitBlocked, setSessionLimitBlocked] = useState(false);
  const openerSentForConversation = useRef<string | null>(null);
  const sessionLimitToastShown = useRef(false);
  const voiceSessionActiveRef = useRef(false);

  const modeBadgeText = useMemo(
    () => formatChatModeBadgeText(readPreferredCoachingMode(onboardingData)),
    [onboardingData],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [conversation, nextMessages] = await Promise.all([
        fetchConversationById(userId, conversationId, onboardingData),
        fetchMessagesForConversation(conversationId, onboardingData),
      ]);
      setConversationMeta(conversation);
      setMessages(nextMessages);
    } catch {
      setConversationMeta(null);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId, onboardingData, userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    setAwaitingCommitment(false);
    setSessionClosed(false);
    setSessionLimitBlocked(false);
    openerSentForConversation.current = null;
    sessionLimitToastShown.current = false;
    voiceSessionActiveRef.current = false;
  }, [conversationId]);

  const sendAssistantMessage = useCallback(
    async (assistantText: string, threadSnapshot: ChatMessage[], options?: { speak?: boolean }) => {
      const assistantMessage = await insertAssistantMessage({
        conversationId,
        userId,
        content: assistantText,
        onboardingData,
      });
      const nextThread = [...threadSnapshot, assistantMessage];
      setMessages(nextThread);
      await touchConversationAfterMessage(userId, conversationId, assistantText);
      onThreadUpdated?.();

      if (options?.speak) {
        try {
          const audio = await synthesizeKotaSpeech(assistantText);
          await playKotaSpeech(audio);
        } catch {
          toast.error("Couldn't play Kota's voice reply.");
        }
      }

      return { assistantMessage, nextThread };
    },
    [conversationId, onboardingData, onThreadUpdated, userId],
  );

  const maybeGenerateConversationTitle = useCallback(
    async (thread: ChatMessage[]) => {
      if (!isDefaultConversationTitle(conversationMeta?.title)) return;

      const userMessages = thread.filter((message) => message.role === "user");
      if (userMessages.length !== 1) return;

      const firstUserMessage = userMessages[0];
      const lastAssistantMessage = [...thread].reverse().find((message) => message.role === "assistant");
      if (!firstUserMessage || !lastAssistantMessage) return;

      try {
        const generatedTitle = await requestConversationTitle(
          [firstUserMessage, lastAssistantMessage],
          conversationId,
        );
        await renameConversation(userId, conversationId, generatedTitle);
        setConversationMeta((current) =>
          current ? { ...current, title: generatedTitle } : { id: conversationId, title: generatedTitle, previewText: "", modifiedDate: null },
        );
        onThreadUpdated?.();
      } catch (error) {
        console.error("Failed to generate conversation title", error);
      }
    },
    [conversationId, conversationMeta?.title, onThreadUpdated, userId],
  );

  const maybeSendSessionOpener = useCallback(
    async (loadedMessages: ChatMessage[]) => {
      if (loadedMessages.length > 0) return;
      if (openerSentForConversation.current === conversationId) return;
      if (awaitingAssistantReply) return;

      openerSentForConversation.current = conversationId;
      setAwaitingAssistantReply(true);
      try {
        const openingText = await requestSessionOpening(profileData, context, conversationId);
        await sendAssistantMessage(openingText, []);
      } catch (error) {
        if (error instanceof ChatEdgeError && error.code === "free_tier_session_limit") {
          setSessionLimitBlocked(true);
          if (!sessionLimitToastShown.current) {
            sessionLimitToastShown.current = true;
            toast.error(error.message);
          }
        } else {
          openerSentForConversation.current = null;
          toast.error("Couldn't start the session. Send a message when you're ready.");
        }
      } finally {
        setAwaitingAssistantReply(false);
      }
    },
    [
      awaitingAssistantReply,
      context,
      conversationId,
      profileData,
      sendAssistantMessage,
    ],
  );

  useEffect(() => {
    if (loading || awaitingAssistantReply) return;
    void maybeSendSessionOpener(messages);
  }, [awaitingAssistantReply, loading, maybeSendSessionOpener, messages]);

  const conversation: ChatConversation = useMemo(
    () => ({
      title: conversationMeta?.title ?? CHAT_CONVERSATION_DEFAULTS.title,
      modeBadgeText: modeBadgeText,
      disclaimerBadgeText: CHAT_CONVERSATION_DEFAULTS.disclaimerBadgeText,
    }),
    [conversationMeta?.title, modeBadgeText],
  );

  const finalizeSession = useCallback(
    async (thread: ChatMessage[]) => {
      await finalizeSessionFromThread(
        thread,
        profileData,
        context,
        conversationId,
      );
      setAwaitingCommitment(false);
      setSessionClosed(true);
      onSessionClosed?.();
      toast.success("Session saved. Your coach will remember this conversation.");
    },
    [context, conversationId, onSessionClosed, profileData],
  );

  const sendMessage = useCallback(
    async (text: string, options?: { viaVoice?: boolean; voiceEmotionDetected?: boolean }) => {
      const trimmed = text.trim();
      const viaVoice = options?.viaVoice === true;
      if (!trimmed || awaitingAssistantReply || sessionClosed) return;

      if (viaVoice) {
        voiceSessionActiveRef.current = true;
      }

      const optimisticId = `pending-${crypto.randomUUID()}`;
      const optimisticUserMessage: ChatMessage = {
        id: optimisticId,
        role: "user",
        content: trimmed,
      };
      const threadSnapshot = [...messages, optimisticUserMessage];

      setComposerValue("");
      setMessages(threadSnapshot);
      setAwaitingAssistantReply(true);

      try {
        const userMessage = await insertUserMessage({
          conversationId,
          userId,
          content: trimmed,
          onboardingData,
        });

        const threadForAi = threadSnapshot.map((message) =>
          message.id === optimisticId ? userMessage : message,
        );
        setMessages(threadForAi);

        if (awaitingCommitment) {
          try {
            await finalizeSession(threadForAi);
          } catch {
            toast.error("Couldn't save your session. Please try again.");
          } finally {
            setAwaitingAssistantReply(false);
          }
          return;
        }

        try {
          const assistantText = await generateAiReplyStub(
            threadForAi,
            context,
            profileData,
            conversationId,
            viaVoice ? "voice" : "text",
            viaVoice ? options?.voiceEmotionDetected : undefined,
          );
          const { nextThread } = await sendAssistantMessage(assistantText, threadForAi, {
            speak: viaVoice,
          });
          void maybeGenerateConversationTitle(nextThread);
        } catch (error) {
          if (error instanceof ChatEdgeError && error.code === "free_tier_session_limit") {
            setSessionLimitBlocked(true);
            if (!sessionLimitToastShown.current) {
              sessionLimitToastShown.current = true;
              toast.error(error.message);
            }
          } else {
            toast.error("Couldn't get a reply. Please try again.");
          }
        }
      } catch {
        setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
        toast.error("Couldn't send your message. Please try again.");
        setComposerValue(trimmed);
      } finally {
        setAwaitingAssistantReply(false);
      }
    },
    [
      awaitingAssistantReply,
      awaitingCommitment,
      context,
      conversationId,
      finalizeSession,
      maybeGenerateConversationTitle,
      messages,
      onboardingData,
      profileData,
      sendAssistantMessage,
      sessionClosed,
      userId,
    ],
  );

  const handleEndSession = useCallback(async () => {
    if (awaitingAssistantReply || sessionClosed || messages.length === 0) return;

    const viaVoice = voiceSessionActiveRef.current;
    setAwaitingAssistantReply(true);
    try {
      const closeText = await requestSessionClose(
        messages,
        profileData,
        context,
        conversationId,
        viaVoice ? "voice" : "text",
      );
      if (viaVoice) {
        await playVoiceCloseRitualSilence();
      }
      await sendAssistantMessage(closeText, messages, { speak: viaVoice });
      setAwaitingCommitment(true);
    } catch {
      toast.error("Couldn't close the session. Please try again.");
    } finally {
      setAwaitingAssistantReply(false);
    }
  }, [
    awaitingAssistantReply,
    context,
    conversationId,
    messages,
    profileData,
    sendAssistantMessage,
    sessionClosed,
  ]);

  const handleSend = useCallback(() => {
    void sendMessage(composerValue);
  }, [composerValue, sendMessage]);

  const handleSuggestionSend = useCallback(
    (text: string) => {
      void sendMessage(text);
    },
    [sendMessage],
  );

  const voiceRecorder = useVoiceSessionRecorder({
    enabled: true,
    onTranscript: (transcript, options) =>
      sendMessage(transcript, {
        viaVoice: true,
        voiceEmotionDetected: options?.emotionDetected,
      }),
    onError: (error) => toast.error(error.message),
  });

  return (
    <div
      className={cn("flex h-full min-h-0 flex-col", className)}
    >
      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading conversation…
        </div>
      ) : (
        <>
          {sessionLimitBlocked ? (
            <div className="border-b border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              {FREE_TIER_UPSELL_MESSAGE}
            </div>
          ) : null}
          <ChatReusable
            conversation={conversation}
            messages={messages}
            composerValue={composerValue}
            onComposerChange={setComposerValue}
            onSend={handleSend}
            onSuggestionSend={handleSuggestionSend}
            composerDisabled={
              awaitingAssistantReply ||
              sessionClosed ||
              sessionLimitBlocked ||
              voiceRecorder.recording ||
              voiceRecorder.transcribing
            }
            composerLeadingSlot={
              <VoiceSessionMicButton
                recording={voiceRecorder.recording}
                transcribing={voiceRecorder.transcribing}
                silenceHoldActive={voiceRecorder.silenceHoldActive}
                disabled={awaitingAssistantReply || sessionClosed || sessionLimitBlocked}
                onToggle={voiceRecorder.toggleRecording}
              />
            }
            isAssistantTyping={awaitingAssistantReply}
            onEndSession={sessionClosed ? undefined : () => void handleEndSession()}
            endSessionDisabled={awaitingAssistantReply || messages.length === 0}
            endSessionLabel={awaitingCommitment ? "Waiting for commitment…" : "End session"}
            className="flex-1 min-h-0"
          />
        </>
      )}
    </div>
  );
}

