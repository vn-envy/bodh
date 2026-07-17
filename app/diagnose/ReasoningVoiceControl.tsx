"use client";

import type { NarrationLanguage } from "../../lib/narration-language";
import type { SpeechInputError } from "../../lib/speech-input";
import type { ReasoningSpeechStatus } from "./useReasoningSpeechInput";
import styles from "./ReasoningVoiceControl.module.css";

type ReasoningVoiceControlProps = {
  language: NarrationLanguage;
  isSupported: boolean;
  status: ReasoningSpeechStatus;
  error: SpeechInputError | null;
  liveTranscript: string;
  disabled?: boolean;
  textareaId: string;
  helpId: string;
  onStart: () => void;
  onStop: () => void;
};

const copy = {
  start: { hi: "बोलकर बताएं", en: "Speak your thought" },
  retry: { hi: "Mic फिर कोशिश करें", en: "Try the mic again" },
  stop: { hi: "सुनना रोकें", en: "Stop listening" },
  starting: { hi: "Mic शुरू हो रहा है…", en: "Starting the microphone…" },
  listening: { hi: "सुन रहा हूँ—शब्द ऊपर लिख रहे हैं।", en: "Listening—your words are appearing above." },
  stopping: { hi: "आखिरी शब्द लिख रहा हूँ…", en: "Finishing the last words…" },
  ready: { hi: "चाहो तो अपनी बात बोल सकते हो।", en: "You can speak your explanation if that feels easier." },
  live: { hi: "अभी सुना", en: "Hearing now" },
  privacy: {
    hi: "Browser आवाज़ को text बनाता है। Bodh को ऊपर लिखा हुआ text ही submit होगा, और तुम उसे बदल सकते हो।",
    en: "Your browser turns speech into text. Only the editable text above is submitted to Bodh.",
  },
} as const;

const errorCopy: Record<SpeechInputError, { hi: string; en: string }> = {
  "permission-denied": {
    hi: "Mic permission नहीं मिली। Browser settings में permission देकर फिर कोशिश करें।",
    en: "Microphone permission was not granted. Allow it in browser settings and try again.",
  },
  "microphone-unavailable": {
    hi: "इस समय microphone नहीं मिल रहा। तुम अपनी बात type कर सकते हो।",
    en: "A microphone is not available right now. You can still type your explanation.",
  },
  "no-speech": {
    hi: "कोई आवाज़ साफ़ नहीं सुनाई दी। थोड़ा पास आकर फिर कोशिश करें।",
    en: "No clear speech was heard. Move a little closer and try again.",
  },
  network: {
    hi: "Voice connection रुक गया। फिर कोशिश करें या अपनी बात type करें।",
    en: "The voice connection paused. Try again or type your explanation.",
  },
  "language-unavailable": {
    hi: "इस browser में चुनी हुई भाषा का voice input उपलब्ध नहीं है।",
    en: "Voice input for the selected language is not available in this browser.",
  },
  unavailable: {
    hi: "Voice input अभी शुरू नहीं हो पाया। तुम अपनी बात type कर सकते हो।",
    en: "Voice input could not start. You can still type your explanation.",
  },
};

export function ReasoningVoiceControl({
  language,
  isSupported,
  status,
  error,
  liveTranscript,
  disabled = false,
  textareaId,
  helpId,
  onStart,
  onStop,
}: ReasoningVoiceControlProps) {
  if (!isSupported) return null;

  const active = status === "starting" || status === "listening" || status === "stopping";
  const statusText = status === "starting"
    ? copy.starting[language]
    : status === "listening"
      ? copy.listening[language]
      : status === "stopping"
        ? copy.stopping[language]
        : copy.ready[language];
  const buttonText = active
    ? copy.stop[language]
    : error
      ? copy.retry[language]
      : copy.start[language];

  return (
    <div className={styles.voiceControl} data-voice-status={status}>
      <div className={styles.controlRow}>
        <button
          className={`${styles.voiceButton} ${active ? styles.voiceButtonActive : ""}`.trim()}
          type="button"
          disabled={disabled || status === "stopping"}
          aria-pressed={active}
          aria-controls={textareaId}
          onClick={active ? onStop : onStart}
        >
          <span className={styles.microphone} aria-hidden="true" />
          {buttonText}
        </button>
        <span className={styles.status} role="status" aria-live="polite" aria-atomic="true">
          {active && <i className={styles.listeningDot} aria-hidden="true" />}
          {statusText}
        </span>
      </div>
      {active && liveTranscript && (
        <p className={styles.liveTranscript} aria-hidden="true">
          <span>{copy.live[language]}</span> · “{liveTranscript}”
        </p>
      )}
      <p className={styles.privacy} id={helpId}>{copy.privacy[language]}</p>
      {error && <p className={styles.error} role="alert">{errorCopy[error][language]}</p>}
    </div>
  );
}
