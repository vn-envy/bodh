import { NARRATION_SPEECH_LOCALE, type NarrationLanguage } from "./narration-language.ts";

export type SpeechInputError =
  | "permission-denied"
  | "microphone-unavailable"
  | "no-speech"
  | "network"
  | "language-unavailable"
  | "unavailable";

export type SpeechInputSegment = Readonly<{
  transcript: string;
  isFinal: boolean;
}>;

export type CollectedSpeech = Readonly<{
  finalTranscript: string;
  interimTranscript: string;
}>;

function compactSpeech(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function speechInputLocale(language: NarrationLanguage) {
  return NARRATION_SPEECH_LOCALE[language];
}

/** Keeps final and interim recognition hypotheses separate so interim words are never duplicated. */
export function collectSpeechSegments(segments: readonly SpeechInputSegment[]): CollectedSpeech {
  const finalTranscript = compactSpeech(
    segments
      .filter((segment) => segment.isFinal)
      .map((segment) => segment.transcript)
      .join(" "),
  );
  const interimTranscript = compactSpeech(
    segments
      .filter((segment) => !segment.isFinal)
      .map((segment) => segment.transcript)
      .join(" "),
  );
  return { finalTranscript, interimTranscript };
}

/** Appends one recognition session to the editable value and enforces the existing input bound. */
export function composeSpeechInputValue(
  existingValue: string,
  finalTranscript: string,
  interimTranscript: string,
  maxLength: number,
) {
  if (!Number.isInteger(maxLength) || maxLength < 1) return "";
  const base = existingValue.trimEnd();
  const spoken = compactSpeech([finalTranscript, interimTranscript].filter(Boolean).join(" "));
  if (!spoken) return base.slice(0, maxLength);
  return `${base}${base ? " " : ""}${spoken}`.slice(0, maxLength);
}

export function speechInputErrorFor(code: unknown): SpeechInputError | null {
  if (code === "aborted") return null;
  if (code === "not-allowed" || code === "service-not-allowed") return "permission-denied";
  if (code === "audio-capture") return "microphone-unavailable";
  if (code === "no-speech") return "no-speech";
  if (code === "network") return "network";
  if (code === "language-not-supported") return "language-unavailable";
  return "unavailable";
}
