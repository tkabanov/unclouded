import { useCallback, useEffect, useRef, useState } from "react";

import {
  computeTimeDomainRms,
  createVoiceSilenceWatcher,
  isVoiceInputSilent,
  resolveVoiceRecordingMimeType,
  transcribeVoiceBlob,
  validateVoiceRecordingBlob,
  VOICE_INPUT_MEDIA_CONSTRAINTS,
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
  const recorderMimeTypeRef = useRef("audio/webm");
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const silenceWatcherRef = useRef(createVoiceSilenceWatcher(() => setSilenceHoldActive(true)));
  const silenceTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analyserFrameRef = useRef<Float32Array | null>(null);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      window.clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const teardownAnalyser = useCallback(() => {
    analyserRef.current = null;
    analyserFrameRef.current = null;
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context) {
      void context.close().catch(() => undefined);
    }
  }, []);

  const stopTracks = useCallback(() => {
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
    teardownAnalyser();
  }, [teardownAnalyser]);

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
          const mimeType = recorder.mimeType || recorderMimeTypeRef.current;
          const nextBlob = chunksRef.current.length
            ? new Blob(chunksRef.current, { type: mimeType })
            : null;
          resolve(nextBlob);
        },
        { once: true },
      );
      if (recorder.state === "recording") {
        recorder.requestData();
      }
      recorder.stop();
    });

    stopTracks();
    chunksRef.current = [];

    if (!blob || blob.size === 0) return;

    const mimeType = recorder.mimeType || recorderMimeTypeRef.current;
    const validation = await validateVoiceRecordingBlob(blob, mimeType);
    if (!validation.ok) {
      const message =
        validation.reason === "undecodable"
          ? "Couldn't read this recording. Try an external browser (Chrome) or check your microphone."
          : "No speech detected.";
      onError?.(new Error(message));
      return;
    }

    setTranscribing(true);
    try {
      const { text: transcript, emotionDetected } = await transcribeVoiceBlob(blob, {
        filename: validation.uploadFilename,
        durationSec: validation.durationSec,
      });
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
      const stream = await navigator.mediaDevices.getUserMedia(VOICE_INPUT_MEDIA_CONSTRAINTS);
      streamRef.current = stream;

      const mimeType = resolveVoiceRecordingMimeType();
      recorderMimeTypeRef.current = mimeType ?? "audio/webm";
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      // Drive the REQ-14 silence hold from real audio level, not from chunk
      // cadence: MediaRecorder emits `dataavailable` even during silence.
      const AudioContextCtor: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextCtor) {
        try {
          const audioContext = new AudioContextCtor();
          const source = audioContext.createMediaStreamSource(stream);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 2048;
          source.connect(analyser);
          audioContextRef.current = audioContext;
          analyserRef.current = analyser;
          analyserFrameRef.current = new Float32Array(analyser.fftSize);
          void audioContext.resume().catch(() => undefined);
        } catch {
          teardownAnalyser();
        }
      }

      recorder.start(500);
      setRecording(true);

      silenceTimerRef.current = window.setInterval(() => {
        const analyser = analyserRef.current;
        const frame = analyserFrameRef.current;
        if (analyser && frame) {
          analyser.getFloatTimeDomainData(frame);
          if (isVoiceInputSilent(computeTimeDomainRms(frame))) {
            silenceWatcherRef.current.noteSilenceTick(500);
          } else {
            silenceWatcherRef.current.noteSound();
            setSilenceHoldActive(false);
          }
          return;
        }
        // No analyser available: fall back to time-based hold so long silence
        // still surfaces the "silence is okay" hint.
        silenceWatcherRef.current.noteSilenceTick(500);
      }, 500);
    } catch (error) {
      stopTracks();
      onError?.(error instanceof Error ? error : new Error("Microphone access denied."));
    }
  }, [enabled, onError, recording, resetSilenceState, stopTracks, teardownAnalyser, transcribing]);

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
