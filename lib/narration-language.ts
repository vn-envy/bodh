import { tamilOverlayFor } from "./tamil-overlay.ts";

/** Languages a learner can choose for the interface and Bodh's voice. */
export const NARRATION_LANGUAGES = ["hi", "en", "ta"] as const;

export type NarrationLanguage = (typeof NARRATION_LANGUAGES)[number];

/**
 * Languages in which every piece of copy is authored by hand. Tamil is served
 * through a reviewed overlay keyed by the English source and falls back to
 * English when an overlay entry is missing, so authored copy never breaks.
 */
export const AUTHORED_LANGUAGES = ["hi", "en"] as const;

export type AuthoredLanguage = (typeof AUTHORED_LANGUAGES)[number];

export const DEFAULT_NARRATION_LANGUAGE: NarrationLanguage = "hi";

export const NARRATION_SPEECH_LOCALE: Record<NarrationLanguage, string> = {
  hi: "hi-IN",
  en: "en-IN",
  ta: "ta-IN",
};

export const NARRATION_LANGUAGE_LABEL: Record<NarrationLanguage, string> = {
  hi: "हिंदी",
  en: "English",
  ta: "தமிழ்",
};

export function isNarrationLanguage(value: unknown): value is NarrationLanguage {
  return value === "hi" || value === "en" || value === "ta";
}

export function isAuthoredLanguage(value: unknown): value is AuthoredLanguage {
  return value === "hi" || value === "en";
}

/** The authored language whose copy is shown when no overlay exists. */
export function authoredLanguageFor(language: NarrationLanguage): AuthoredLanguage {
  return language === "hi" ? "hi" : "en";
}

export type LocalizedText = Readonly<Record<AuthoredLanguage, string>>;

export function localized(text: LocalizedText, language: NarrationLanguage): string {
  if (language === "ta") return tamilOverlayFor(text.en) ?? text.en;
  return text[language];
}

/** Resolves a plain per-language string map, e.g. UI chrome copy, with the same fallback rule. */
export function localizedFrom<T extends string>(
  copy: Readonly<Record<AuthoredLanguage, T>> & Partial<Readonly<Record<"ta", T>>>,
  language: NarrationLanguage,
): T | string {
  if (language === "ta") return copy.ta ?? tamilOverlayFor(copy.en) ?? copy.en;
  return copy[language];
}
