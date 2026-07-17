"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NarrationLanguage } from "../../lib/narration-language";
import {
  collectSpeechSegments,
  composeSpeechInputValue,
  speechInputErrorFor,
  speechInputLocale,
  type SpeechInputError,
  type SpeechInputSegment,
} from "../../lib/speech-input";

export type ReasoningSpeechStatus = "idle" | "starting" | "listening" | "stopping" | "error";

type SpeechRecognitionResultLike = {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: { readonly transcript: string };
};

type SpeechRecognitionResultListLike = {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResultLike;
};

type SpeechRecognitionEventLike = {
  readonly results: SpeechRecognitionResultListLike;
};

type SpeechRecognitionErrorEventLike = {
  readonly error?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type UseReasoningSpeechInputOptions = {
  language: NarrationLanguage;
  value: string;
  maxLength: number;
  onValueChange: (value: string) => void;
};

function recognitionConstructor() {
  if (typeof window === "undefined") return null;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function detachRecognition(recognition: SpeechRecognitionLike) {
  recognition.onstart = null;
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;
}

function segmentsFromResults(results: SpeechRecognitionResultListLike) {
  const segments: SpeechInputSegment[] = [];
  for (let index = 0; index < results.length; index += 1) {
    const result = results[index];
    const transcript = result?.[0]?.transcript;
    if (typeof transcript === "string") {
      segments.push({ transcript, isFinal: result.isFinal });
    }
  }
  return segments;
}

export function useReasoningSpeechInput({
  language,
  value,
  maxLength,
  onValueChange,
}: UseReasoningSpeechInputOptions) {
  const [isSupported, setIsSupported] = useState(false);
  const [status, setStatus] = useState<ReasoningSpeechStatus>("idle");
  const [error, setError] = useState<SpeechInputError | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const constructorRef = useRef<SpeechRecognitionConstructor | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const valueRef = useRef(value);
  const onValueChangeRef = useRef(onValueChange);
  const runRef = useRef(0);
  const mountedRef = useRef(true);
  const previousLanguageRef = useRef(language);

  useEffect(() => {
    valueRef.current = value;
    onValueChangeRef.current = onValueChange;
  }, [onValueChange, value]);

  const cancel = useCallback(() => {
    runRef.current += 1;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      detachRecognition(recognition);
      try {
        recognition.abort();
      } catch {
        // The browser may already have closed the recognition session.
      }
    }
    if (mountedRef.current) {
      setStatus("idle");
      setError(null);
      setLiveTranscript("");
    }
  }, []);

  const start = useCallback(() => {
    const Recognition = constructorRef.current;
    if (!Recognition) return;

    cancel();
    const recognition = new Recognition();
    const run = runRef.current + 1;
    runRef.current = run;
    recognitionRef.current = recognition;
    const existingValue = valueRef.current;
    let hadError = false;

    recognition.lang = speechInputLocale(language);
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      if (run !== runRef.current || !mountedRef.current) return;
      setStatus("listening");
    };
    recognition.onresult = (event) => {
      if (run !== runRef.current || !mountedRef.current) return;
      const collected = collectSpeechSegments(segmentsFromResults(event.results));
      const live = collected.interimTranscript || collected.finalTranscript;
      setLiveTranscript(live);
      setStatus("listening");
      onValueChangeRef.current(composeSpeechInputValue(
        existingValue,
        collected.finalTranscript,
        collected.interimTranscript,
        maxLength,
      ));
    };
    recognition.onerror = (event) => {
      if (run !== runRef.current || !mountedRef.current) return;
      const nextError = speechInputErrorFor(event.error);
      if (!nextError) return;
      hadError = true;
      setError(nextError);
      setStatus("error");
      setLiveTranscript("");
    };
    recognition.onend = () => {
      if (run !== runRef.current || !mountedRef.current) return;
      recognitionRef.current = null;
      setLiveTranscript("");
      if (!hadError) setStatus("idle");
    };

    setStatus("starting");
    setError(null);
    setLiveTranscript("");
    try {
      recognition.start();
    } catch {
      if (run !== runRef.current || !mountedRef.current) return;
      recognitionRef.current = null;
      detachRecognition(recognition);
      setError("unavailable");
      setStatus("error");
    }
  }, [cancel, language, maxLength]);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    setStatus("stopping");
    try {
      recognition.stop();
    } catch {
      cancel();
    }
  }, [cancel]);

  useEffect(() => {
    mountedRef.current = true;
    constructorRef.current = recognitionConstructor();
    setIsSupported(Boolean(constructorRef.current));
    return () => {
      mountedRef.current = false;
      runRef.current += 1;
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      if (!recognition) return;
      detachRecognition(recognition);
      try {
        recognition.abort();
      } catch {
        // Unmount cleanup must remain silent.
      }
    };
  }, []);

  useEffect(() => {
    if (previousLanguageRef.current === language) return;
    previousLanguageRef.current = language;
    cancel();
  }, [cancel, language]);

  return {
    isSupported,
    status,
    error,
    liveTranscript,
    start,
    stop,
    cancel,
  } as const;
}
