export type SpeechVoiceLike = Readonly<{
  default: boolean;
  lang: string;
  name: string;
  voiceURI: string;
}>;

function normalizedLocale(locale: string) {
  return locale.trim().toLowerCase().replaceAll("_", "-");
}

/**
 * Pick one concrete browser voice deterministically. The returned object is
 * pinned for the lesson so an asynchronously reordered voice list cannot
 * change Bodh's character between narration beats.
 */
export function selectStableSpeechVoice<T extends SpeechVoiceLike>(
  voices: readonly T[],
  locale: string,
) {
  const targetLocale = normalizedLocale(locale);
  const targetLanguage = targetLocale.split("-")[0];
  return [...voices]
    .filter((voice) => normalizedLocale(voice.lang).split("-")[0] === targetLanguage)
    .sort((left, right) => {
      const leftLocale = normalizedLocale(left.lang);
      const rightLocale = normalizedLocale(right.lang);
      const leftScore = leftLocale === targetLocale ? 0 : 1;
      const rightScore = rightLocale === targetLocale ? 0 : 1;
      if (leftScore !== rightScore) return leftScore - rightScore;
      if (left.default !== right.default) return left.default ? -1 : 1;
      return `${left.voiceURI}\n${left.name}`.localeCompare(`${right.voiceURI}\n${right.name}`);
    })[0] ?? null;
}
