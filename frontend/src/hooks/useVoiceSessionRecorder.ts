import { useCallback, useEffect, useRef, useState } from "react";

import {
  createVoiceSilenceWatcher,
  transcribeVoiceBlob,
  VOICE_SILENCE_HOLD_MS,
} from "@/lib/chat/voiceSessionApi";

type UseVoiceSessionRecorderOptions = {
  enabled: boolean;
  onTranscript: (text: string, options?: { emotionDetected?: boolean }) => void | Promise<void>;
  onError?: (error: Error) => void;
};

export function useVoiceSessionRecorder({
  enabled,
  onTranscript,
  onError,
}: UseVoiceSessionRecorderOptions) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [silenceHoldActive, setSilenceHoldActive] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const silenceWatcherRef = useRef(createVoiceSilenceWatcher(() => setSilenceHoldActive(true)));
  const silenceTimerRef = useRef<number | null>(null);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      window.clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
  }, []);

  const resetSilenceState = useCallback(() => {
    silenceWatcherRef.current.reset();
    setSilenceHoldActive(false);
  }, []);

  const stopRecording = useCallback(async () => {
    clearSilenceTimer();
    resetSilenceState();

    const recorder = recorderRef.current;
    recorderRef.current = null;
    setRecording(false);

    if (!recorder || recorder.state === "inactive") {
      stopTracks();
      return;
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      recorder.addEventListener(
        "stop",
        () => {
          const nextBlob = chunksRef.current.length
            ? new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
            : null;
          resolve(nextBlob);
        },
        { once: true },
      );
      recorder.stop();
    });

    stopTracks();
    chunksRef.current = [];

    if (!blob || blob.size === 0) return;

    setTranscribing(true);
    try {
      const { text: transcript, emotionDetected } = await transcribeVoiceBlob(blob);
      if (!transcript.trim()) {
        throw new Error("No speech detected.");
      }
      await onTranscript(transcript.trim(), { emotionDetected });
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Voice transcription failed."));
    } finally {
      setTranscribing(false);
    }
  }, [clearSilenceTimer, onError, onTranscript, resetSilenceState, stopTracks]);

  const startRecording = useCallback(async () => {
    if (!enabled || recording || transcribing) return;

    resetSilenceState();
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          silenceWatcherRef.current.noteSound();
          setSilenceHoldActive(false);
        }
      });

      recorder.start(500);
      setRecording(true);

      silenceTimerRef.current = window.setInterval(() => {
        silenceWatcherRef.current.noteSilenceTick(500);
      }, 500);
    } catch (error) {
      stopTracks();
      onError?.(error instanceof Error ? error : new Error("Microphone access denied."));
    }
  }, [enabled, onError, recording, resetSilenceState, stopTracks, transcribing]);

  useEffect(() => {
    return () => {
      clearSilenceTimer();
      recorderRef.current?.stop();
      stopTracks();
    };
  }, [clearSilenceTimer, stopTracks]);

  return {
    recording,
    transcribing,
    silenceHoldActive,
    silenceHoldMs: VOICE_SILENCE_HOLD_MS,
    startRecording,
    stopRecording,
    toggleRecording: () => {
      if (recording) {
        void stopRecording();
      } else {
        void startRecording();
      }
    },
  };
}

export async function playKotaSpeech(blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  try {
    await audio.play();
    await new Promise<void>((resolve, reject) => {
      audio.addEventListener("ended", () => resolve(), { once: true });
      audio.addEventListener("error", () => reject(new Error("Playback failed")), { once: true });
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
