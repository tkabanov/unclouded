import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { toast } from "sonner";
import { CrisisSupportCard } from "@/components/crisis";
import { Button } from "@/components/ui/button";
import { useRealtimeConversation } from "@/hooks/useRealtimeConversation";
import { REALTIME_MIC_PERMISSION_HINT, REALTIME_OFFLINE_MESSAGE } from "@/lib/realtime/realtimeErrors";
import { isLivePhase, isSessionBusy } from "@/lib/realtime/realtimeSessionMachine";
import { readStoredRealtimeVoice, storeRealtimeVoice, type RealtimeVoice } from "@/lib/realtime/realtimeVoices";
import { formatRemaining, REALTIME_TIME_WARNING_MESSAGE } from "@/lib/realtime/realtimeUi";
import { finalizeRealtimeConversation, shouldFinalizeOnEnd } from "@/lib/realtime/realtimeFinalize";
import { cn } from "@/lib/utils";
import { RealtimeErrorNotice } from "./RealtimeErrorNotice";
import { RealtimeOrb } from "./RealtimeOrb";
import { RealtimeTranscript } from "./RealtimeTranscript";
import { RealtimeVoicePicker } from "./RealtimeVoicePicker";

function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

/** True while the browser has not asked for the microphone yet (Permissions API, where supported). */
function useMicPermissionPrompt(): boolean {
  const [prompt, setPrompt] = useState(false);
  useEffect(() => {
    let cancelled = false;
    navigator.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((status) => {
        if (!cancelled) setPrompt(status.state === "prompt");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return prompt;
}

export interface RealtimeConversationPanelProps {
  /** A session is being set up, running or ending (locks the mode toggle). */
  onBusyChange?: (busy: boolean) => void;
  className?: string;
}

/** NCLDD-57 — Conversation mode (speech-to-speech with Kota) on `/coaching/voice`. */
export default function RealtimeConversationPanel({ onBusyChange, className }: RealtimeConversationPanelProps) {
  const conversation = useRealtimeConversation();
  const [voice, setVoice] = useState<RealtimeVoice>(() => readStoredRealtimeVoice());
  const online = useOnline();
  const permissionPrompt = useMicPermissionPrompt();

  const { state, error, crisis } = conversation;
  const phase = state.phase;
  const busy = isSessionBusy(phase);
  const live = isLivePhase(phase);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  // Unmount (mode switch, sidebar link) ends the session in the hook; unlock the toggle too.
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);

  // S6: finalize through chat `session_finalize`. Final ends finalize at once; recoverable ends
  // wait (Try again reuses the conversation) until a new conversation starts or the panel closes.
  const finalizedRef = useRef(new Set<string>());
  const pendingFinalizeRef = useRef<string | null>(null);
  const finalize = useCallback((conversationId: string) => {
    if (finalizedRef.current.has(conversationId)) return;
    finalizedRef.current.add(conversationId);
    if (pendingFinalizeRef.current === conversationId) pendingFinalizeRef.current = null;
    finalizeRealtimeConversation(conversationId)
      .then((result) => {
        if (result === "saved") toast.success("Conversation saved.");
      })
      .catch((err) => {
        // Stays unfinalized, like a voice session whose finalize failed.
        console.warn("realtime finalize failed", err);
        toast.error("Couldn't save the conversation summary.");
      });
  }, []);

  const endedConversationId = phase === "ended" ? conversation.conversationId : null;
  const crisisSeen = crisis !== null;
  useEffect(() => {
    if (!endedConversationId) return;
    // A crisis found while flushing after End: not finalized, like a chat thread after a crisis.
    if (crisisSeen) {
      if (pendingFinalizeRef.current === endedConversationId) pendingFinalizeRef.current = null;
      return;
    }
    if (shouldFinalizeOnEnd(state.endReason)) finalize(endedConversationId);
    else if (state.endReason !== "crisis") pendingFinalizeRef.current = endedConversationId;
  }, [crisisSeen, endedConversationId, finalize, state.endReason]);

  useEffect(
    () => () => {
      if (pendingFinalizeRef.current) finalize(pendingFinalizeRef.current);
    },
    [finalize],
  );

  const limitReached = error?.kind === "limit_reached" || (phase === "ended" && state.endReason === "budget_reached");
  const limitNotice = limitReached ? (error?.message ?? conversation.endMessage) : null;
  // Like chat after a crisis hard stop: this conversation is over, a new one may start.
  const startBlocked = !online || limitReached;
  const showCrisisResources = crisis !== null || error?.kind === "crisis";
  const showTranscript = conversation.transcript.length > 0 || live;
  const startLabel =
    phase === "idle"
      ? "Start conversation"
      : phase === "error" && error?.kind.startsWith("mic_")
        ? "Try again"
        : "Start new conversation";

  const changeVoice = (next: RealtimeVoice) => {
    setVoice(next);
    storeRealtimeVoice(next);
  };

  // Called straight from the tap handler: the hook unlocks audio before any await.
  const startNew = () => {
    conversation.start(voice, null);
    if (pendingFinalizeRef.current) finalize(pendingFinalizeRef.current);
  };

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden", className)}>
      {limitNotice ? (
        <div className="border-b border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{limitNotice}</div>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">Conversation with Kota</h2>
          {live && conversation.remainingMs !== null ? (
            <p className="text-xs text-muted-foreground" aria-label="Time left">
              {formatRemaining(conversation.remainingMs)} left
            </p>
          ) : null}
        </div>
        {busy ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={conversation.end}
            disabled={phase === "ending"}
          >
            End conversation
          </Button>
        ) : null}
      </div>

      {/* One scroll area for orb, notices and transcript; controls stay pinned in the footer. */}
      <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto px-4 py-6">
        <RealtimeOrb phase={phase} level={conversation.level} compact={showTranscript} />

        {conversation.playbackBlocked ? (
          <Button type="button" variant="secondary" size="sm" onClick={conversation.resumePlayback}>
            <Volume2 className="mr-1.5 h-4 w-4" aria-hidden />
            Tap to enable sound
          </Button>
        ) : null}

        {live && conversation.timeWarning ? (
          <RealtimeErrorNotice tone="info" message={REALTIME_TIME_WARNING_MESSAGE} className="w-full max-w-md" />
        ) : null}

        {crisis ? (
          <div
            role="alert"
            className="w-full max-w-md rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground"
          >
            {crisis.text}
          </div>
        ) : null}

        {showCrisisResources ? (
          <div className="w-full max-w-md">
            <CrisisSupportCard />
          </div>
        ) : null}

        {phase === "error" && error && !limitReached ? (
          <RealtimeErrorNotice message={error.message} className="w-full max-w-md" />
        ) : null}

        {phase === "ended" && conversation.endMessage && !limitReached ? (
          <RealtimeErrorNotice
            tone={conversation.canRetry ? "error" : "info"}
            message={conversation.endMessage}
            className="w-full max-w-md"
          />
        ) : null}

        {showTranscript ? (
          <RealtimeTranscript items={conversation.transcript} className="w-full max-w-2xl" />
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col items-center gap-3 border-t border-border px-4 py-4">
        <div className="flex w-full max-w-md flex-col items-center gap-3">
          <RealtimeVoicePicker value={voice} onChange={changeVoice} locked={busy} />

          {!busy ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {conversation.canRetry ? (
                <Button type="button" onClick={conversation.retry} disabled={startBlocked}>
                  Try again
                </Button>
              ) : null}
              <Button
                type="button"
                variant={conversation.canRetry ? "outline" : "default"}
                onClick={startNew}
                disabled={startBlocked}
              >
                {startLabel}
              </Button>
            </div>
          ) : null}

          {!busy && !online ? <RealtimeErrorNotice tone="info" message={REALTIME_OFFLINE_MESSAGE} /> : null}
          {phase === "idle" && online && permissionPrompt ? (
            <p className="text-xs text-muted-foreground">{REALTIME_MIC_PERMISSION_HINT}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
