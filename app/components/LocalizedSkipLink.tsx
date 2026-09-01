"use client";

import { localized } from "../../lib/narration-language";
import { useNarrationLanguage } from "./NarrationLanguageToggle";

const SKIP_COPY = { hi: "मुख्य भाग पर जाएँ", en: "Skip to main content" };

export function LocalizedSkipLink() {
  const language = useNarrationLanguage();
  return <a className="skip-link" href="#main-content">{localized(SKIP_COPY, language)}</a>;
}
