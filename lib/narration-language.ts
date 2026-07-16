export const NARRATION_LANGUAGES = ["hi", "en"] as const;

export type NarrationLanguage = (typeof NARRATION_LANGUAGES)[number];

export const DEFAULT_NARRATION_LANGUAGE: NarrationLanguage = "hi";

export const NARRATION_SPEECH_LOCALE: Record<NarrationLanguage, string> = {
  hi: "hi-IN",
  en: "en-IN",
};

export function isNarrationLanguage(value: unknown): value is NarrationLanguage {
  return value === "hi" || value === "en";
}

export type LocalizedText = Readonly<Record<NarrationLanguage, string>>;

export function localized(text: LocalizedText, language: NarrationLanguage) {
  return text[language];
}
