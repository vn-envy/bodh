"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_NARRATION_LANGUAGE,
  isNarrationLanguage,
  type NarrationLanguage,
} from "../../lib/narration-language";

const STORAGE_KEY = "bodh:narration-language";
const CHANGE_EVENT = "bodh:narration-language-change";
let memoryLanguage: NarrationLanguage = DEFAULT_NARRATION_LANGUAGE;

function currentLanguage(): NarrationLanguage {
  if (typeof window === "undefined") return DEFAULT_NARRATION_LANGUAGE;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isNarrationLanguage(stored)) memoryLanguage = stored;
  } catch {
    // The in-memory choice still works when storage is unavailable.
  }
  return memoryLanguage;
}

function subscribe(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onStoreChange();
  };
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function setNarrationLanguage(language: NarrationLanguage) {
  memoryLanguage = language;
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Keep the session-level preference when storage is unavailable.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useNarrationLanguage() {
  return useSyncExternalStore(subscribe, currentLanguage, () => DEFAULT_NARRATION_LANGUAGE);
}

export function NarrationLanguageToggle({ compact = false }: { compact?: boolean }) {
  const language = useNarrationLanguage();

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <fieldset className={`narration-language-toggle ${compact ? "narration-language-compact" : ""}`}>
      <legend>Lesson language and Bodh voice</legend>
      <label className={language === "hi" ? "narration-language-active" : ""}>
        <input
          type="radio"
          name="bodh-narration-language"
          value="hi"
          checked={language === "hi"}
          onChange={() => setNarrationLanguage("hi")}
        />
        <span lang="hi">हिंदी</span>
      </label>
      <label className={language === "en" ? "narration-language-active" : ""}>
        <input
          type="radio"
          name="bodh-narration-language"
          value="en"
          checked={language === "en"}
          onChange={() => setNarrationLanguage("en")}
        />
        <span lang="en">English</span>
      </label>
    </fieldset>
  );
}
