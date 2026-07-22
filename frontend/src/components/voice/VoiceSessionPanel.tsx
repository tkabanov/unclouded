import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import VoiceSessionMicButton from "@/components/chat/VoiceSessionMicButton";
import { ChatCommitmentAwaitingBanner } from "@/components/chat/ChatCommitmentAwaitingBanner";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatMessagesList } from "@/components/chat/ChatMessagesList";
import type { ChatConversation, ChatMessage } from "@/components/chat/types";
import { CHAT_CONVERSATION_DEFAULTS } from "@/components/chat/types";
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
  requestSessionCloseAck,
  requestSessionOpening,
} from "@/lib/chat/chatSessionLifecycleApi";
import { resolveCommitmentPromptMessageId } from "@/lib/chat/commitmentPromptHelpers";
import { readPreferredCoachingMode } from "@/lib/dashboard/coachingModeApi";
import { formatChatModeBadgeText } from "@/lib/enums/coachingMode";
import { playVoiceCloseRitualSilence, synthesizeKotaSpeech } from "@/lib/chat/voiceSessionApi";
import { playKotaSpeech, useVoiceSessionRecorder } from "@/hooks/useVoiceSessionRecorder";
import { cn } from "@/lib/utils";

export interface VoiceSessionPanelProps {
  conversationId: string;
  userId: string;
  onboardingData?: Record<string, unknown> | null;
  context?: string;
  profileData?: ChatAiProfileData;
  onThreadUpdated?: () => void;
  onSessionClosed?: () => void;
  className?: string;
}

/** REQ-14 — voice-first coaching session (no text composer). */
export default function VoiceSessionPanel({
  conversationId,
  userId,
  onboardingData,
  context,
  profileData,
  onThreadUpdated,
  onSessionClosed,
  className,
}: VoiceSessionPanelProps) {
  const [conversationMeta, setConversationMeta] = useState<ConversationListItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [awaitingAssistantReply, setAwaitingAssistantReply] = useState(false);
  const [awaitingCommitment, setAwaitingCommitment] = useState(false);
  const [closePromptMessageId, setClosePromptMessageId] = useState<string | null>(null);
  const [sessionClosed, setSessionClosed] = useState(false);
  const [sessionLimitBlocked, setSessionLimitBlocked] = useState(false);
  const openerSentForConversation = useRef<string | null>(null);
  const sessionLimitToastShown = useRef(false);

  const modeBadgeText = useMemo(
    () => formatChatModeBadgeText(readPreferredCoachingMode(onboardingData)),
    [onboardingData],
  );

  const commitmentPromptMessageId = useMemo(
    () => resolveCommitmentPromptMessageId(messages, awaitingCommitment, closePromptMessageId),
    [awaitingCommitment, closePromptMessageId, messages],
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
    setClosePromptMessageId(null);
    setSessionClosed(false);
    setSessionLimitBlocked(false);
    openerSentForConversation.current = null;
    sessionLimitToastShown.current = false;
  }, [conversationId]);

  const sendAssistantMessage = useCallback(
    async (assistantText: string, threadSnapshot: ChatMessage[]) => {
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

      try {
        const audio = await synthesizeKotaSpeech(assistantText);
        await playKotaSpeech(audio);
      } catch {
        toast.error("Couldn't play Kota's voice reply.");
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
          current
            ? { ...current, title: generatedTitle }
            : {
                id: conversationId,
                title: generatedTitle,
                previewText: "",
                modifiedDate: null,
                sessionType: "voice",
              },
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
        const openingText = await requestSessionOpening(
          profileData,
          context,
          conversationId,
          "voice",
        );
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
          toast.error("Couldn't start the voice session. Tap the mic when you're ready.");
        }
      } finally {
        setAwaitingAssistantReply(false);
      }
    },
    [awaitingAssistantReply, context, conversationId, profileData, sendAssistantMessage],
  );

  useEffect(() => {
    if (loading || awaitingAssistantReply) return;
    void maybeSendSessionOpener(messages);
  }, [awaitingAssistantReply, loading, maybeSendSessionOpener, messages]);

  const conversation: ChatConversation = useMemo(
    () => ({
      title: conversationMeta?.title ?? "Voice session",
      modeBadgeText,
      disclaimerBadgeText: CHAT_CONVERSATION_DEFAULTS.disclaimerBadgeText,
    }),
    [conversationMeta?.title, modeBadgeText],
  );

  const finalizeSession = useCallback(
    async (thread: ChatMessage[]) => {
      await finalizeSessionFromThread(thread, profileData, context, conversationId, "voice");
      setAwaitingCommitment(false);
      setClosePromptMessageId(null);
      setSessionClosed(true);
      onSessionClosed?.();
      toast.success("Voice session saved.");
    },
    [context, conversationId, onSessionClosed, profileData],
  );

  const sendVoiceTurn = useCallback(
    async (text: string, voiceEmotionDetected?: boolean) => {
      const trimmed = text.trim();
      if (!trimmed || awaitingAssistantReply || sessionClosed) return;

      const optimisticId = `pending-${crypto.randomUUID()}`;
      const optimisticUserMessage: ChatMessage = {
        id: optimisticId,
        role: "user",
        content: trimmed,
      };
      const threadSnapshot = [...messages, optimisticUserMessage];

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
            const ackText = await requestSessionCloseAck(
              threadForAi,
              profileData,
              context,
              conversationId,
              "voice",
            );
            const { nextThread } = await sendAssistantMessage(ackText, threadForAi);
            await finalizeSession(nextThread);
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
            "voice",
            voiceEmotionDetected,
          );
          const { nextThread } = await sendAssistantMessage(assistantText, threadForAi);
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

    setAwaitingAssistantReply(true);
    try {
      const closeText = await requestSessionClose(
        messages,
        profileData,
        context,
        conversationId,
        "voice",
      );
      await playVoiceCloseRitualSilence();
      const { assistantMessage } = await sendAssistantMessage(closeText, messages);
      setClosePromptMessageId(assistantMessage.id);
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

  const voiceRecorder = useVoiceSessionRecorder({
    enabled: !sessionClosed && !sessionLimitBlocked,
    onTranscript: (transcript, options) =>
      sendVoiceTurn(transcript, options?.emotionDetected),
    onError: (error) => toast.error(error.message),
  });

  if (loading) {
    return (
      <div className={cn("flex flex-1 items-center justify-center text-sm text-muted-foreground", className)}>
        Loading voice session…
      </div>
    );
  }

  return (
    <section className={cn("flex h-full min-h-0 flex-col", className)}>
      {sessionLimitBlocked ? (
        <div className="border-b border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {FREE_TIER_UPSELL_MESSAGE}
        </div>
      ) : null}

      <ChatHeader
        conversation={conversation}
        onEndSession={sessionClosed ? undefined : () => void handleEndSession()}
        endSessionDisabled={awaitingAssistantReply || messages.length === 0}
        endSessionLabel={awaitingCommitment ? "Waiting for commitment…" : "End voice session"}
      />

      <ChatMessagesList
        messages={messages}
        isAssistantTyping={awaitingAssistantReply}
        commitmentPromptMessageId={commitmentPromptMessageId}
      />

      {awaitingCommitment ? <ChatCommitmentAwaitingBanner channel="voice" /> : null}

      <div
        className={cn(
          "flex shrink-0 flex-col items-center gap-3 border-t px-4 py-6",
          awaitingCommitment ? "border-primary/30 bg-primary/5" : "border-border",
        )}
      >
        <p className="text-center text-sm text-muted-foreground">
          {awaitingCommitment
            ? "Tap the mic and say your commitment in your own words."
            : "Tap the mic and speak. Kota replies with voice — no typing needed."}
        </p>
        <VoiceSessionMicButton
          recording={voiceRecorder.recording}
          transcribing={voiceRecorder.transcribing}
          silenceHoldActive={voiceRecorder.silenceHoldActive}
          disabled={
            awaitingAssistantReply ||
            sessionClosed ||
            sessionLimitBlocked ||
            voiceRecorder.transcribing
          }
          onToggle={voiceRecorder.toggleRecording}
          className="scale-150"
        />
        {voiceRecorder.recording ? (
          <p className="text-xs text-muted-foreground animate-pulse">Listening…</p>
        ) : voiceRecorder.transcribing ? (
          <p className="text-xs text-muted-foreground">Transcribing your words…</p>
        ) : null}
      </div>
    </section>
  );
}
