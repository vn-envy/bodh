"use client";

import { useNarrationLanguage } from "./NarrationLanguageToggle";

export function LocalizedSkipLink() {
  const language = useNarrationLanguage();
  return <a className="skip-link" href="#main-content">{language === "hi" ? "मुख्य भाग पर जाएँ" : "Skip to main content"}</a>;
}
