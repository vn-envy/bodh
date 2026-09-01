"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EVAPORATION_NARRATION_VERSION } from "../../../lib/evaporation-concept";
import { FRACTION_NARRATION_VERSION } from "../../../lib/fraction-concept";
import { NARRATION_SPEECH_LOCALE, type NarrationLanguage } from "../../../lib/narration-language";
import type { StationId } from "../../../lib/world/places";

export type SpokenBeat = Readonly<{ id: string; atomId: string; text: string; key: string; target: string }>;

export type NarrationState = "idle" | "playing" | "unavailable";

function narrationVersion(stationId: StationId) {
  return stationId === "puddle-sun" ? EVAPORATION_NARRATION_VERSION : FRACTION_NARRATION_VERSION;
}

export function beatUrl(stationId: StationId, language: NarrationLanguage, beat: SpokenBeat) {
  return `/api/narration/${narrationVersion(stationId)}/${language}/${beat.atomId}/${beat.id}.mp3`;
}

/**
 * Plays authored beats in order through the allowlisted narration route and
 * falls back to the device voice when hosted audio is unavailable. Learner text
 * never reaches this hook; only beat IDs do.
 */
export function useBeatNarration(stationId: StationId | null, language: NarrationLanguage) {
  const [state, setState] = useState<NarrationState>("idle");
  const [activeBeatId, setActiveBeatId] = useState<string | null>(null);
  const tokenRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    tokenRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current = null;
    }
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    setActiveBeatId(null);
    setState("idle");
  }, []);

  useEffect(() => stop, [stop, stationId, language]);

  const speakWithDevice = useCallback((beat: SpokenBeat, token: number) => new Promise<boolean>((resolve) => {
    if (typeof speechSynthesis === "undefined" || typeof SpeechSynthesisUtterance === "undefined") {
      resolve(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(beat.text);
    utterance.lang = NARRATION_SPEECH_LOCALE[language];
    utterance.rate = 0.9;
    utterance.onend = () => resolve(token === tokenRef.current);
    utterance.onerror = () => resolve(false);
    speechSynthesis.speak(utterance);
  }), [language]);

  const play = useCallback(async (beats: readonly SpokenBeat[]) => {
    if (!stationId || beats.length === 0) return;
    stop();
    const token = tokenRef.current;
    setState("playing");
    for (const beat of beats) {
      if (token !== tokenRef.current) return;
      setActiveBeatId(beat.id);
      const audio = new Audio(beatUrl(stationId, language, beat));
      audioRef.current = audio;
      const played = await new Promise<boolean>((resolve) => {
        audio.onended = () => resolve(true);
        audio.onerror = () => resolve(false);
        void audio.play().catch(() => resolve(false));
      });
      if (token !== tokenRef.current) return;
      if (!played) {
        const spoken = await speakWithDevice(beat, token);
        if (token !== tokenRef.current) return;
        if (!spoken) {
          setState("unavailable");
          setActiveBeatId(null);
          return;
        }
      }
    }
    if (token === tokenRef.current) {
      setActiveBeatId(null);
      setState("idle");
    }
  }, [language, speakWithDevice, stationId, stop]);

  return { state, activeBeatId, play, stop } as const;
}
