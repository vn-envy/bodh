"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NarrationLanguage } from "../../lib/narration-language";
import { composeSpeechInputValue, type SpeechInputError } from "../../lib/speech-input";
import type { ReasoningSpeechStatus } from "./useReasoningSpeechInput";

export type SpeechProvider = "browser" | "sarvam";

const MAX_RECORDING_MS = 30_000;
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;

let providerPromise: Promise<SpeechProvider> | null = null;

/** Asks the Worker once which transcription provider is configured; defaults to the browser. */
export function detectSpeechProvider(): Promise<SpeechProvider> {
  if (!providerPromise) {
    providerPromise = fetch("/api/speech/capabilities", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return "browser" as const;
        const body = (await response.json()) as { provider?: unknown };
        return body.provider === "sarvam" ? "sarvam" : "browser";
      })
      .catch(() => "browser" as const);
  }
  return providerPromise;
}

export function useSpeechProvider() {
  const [provider, setProvider] = useState<SpeechProvider>("browser");
  useEffect(() => {
    let cancelled = false;
    void detectSpeechProvider().then((detected) => {
      if (!cancelled && detected !== "browser") queueMicrotask(() => setProvider(detected));
    });
    return () => { cancelled = true; };
  }, []);
  return provider;
}

function recorderSupported() {
  return typeof window !== "undefined"
    && typeof MediaRecorder !== "undefined"
    && typeof navigator !== "undefined"
    && Boolean(navigator.mediaDevices?.getUserMedia);
}

function pickMimeType() {
  for (const candidate of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return "";
}

type Options = {
  language: NarrationLanguage;
  value: string;
  maxLength: number;
  onValueChange: (value: string) => void;
  enabled: boolean;
};

/**
 * Records one utterance with MediaRecorder and sends it to
 * `POST /api/speech/transcribe` (Saaras v3, code-mixed). The transcript lands
 * in the same editable text box as typing; audio is discarded immediately.
 */
export function useSarvamSpeechInput({ language, value, maxLength, onValueChange, enabled }: Options) {
  const [status, setStatus] = useState<ReasoningSpeechStatus>("idle");
  const [error, setError] = useState<SpeechInputError | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const valueRef = useRef(value);
  const onValueChangeRef = useRef(onValueChange);
  const mountedRef = useRef(true);

  useEffect(() => {
    valueRef.current = value;
    onValueChangeRef.current = onValueChange;
  }, [onValueChange, value]);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled && recorderSupported()) queueMicrotask(() => setIsSupported(true));
    return () => { mountedRef.current = false; };
  }, [enabled]);

  const releaseStream = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      try { recorder.stop(); } catch { /* already stopped */ }
    }
    releaseStream();
    if (mountedRef.current) {
      setStatus("idle");
      setError(null);
    }
  }, [releaseStream]);

  const upload = useCallback(async (blob: Blob) => {
    if (blob.size === 0 || blob.size > MAX_AUDIO_BYTES) {
      setError(blob.size === 0 ? "no-speech" : "unavailable");
      setStatus("error");
      return;
    }
    const form = new FormData();
    form.append("audio", blob, "speech");
    form.append("language", language);
    try {
      const response = await fetch("/api/speech/transcribe", { method: "POST", body: form });
      if (!mountedRef.current) return;
      if (!response.ok) {
        setError(response.status === 429 ? "network" : "unavailable");
        setStatus("error");
        return;
      }
      const body = (await response.json()) as { transcript?: unknown };
      const transcript = typeof body.transcript === "string" ? body.transcript : "";
      if (!transcript) {
        setError("no-speech");
        setStatus("error");
        return;
      }
      onValueChangeRef.current(composeSpeechInputValue(valueRef.current, transcript, "", maxLength));
      setStatus("idle");
      setError(null);
    } catch {
      if (!mountedRef.current) return;
      setError("network");
      setStatus("error");
    }
  }, [language, maxLength]);

  const start = useCallback(async () => {
    if (!recorderSupported()) return;
    cancel();
    setStatus("starting");
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (cause) {
      if (!mountedRef.current) return;
      const name = (cause as { name?: string })?.name;
      setError(name === "NotAllowedError" || name === "SecurityError" ? "permission-denied" : "microphone-unavailable");
      setStatus("error");
      return;
    }
    if (!mountedRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    streamRef.current = stream;
    const mimeType = pickMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    recorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      releaseStream();
      if (mountedRef.current) {
        setStatus("stopping");
        void upload(blob);
      }
    };
    recorder.start();
    setStatus("listening");
    timerRef.current = window.setTimeout(() => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    }, MAX_RECORDING_MS);
  }, [cancel, releaseStream, upload]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setStatus("stopping");
    try {
      recorder.stop();
    } catch {
      cancel();
    }
  }, [cancel]);

  useEffect(() => () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      try { recorder.stop(); } catch { /* unmount cleanup stays silent */ }
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  return {
    isSupported,
    status,
    error,
    liveTranscript: "",
    start: () => { void start(); },
    stop,
    cancel,
  } as const;
}
