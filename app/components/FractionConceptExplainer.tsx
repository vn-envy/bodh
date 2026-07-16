"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  completedVisualState,
  FRACTION_CONCEPT_STAGES,
  FRACTION_MODEL,
  FRACTION_NARRATION_VERSION,
  type FractionCueTarget,
  resolveNarrationBeat,
  type ResolvedFractionNarrationBeat,
  type FractionVisualState,
} from "../../lib/fraction-concept";
import { type LocalizedText, type NarrationLanguage, NARRATION_SPEECH_LOCALE } from "../../lib/narration-language";
import { useNarrationLanguage } from "./NarrationLanguageToggle";

type FractionConceptExplainerProps = {
  onFinish: () => void;
};

type VoiceState = "idle" | "loading" | "ready" | "playing" | "paused" | "ended" | "unavailable";
type VoiceSource = "openai" | "device" | null;
type PlaybackResult = "ended" | "failed" | "cancelled";
type ActivePlayer =
  | { kind: "audio"; media: HTMLAudioElement; run: number; resolve: (result: PlaybackResult) => void }
  | { kind: "speech"; utterance: SpeechSynthesisUtterance; run: number; resolve: (result: PlaybackResult) => void };
type PreparedVoice = {
  stageId: string;
  language: NarrationLanguage;
  source: Exclude<VoiceSource, null>;
  urls?: string[];
};
type PointerPosition = { x: number; y: number; side: "top" | "right" | "bottom" | "left" };

const hiEn = (hi: string, en: string): LocalizedText => ({ hi, en });

const visualLabels: Record<FractionVisualState, LocalizedText> = {
  blank: hiEn("एक खाली फ्रैक्शन पट्टी, जिसमें अभी पूरा चुना जाना है", "An empty fraction strip whose whole has not been chosen yet"),
  whole: hiEn("पूरी पट्टी को एक पूरा चुना गया है", "The full strip has been chosen as one whole"),
  quarters: hiEn("वही पूरा चार बराबर हिस्सों में बँटा है", "The same whole is split into four equal parts"),
  unit: hiEn("चार बराबर हिस्सों में पहला एक-चौथाई चुना हुआ है", "One quarter is selected from four equal parts"),
  fraction: hiEn("चार बराबर हिस्सों में पहले तीन हिस्से चुने हुए हैं", "Three of four equal parts are selected"),
  eighths: hiEn("तीन चौथाई को छोटे आठवें हिस्सों में बाँटा गया है; मात्रा वही है", "Three quarters is repartitioned into eighths while the amount stays the same"),
  multiply: hiEn("एक बटा आठ की बराबर इकाइयाँ बार-बार रखी गई हैं; गिनती अभी सवाल है", "Equal one-eighth units are repeated while their count remains unknown"),
  divide: hiEn("तीन चौथाई में एक बटा आठ आकार की कितनी इकाइयाँ हैं, यह पूछा गया है", "The artifact asks how many one-eighth units fit inside three-fourths"),
};

const pointerLabel: Record<FractionCueTarget, LocalizedText> = {
  whole: hiEn("यही पूरा", "This is the whole"),
  "equal-parts": hiEn("बराबर हिस्से", "Equal parts"),
  "unit-quarter": hiEn("एक चौथाई", "One quarter"),
  denominator: hiEn("नीचे का 4", "The 4 below"),
  "selected-three": hiEn("चुने हुए हिस्से", "Chosen parts"),
  numerator: hiEn("ऊपर का 3", "The 3 above"),
  amount: hiEn("यही मात्रा", "This amount"),
  "eighth-seams": hiEn("नई रेखाएँ", "New dividing lines"),
  "eighth-unit": hiEn("एक बटा आठ", "One eighth"),
  "eighth-units": hiEn("वही इकाई, बार-बार", "The same unit, repeated"),
  equivalence: hiEn("अलग नाम, वही मात्रा", "Different name, same amount"),
  times: hiEn("गुणा का निशान", "Multiply sign"),
  divide: hiEn("भाग का निशान", "Division sign"),
  unknown: hiEn("यह गिनती अभी खोजनी है", "This count is still unknown"),
};

const pointerAnchor: Record<FractionCueTarget, string> = {
  whole: "whole",
  "equal-parts": "whole",
  "unit-quarter": "unit-quarter",
  denominator: "denominator",
  "selected-three": "selected-three",
  numerator: "numerator",
  amount: "amount",
  "eighth-seams": "eighth-seam",
  "eighth-unit": "eighth-unit",
  "eighth-units": "eighth-units",
  equivalence: "equivalence",
  times: "times",
  divide: "divide",
  unknown: "unknown",
};

function FractionGlyph({
  numerator,
  denominator,
  numeratorTarget,
  denominatorTarget,
  language,
}: {
  numerator: string;
  denominator: string;
  numeratorTarget?: boolean;
  denominatorTarget?: boolean;
  language: NarrationLanguage;
}) {
  return (
    <span
      className="atomic-fraction"
      aria-label={language === "hi" ? `${numerator} बटे ${denominator}` : `${numerator} over ${denominator}`}
      data-bodh-obstacle
    >
      <span data-bodh-anchor={numeratorTarget ? "numerator" : undefined}>{numerator}</span>
      <span data-bodh-anchor={denominatorTarget ? "denominator" : undefined}>{denominator}</span>
    </span>
  );
}

function EquationFor({ state, language }: { state: FractionVisualState; language: NarrationLanguage }) {
  if (state === "blank") return <span className="atomic-equation-muted">{language === "hi" ? "एक पूरा चुनें" : "Choose one whole"}</span>;
  if (state === "whole") return <strong data-bodh-obstacle>{language === "hi" ? "1 पूरा" : "1 whole"}</strong>;
  if (state === "quarters") {
    return <strong className="atomic-equation-small" data-bodh-obstacle>1/4 + 1/4 + 1/4 + 1/4 = 1</strong>;
  }
  if (state === "unit") {
    return (
      <div className="atomic-symbol-teaching">
        <FractionGlyph numerator="1" denominator="4" denominatorTarget language={language} />
        <span className="atomic-term-tag atomic-term-denominator" data-bodh-obstacle>
          {language === "hi" ? "हर · 4 बराबर हिस्से" : "denominator · 4 equal parts"}
        </span>
      </div>
    );
  }
  if (state === "fraction") {
    return (
      <div className="atomic-symbol-teaching">
        <FractionGlyph numerator="3" denominator="4" numeratorTarget denominatorTarget language={language} />
        <span className="atomic-term-tag atomic-term-numerator" data-bodh-obstacle>
          {language === "hi" ? "अंश · 3 हिस्से" : "numerator · 3 parts"}
        </span>
        <span className="atomic-term-tag atomic-term-denominator" data-bodh-obstacle>
          {language === "hi" ? "हर · हिस्से का आकार" : "denominator · part size"}
        </span>
      </div>
    );
  }
  if (state === "eighths") {
    return (
      <strong className="atomic-equivalence" data-bodh-anchor="equivalence">
        <FractionGlyph numerator="3" denominator="4" language={language} />
        <span data-bodh-obstacle>=</span>
        <FractionGlyph numerator="?" denominator="8" language={language} />
      </strong>
    );
  }
  if (state === "multiply") {
    return (
      <strong className="atomic-operation">
        <span data-bodh-anchor="unknown" data-bodh-obstacle>?</span>
        <span data-bodh-anchor="times" data-bodh-obstacle>×</span>
        <FractionGlyph numerator="1" denominator="8" language={language} />
        <span data-bodh-obstacle>=</span>
        <FractionGlyph numerator="3" denominator="4" language={language} />
      </strong>
    );
  }
  return (
    <strong className="atomic-operation">
      <FractionGlyph numerator="3" denominator="4" language={language} />
      <span data-bodh-anchor="divide" data-bodh-obstacle>÷</span>
      <FractionGlyph numerator="1" denominator="8" language={language} />
      <span data-bodh-obstacle>=</span>
      <span data-bodh-anchor="unknown" data-bodh-obstacle>?</span>
    </strong>
  );
}

function ArtifactPointer({
  position,
}: {
  position: PointerPosition | null;
}) {
  if (!position) return null;

  return (
    <span
      className={`atomic-pointer-tip atomic-pointer-tip-${position.side}`}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M12 3v15M6.5 12.5 12 18l5.5-5.5" />
      </svg>
    </span>
  );
}

function FractionArtifact({
  state,
  beat,
  language,
}: {
  state: FractionVisualState;
  beat: ResolvedFractionNarrationBeat | null;
  language: NarrationLanguage;
}) {
  const showEighthLabels = state === "multiply" || state === "divide";
  const quarters = Array.from({ length: FRACTION_MODEL.quarterCount });
  const artifactRef = useRef<HTMLDivElement>(null);
  const [pointerPosition, setPointerPosition] = useState<PointerPosition | null>(null);

  useLayoutEffect(() => {
    const root = artifactRef.current;
    if (!root || !beat) {
      setPointerPosition(null);
      return;
    }

    let frame = 0;
    const measure = () => {
      const targets = Array.from(root.querySelectorAll<HTMLElement>(
        `[data-bodh-anchor~="${pointerAnchor[beat.target]}"]`,
      ));
      if (targets.length === 0) {
        setPointerPosition(null);
        return;
      }
      const rootRect = root.getBoundingClientRect();
      const rects = targets.map((target) => target.getBoundingClientRect());
      const targetRect = {
        left: Math.min(...rects.map((rect) => rect.left)) - rootRect.left,
        top: Math.min(...rects.map((rect) => rect.top)) - rootRect.top,
        right: Math.max(...rects.map((rect) => rect.right)) - rootRect.left,
        bottom: Math.max(...rects.map((rect) => rect.bottom)) - rootRect.top,
      };
      const obstacles = Array.from(root.querySelectorAll<HTMLElement>("[data-bodh-obstacle]"))
        .filter((obstacle) => !targets.some((target) => obstacle === target || obstacle.contains(target) || target.contains(obstacle)))
        .map((obstacle) => {
          const rect = obstacle.getBoundingClientRect();
          return {
            left: rect.left - rootRect.left,
            top: rect.top - rootRect.top,
            right: rect.right - rootRect.left,
            bottom: rect.bottom - rootRect.top,
          };
        });
      const size = 18;
      const gap = 3;
      const centerX = (targetRect.left + targetRect.right) / 2;
      const centerY = (targetRect.top + targetRect.bottom) / 2;
      const candidates: PointerPosition[] = [
        { side: "top", x: centerX - size / 2, y: targetRect.top - size - gap },
        { side: "bottom", x: centerX - size / 2, y: targetRect.bottom + gap },
        { side: "left", x: targetRect.left - size - gap, y: centerY - size / 2 },
        { side: "right", x: targetRect.right + gap, y: centerY - size / 2 },
      ];
      const clear = candidates.find((candidate) => {
        const rect = { left: candidate.x, top: candidate.y, right: candidate.x + size, bottom: candidate.y + size };
        if (rect.left < 1 || rect.top < 1 || rect.right > rootRect.width - 1 || rect.bottom > rootRect.height - 1) return false;
        return obstacles.every((obstacle) => (
          rect.right <= obstacle.left || rect.left >= obstacle.right || rect.bottom <= obstacle.top || rect.top >= obstacle.bottom
        ));
      });
      setPointerPosition(clear ?? null);
    };
    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleMeasure);
    observer?.observe(root);
    window.addEventListener("resize", scheduleMeasure);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [beat, state]);

  return (
    <div
      className={`atomic-artifact atomic-visual-${state} ${beat ? `atomic-cue-${beat.target}` : ""}`}
      role="img"
      aria-label={visualLabels[state][language]}
      data-cue-target={beat?.target}
    >
      <div className={`atomic-artifact-caption ${beat ? "atomic-artifact-caption-active" : ""}`} aria-hidden="true">
        <span>↘</span>
        <strong>{beat ? pointerLabel[beat.target][language] : language === "hi" ? "Bodh का इशारा यहाँ आएगा" : "Bodh will point here"}</strong>
      </div>
      <div ref={artifactRef} className="atomic-artifact-canvas">
        <div className="atomic-whole-label" aria-hidden="true" data-bodh-obstacle>
        <span>{language === "hi" ? "वही एक पूरा" : "the same one whole"}</span>
        <i />
        </div>
      <div className="atomic-bar" aria-hidden="true" data-bodh-anchor="whole" data-bodh-obstacle>
        {quarters.map((_, quarterIndex) => (
          <span
            className={`atomic-quarter atomic-quarter-${quarterIndex + 1}`}
            data-bodh-anchor={[
              quarterIndex === 0 ? "unit-quarter" : "",
              quarterIndex < FRACTION_MODEL.selectedQuarters ? "selected-three" : "",
            ].filter(Boolean).join(" ") || undefined}
            key={quarterIndex}
          >
            {Array.from({ length: FRACTION_MODEL.eighthsPerQuarter }).map((__, eighthIndex) => (
              <i
                className="atomic-eighth"
                data-bodh-anchor={[
                  quarterIndex === 0 && eighthIndex === 0 ? "eighth-unit" : "",
                  quarterIndex === 0 && eighthIndex === 1 ? "eighth-seam" : "",
                  quarterIndex < FRACTION_MODEL.selectedQuarters ? "eighth-units" : "",
                ].filter(Boolean).join(" ") || undefined}
                key={eighthIndex}
              >
                {showEighthLabels && quarterIndex < FRACTION_MODEL.selectedQuarters ? <small>1/8</small> : null}
              </i>
            ))}
          </span>
        ))}
      </div>
      <div className="atomic-amount-brace" aria-hidden="true" data-bodh-anchor="amount" data-bodh-obstacle>
        <i /><span>{language === "hi" ? "रँगी मात्रा = 3/4" : "shaded amount = 3/4"}</span>
      </div>
      <div className="atomic-equation" key={`${state}-${language}`} aria-hidden="true">
        <EquationFor state={state} language={language} />
      </div>
      <ArtifactPointer position={pointerPosition} />
      </div>
    </div>
  );
}

function voiceButtonLabel(state: VoiceState, language: NarrationLanguage) {
  if (language === "en") {
    if (state === "loading") return "Stop preparing";
    if (state === "ready") return "Listen now";
    if (state === "playing") return "Pause";
    if (state === "paused") return "Continue";
    if (state === "ended") return "Listen again";
    if (state === "unavailable") return "Try again";
    return "Listen to Bodh";
  }
  if (state === "loading") return "तैयारी रोकें";
  if (state === "ready") return "अब सुनो";
  if (state === "playing") return "रोकें";
  if (state === "paused") return "आगे सुनो";
  if (state === "ended") return "फिर सुनो";
  if (state === "unavailable") return "फिर कोशिश करें";
  return "Bodh से सुनो";
}

function detachPlayerHandlers(player: ActivePlayer) {
  if (player.kind === "audio") {
    player.media.onplaying = null;
    player.media.onended = null;
    player.media.onerror = null;
  } else {
    player.utterance.onstart = null;
    player.utterance.onend = null;
    player.utterance.onerror = null;
  }
}

export function FractionConceptExplainer({ onFinish }: FractionConceptExplainerProps) {
  const language = useNarrationLanguage();
  const [stageIndex, setStageIndex] = useState(0);
  const [proved, setProved] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceSource, setVoiceSource] = useState<VoiceSource>(null);
  const [activeBeatIndex, setActiveBeatIndex] = useState(-1);
  const [hasStartedVoice, setHasStartedVoice] = useState(false);
  const stage = FRACTION_CONCEPT_STAGES[stageIndex];
  const isLastStage = stageIndex === FRACTION_CONCEPT_STAGES.length - 1;
  const visualState = useMemo(() => completedVisualState(stageIndex, proved), [stageIndex, proved]);
  const narration = useMemo(
    () => stage.narration.map((beat) => resolveNarrationBeat(beat, language)),
    [language, stage],
  );
  const activeBeat = activeBeatIndex >= 0 ? narration[activeBeatIndex] ?? null : null;
  const pointerBeat = activeBeat;
  const visibleKey = activeBeat?.key ?? stage.screenKey[language];
  const voiceAnnouncement = voiceState === "loading"
    ? language === "hi"
      ? "Bodh की आवाज़ तैयार हो रही है। तैयार होने पर फिर दबाएँ।"
      : "Bodh's voice is being prepared. Press again when it is ready."
    : voiceState === "ready"
      ? language === "hi"
        ? "Bodh की आवाज़ तैयार है। अब सुनो बटन फिर दबाएँ।"
        : "Bodh's voice is ready. Press Listen now."
      : voiceState === "unavailable"
        ? language === "hi"
          ? "आवाज़ उपलब्ध नहीं है। Bodh की पूरी बात नीचे पढ़ी जा सकती है।"
          : "Audio is unavailable. You can read Bodh's full explanation below."
        : "";

  const runRef = useRef(0);
  const playerRef = useRef<ActivePlayer | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const clipCacheRef = useRef(new Map<string, Promise<string | null>>());
  const objectUrlsRef = useRef(new Set<string>());
  const remoteVoiceAvailableRef = useRef(new Map<string, boolean>());
  const preparedVoiceRef = useRef<PreparedVoice | null>(null);
  const stageIdRef = useRef(`${language}/${stage.id}`);
  const mountedRef = useRef(true);

  const settlePlayer = useCallback((player: ActivePlayer, result: PlaybackResult) => {
    if (playerRef.current !== player || player.run !== runRef.current) return;
    playerRef.current = null;
    detachPlayerHandlers(player);
    player.resolve(result);
  }, []);

  const cancelPlayer = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    playerRef.current = null;
    detachPlayerHandlers(player);
    if (player.kind === "audio") {
      player.media.pause();
      player.media.removeAttribute("src");
      player.media.load();
    } else if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
    player.resolve("cancelled");
  }, []);

  const stopNarration = useCallback(() => {
    runRef.current += 1;
    cancelPlayer();
    setVoiceState("idle");
    setVoiceSource(null);
    setActiveBeatIndex(-1);
  }, [cancelPlayer]);

  const loadClip = useCallback((stageId: string, beatId: string, clipLanguage: NarrationLanguage) => {
    const availabilityKey = `${clipLanguage}/${stageId}`;
    const cacheKey = `${FRACTION_NARRATION_VERSION}/${availabilityKey}/${beatId}`;
    const cached = clipCacheRef.current.get(cacheKey);
    if (cached) return cached;
    if (remoteVoiceAvailableRef.current.get(availabilityKey) === false) return Promise.resolve(null);

    const request = fetch(
      `/api/narration/${FRACTION_NARRATION_VERSION}/${clipLanguage}/${stageId}/${beatId}.mp3`,
      {
        headers: { accept: "audio/mpeg" },
        signal: AbortSignal.timeout(15_000),
      },
    )
      .then(async (response) => {
        if (!response.ok || !/^audio\//i.test(response.headers.get("content-type") || "")) {
          if (response.status === 503) remoteVoiceAvailableRef.current.set(availabilityKey, false);
          clipCacheRef.current.delete(cacheKey);
          return null;
        }
        remoteVoiceAvailableRef.current.set(availabilityKey, true);
        const objectUrl = URL.createObjectURL(await response.blob());
        if (!mountedRef.current) {
          URL.revokeObjectURL(objectUrl);
          return null;
        }
        objectUrlsRef.current.add(objectUrl);
        return objectUrl;
      })
      .catch(() => {
        clipCacheRef.current.delete(cacheKey);
        return null;
      });

    clipCacheRef.current.set(cacheKey, request);
    return request;
  }, []);

  const playAudio = useCallback((url: string, run: number, beatIndex: number) => new Promise<PlaybackResult>((resolve) => {
    if (run !== runRef.current) {
      resolve("cancelled");
      return;
    }

    const media = audioElementRef.current ?? new Audio();
    audioElementRef.current = media;
    media.src = url;
    media.preload = "auto";
    const player: ActivePlayer = { kind: "audio", media, run, resolve };
    playerRef.current = player;
    media.onplaying = () => {
      if (playerRef.current !== player || run !== runRef.current) return;
      setActiveBeatIndex(beatIndex);
      setVoiceSource("openai");
      setVoiceState("playing");
    };
    media.onended = () => settlePlayer(player, "ended");
    media.onerror = () => settlePlayer(player, "failed");

    media.load();
    void media.play()
      .catch(() => settlePlayer(player, "failed"));
  }), [settlePlayer]);

  const playDeviceSpeech = useCallback((
    text: string,
    run: number,
    beatIndex: number,
    speechLanguage: NarrationLanguage,
  ) => new Promise<PlaybackResult>((resolve) => {
    if (run !== runRef.current || typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve(run === runRef.current ? "failed" : "cancelled");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = NARRATION_SPEECH_LOCALE[speechLanguage];
    utterance.rate = 0.88;
    utterance.pitch = 0.96;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith(speechLanguage)) ?? null;
    const player: ActivePlayer = { kind: "speech", utterance, run, resolve };
    playerRef.current = player;
    utterance.onstart = () => {
      if (playerRef.current !== player || run !== runRef.current) return;
      setActiveBeatIndex(beatIndex);
      setVoiceSource("device");
      setVoiceState("playing");
    };
    utterance.onend = () => settlePlayer(player, "ended");
    utterance.onerror = () => settlePlayer(player, "failed");
    window.speechSynthesis.speak(utterance);
  }), [settlePlayer]);

  const playNarration = useCallback(async (prepared: PreparedVoice) => {
    if (prepared.stageId !== stage.id || prepared.language !== language) return;
    const run = runRef.current + 1;
    runRef.current = run;
    cancelPlayer();
    setProved(true);
    setActiveBeatIndex(-1);
    setVoiceSource(prepared.source);
    setVoiceState("loading");
    setHasStartedVoice(true);

    for (let index = 0; index < narration.length; index += 1) {
      if (run !== runRef.current) return;
      const beat = narration[index];
      const result = prepared.source === "openai" && prepared.urls?.[index]
        ? await playAudio(prepared.urls[index], run, index)
        : await playDeviceSpeech(beat.text, run, index, language);
      if (result === "cancelled" || run !== runRef.current) return;
      if (result === "failed") {
        setActiveBeatIndex(-1);
        if (prepared.source === "openai") {
          preparedVoiceRef.current = { stageId: stage.id, language, source: "device" };
          setVoiceSource("device");
          setVoiceState("ready");
        } else {
          setVoiceState("unavailable");
          setVoiceSource(null);
        }
        return;
      }
    }

    if (run === runRef.current) setVoiceState("ended");
  }, [cancelPlayer, language, narration, playAudio, playDeviceSpeech, stage.id]);

  const prepareNarration = useCallback(async () => {
    const run = runRef.current + 1;
    runRef.current = run;
    cancelPlayer();
    setProved(true);
    setActiveBeatIndex(-1);
    setVoiceSource(null);
    setVoiceState("loading");

    const urls = await Promise.all(narration.map((beat) => loadClip(stage.id, beat.id, language)));
    if (run !== runRef.current) return;

    if (urls.every((url): url is string => Boolean(url))) {
      preparedVoiceRef.current = { stageId: stage.id, language, source: "openai", urls };
      setVoiceSource("openai");
    } else {
      preparedVoiceRef.current = { stageId: stage.id, language, source: "device" };
      setVoiceSource("device");
    }
    setVoiceState("ready");
  }, [cancelPlayer, language, loadClip, narration, stage.id]);

  const handleVoiceButton = () => {
    const player = playerRef.current;
    if (voiceState === "loading") {
      stopNarration();
      return;
    }
    if (voiceState === "playing" && player) {
      if (player.kind === "audio") player.media.pause();
      else window.speechSynthesis.pause();
      setVoiceState("paused");
      return;
    }
    if (voiceState === "paused" && player) {
      if (player.kind === "audio") {
        void player.media.play().catch(() => settlePlayer(player, "failed"));
      } else {
        window.speechSynthesis.resume();
        setVoiceState("playing");
      }
      return;
    }

    const prepared = preparedVoiceRef.current?.stageId === stage.id
      && preparedVoiceRef.current.language === language
      ? preparedVoiceRef.current
      : null;
    if (prepared) {
      void playNarration(prepared);
      return;
    }
    const availability = remoteVoiceAvailableRef.current.get(`${language}/${stage.id}`);
    if (availability !== false) {
      void prepareNarration();
      return;
    }

    const deviceVoice: PreparedVoice = { stageId: stage.id, language, source: "device" };
    preparedVoiceRef.current = deviceVoice;
    void playNarration(deviceVoice);
  };

  const replayNarration = () => {
    const prepared = preparedVoiceRef.current?.stageId === stage.id
      && preparedVoiceRef.current.language === language
      ? preparedVoiceRef.current
      : null;
    if (prepared) {
      void playNarration(prepared);
      return;
    }
    void prepareNarration();
  };

  const goBack = () => {
    stopNarration();
    if (proved) {
      setProved(false);
      return;
    }
    if (stageIndex > 0) {
      setStageIndex((current) => current - 1);
      setProved(true);
    }
  };

  const takePrimaryAction = () => {
    stopNarration();
    if (!proved) {
      setProved(true);
      return;
    }
    if (isLastStage) {
      onFinish();
      return;
    }
    setStageIndex((current) => current + 1);
    setProved(false);
  };

  useEffect(() => {
    const playbackKey = `${language}/${stage.id}`;
    stageIdRef.current = playbackKey;
    runRef.current += 1;
    cancelPlayer();
    preparedVoiceRef.current = null;
    const resetFrame = window.requestAnimationFrame(() => {
      if (stageIdRef.current !== playbackKey) return;
      setVoiceState("idle");
      setVoiceSource(null);
      setActiveBeatIndex(-1);
      setHasStartedVoice(false);
    });
    const controller = new AbortController();
    const firstBeat = narration[0];
    const path = `/api/narration/${FRACTION_NARRATION_VERSION}/${language}/${stage.id}/${firstBeat.id}.mp3`;
    void fetch(path, { method: "HEAD", signal: controller.signal })
      .then(async (response) => {
        if (stageIdRef.current !== playbackKey) return;
        if (response.status === 200 && response.headers.get("x-bodh-voice-source") === "static") {
          remoteVoiceAvailableRef.current.set(playbackKey, true);
          const urls = await Promise.all(narration.map((beat) => loadClip(stage.id, beat.id, language)));
          if (stageIdRef.current === playbackKey && urls.every((url): url is string => Boolean(url))) {
            preparedVoiceRef.current = { stageId: stage.id, language, source: "openai", urls };
          }
          return;
        }
        remoteVoiceAvailableRef.current.set(playbackKey, response.status === 200 || response.status === 204);
      })
      .catch(() => {
        if (!controller.signal.aborted && stageIdRef.current === playbackKey) {
          remoteVoiceAvailableRef.current.set(playbackKey, false);
        }
      });
    return () => {
      window.cancelAnimationFrame(resetFrame);
      controller.abort();
    };
  }, [cancelPlayer, language, loadClip, narration, stage.id]);

  useEffect(() => {
    mountedRef.current = true;
    const objectUrls = objectUrlsRef.current;
    return () => {
      mountedRef.current = false;
      runRef.current += 1;
      cancelPlayer();
      audioElementRef.current = null;
      for (const objectUrl of objectUrls) URL.revokeObjectURL(objectUrl);
    };
  }, [cancelPlayer]);

  return (
    <section className="atomic-explainer" aria-label={language === "hi" ? "फ्रैक्शन concept explainer" : "Fraction concept explainer"}>
      <header className="atomic-explainer-header">
        <div className="atomic-motion-note">
          <span aria-hidden="true" />
          <div>
            <strong>{language === "hi" ? "Bodh समझाएगा · चित्र दिखाएगा" : "Bodh explains · the picture responds"}</strong>
            <small>{language === "hi" ? "आवाज़ तभी चलेगी जब तुम दबाओगे" : "Audio starts only when you press play"}</small>
          </div>
        </div>
        <div className="atomic-voice-control">
          <div className="atomic-voice-buttons">
            <button
              className="atomic-play"
              type="button"
              aria-pressed={voiceState === "playing" || voiceState === "paused"}
              aria-describedby="bodh-voice-disclosure"
              onClick={handleVoiceButton}
            >
              <span aria-hidden="true">{voiceState === "playing" ? "Ⅱ" : "▶"}</span>
              {voiceButtonLabel(voiceState, language)}
            </button>
            {hasStartedVoice && voiceState !== "loading" && (
              <button
                className="atomic-replay"
                type="button"
                onClick={replayNarration}
                aria-label={language === "hi" ? "पूरी explanation शुरू से फिर सुनें" : "Replay the full explanation from the beginning"}
              >
                <span aria-hidden="true">↻</span>
                {language === "hi" ? "शुरू से फिर सुनें" : "Replay from start"}
              </button>
            )}
          </div>
          <small id="bodh-voice-disclosure">
            {language === "hi" ? "AI से बनी Bodh की आवाज़ · इंसान की recording नहीं" : "Bodh uses an AI-generated voice · not a human recording"}
          </small>
        </div>
        <span className="atomic-voice-announcement" role="status" aria-live="polite" aria-atomic="true">
          {voiceAnnouncement}
        </span>
      </header>

      <ol className="atomic-progress" aria-label={`${language === "hi" ? "Concept बात" : "Concept step"} ${stageIndex + 1} ${language === "hi" ? "में से" : "of"} ${FRACTION_CONCEPT_STAGES.length}`}>
        {FRACTION_CONCEPT_STAGES.map((conceptStage, index) => {
          const state = index < stageIndex || (index === stageIndex && proved)
            ? "complete"
            : index === stageIndex
              ? "active"
              : "future";
          return <li className={`atomic-progress-${state}`} key={conceptStage.id}><span>{index + 1}</span></li>;
        })}
      </ol>

      <div className="atomic-explainer-grid">
        <div className="atomic-stage-copy">
          <span className="atomic-step-count">{language === "hi" ? "बात" : "IDEA"} {stageIndex + 1} / {FRACTION_CONCEPT_STAGES.length}</span>
          <p className="atomic-eyebrow">{stage.eyebrow[language]}</p>
          <h2>{stage.title[language]}</h2>
          <p className="atomic-key-copy" aria-live="polite">{visibleKey}</p>
          <div className="atomic-speaking-line">
            <span className={voiceState === "playing" ? "atomic-wave-active" : ""} aria-hidden="true">•••</span>
            <small>
              {voiceState === "loading"
                ? language === "hi" ? "Bodh की आवाज़ तैयार हो रही है… तैयार होने पर फिर दबाओ" : "Bodh's voice is being prepared… press again when ready"
                : voiceState === "ready"
                  ? voiceSource === "openai"
                    ? language === "hi" ? "शांत AI आवाज़ तैयार है—अब सुनो दबाओ" : "The calm AI voice is ready—press Listen now"
                    : language === "hi" ? "इस डिवाइस की आवाज़ तैयार है—अब सुनो दबाओ" : "This device's voice is ready—press Listen now"
                : voiceState === "playing"
                  ? language === "hi" ? `Bodh समझा रहा है · ${activeBeatIndex + 1}/${narration.length}` : `Bodh is explaining · ${activeBeatIndex + 1}/${narration.length}`
                  : voiceState === "paused"
                    ? language === "hi" ? "यहीं रुका है—जब चाहो आगे सुनो" : "Paused here—continue when you are ready"
                    : voiceState === "unavailable"
                      ? language === "hi" ? "आवाज़ नहीं चली—नीचे पूरी बात पढ़ सकते हो" : "Audio did not play—you can read the full explanation below"
                      : voiceSource === "device"
                        ? language === "hi" ? "इस डिवाइस की आवाज़ इस्तेमाल हुई" : "This device's voice was used"
                        : language === "hi" ? "Bodh से सुनो, या चित्र खुद चलाओ" : "Listen to Bodh, or explore the picture yourself"}
            </small>
          </div>
          <details className="atomic-transcript" open={voiceState === "unavailable" || undefined}>
            <summary>{language === "hi" ? "Bodh की पूरी बात पढ़ें" : "Read Bodh's full explanation"}</summary>
            <div>
              {narration.map((beat) => <p key={beat.id}>{beat.text}</p>)}
            </div>
          </details>
          <div className={`atomic-evidence ${proved ? "atomic-evidence-earned" : ""}`}>
            <span aria-hidden="true">{proved ? "✓" : "○"}</span>
            <div>
              <small>{proved
                ? language === "hi" ? "तुमने चित्र में देखा" : "You saw it in the picture"
                : language === "hi" ? "पहले चित्र पर यह करके देखो" : "First, do this on the picture"}</small>
              <strong>{proved ? stage.evidence[language] : stage.action[language]}</strong>
            </div>
          </div>
        </div>

        <FractionArtifact state={visualState} beat={pointerBeat} language={language} />
      </div>

      <footer className="atomic-actions">
        <button className="atomic-back" type="button" onClick={goBack} disabled={stageIndex === 0 && !proved}>
          <span aria-hidden="true">←</span> {language === "hi" ? "पीछे" : "Back"}
        </button>
        {(voiceState === "playing" || voiceState === "paused" || voiceState === "loading") && (
          <span className="atomic-playing-status">
            {voiceState === "paused"
              ? language === "hi" ? "Bodh यहीं रुका है" : "Bodh is paused here"
              : language === "hi" ? "आवाज़ और इशारा साथ चल रहे हैं" : "Voice and pointer are moving together"}
          </span>
        )}
        <button className="button button-primary atomic-primary" type="button" onClick={takePrimaryAction}>
          {!proved
            ? stage.action[language]
            : isLastStage
              ? language === "hi" ? "अब खुद बनाकर देखें" : "Now build it yourself"
              : language === "hi" ? "अगली बात" : "Next idea"}
          <span aria-hidden="true">→</span>
        </button>
      </footer>
    </section>
  );
}
