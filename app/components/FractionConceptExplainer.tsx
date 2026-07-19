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
import { selectStableSpeechVoice } from "../../lib/narration-voice";
import { useNarrationLanguage } from "./NarrationLanguageToggle";
import { LessonClimb } from "./CurriculumClimb";

export type FractionConceptStageId = (typeof FRACTION_CONCEPT_STAGES)[number]["id"];

type FractionConceptExplainerProps = {
  onFinish: () => void;
  initialStageId?: FractionConceptStageId;
  onStageEvidence?: (stageId: FractionConceptStageId) => void;
};

type VoiceState = "idle" | "loading" | "ready" | "playing" | "paused" | "ended" | "unavailable";
type VoiceSource = "openai" | "device" | null;
type PlaybackResult = "ended" | "failed" | "cancelled";
type ActivePlayer =
  | { kind: "audio"; media: HTMLAudioElement; run: number; resolve: (result: PlaybackResult) => void; cancelStartup: () => void }
  | { kind: "speech"; utterance: SpeechSynthesisUtterance; run: number; resolve: (result: PlaybackResult) => void; cancelStartup: () => void };
type PreparedVoice =
  | { stageId: FractionConceptStageId; language: NarrationLanguage; source: "openai"; urls: string[] }
  | { stageId: FractionConceptStageId; language: NarrationLanguage; source: "device"; voice: SpeechSynthesisVoice };
type VoiceSession =
  | { language: NarrationLanguage; source: "openai" }
  | { language: NarrationLanguage; source: "device"; voice: SpeechSynthesisVoice; voiceURI: string };
type PointerPosition = { x: number; y: number; side: "top" | "right" | "bottom" | "left" };
type ProgressState = "not-repeated" | "complete" | "active" | "future";

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
    if (state === "loading") return "Preparing Bodh…";
    if (state === "ready") return "Listen now";
    if (state === "playing") return "Pause";
    if (state === "paused") return "Continue";
    if (state === "ended") return "Listen again";
    if (state === "unavailable") return "Try again";
    return "Listen to Bodh";
  }
  if (state === "loading") return "Bodh तैयार हो रहा है…";
  if (state === "ready") return "अब सुनो";
  if (state === "playing") return "रोकें";
  if (state === "paused") return "आगे सुनो";
  if (state === "ended") return "फिर सुनो";
  if (state === "unavailable") return "फिर कोशिश करें";
  return "Bodh से सुनो";
}

function detachPlayerHandlers(player: ActivePlayer) {
  player.cancelStartup();
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

function initialIndexFor(stageId: FractionConceptStageId | undefined) {
  if (!stageId) return 0;
  const index = FRACTION_CONCEPT_STAGES.findIndex((stage) => stage.id === stageId);
  return index >= 0 ? index : 0;
}

function progressLabel(
  state: ProgressState,
  index: number,
  language: NarrationLanguage,
) {
  const number = index + 1;
  if (language === "hi") {
    if (state === "not-repeated") return `बात ${number}: इस रास्ते में दोहराई नहीं गई; पूरी journey में review उपलब्ध है`;
    if (state === "complete") return `बात ${number}: evidence के साथ पूरी हुई`;
    if (state === "active") return `बात ${number}: अभी चल रही है`;
    return `बात ${number}: आगे आएगी`;
  }
  if (state === "not-repeated") return `Concept step ${number}: not repeated on this route; review is available in the full journey`;
  if (state === "complete") return `Concept step ${number}: completed with evidence`;
  if (state === "active") return `Concept step ${number}: current`;
  return `Concept step ${number}: upcoming`;
}

export function FractionConceptExplainer({
  onFinish,
  initialStageId,
  onStageEvidence,
}: FractionConceptExplainerProps) {
  const language = useNarrationLanguage();
  const [entryStageIndex] = useState(() => initialIndexFor(initialStageId));
  const [stageIndex, setStageIndex] = useState(entryStageIndex);
  const [proved, setProved] = useState(false);
  const [evidencedStageIds, setEvidencedStageIds] = useState<ReadonlySet<FractionConceptStageId>>(
    () => new Set(),
  );
  const [voiceState, setVoiceState] = useState<VoiceState>("loading");
  const [voiceSource, setVoiceSource] = useState<VoiceSource>(null);
  const [activeBeatIndex, setActiveBeatIndex] = useState(-1);
  const [hasStartedVoice, setHasStartedVoice] = useState(false);
  const [voiceVisualActive, setVoiceVisualActive] = useState(false);
  const stage = FRACTION_CONCEPT_STAGES[stageIndex];
  const isLastStage = stageIndex === FRACTION_CONCEPT_STAGES.length - 1;
  const visualState = useMemo(
    () => completedVisualState(stageIndex, proved || voiceVisualActive),
    [proved, stageIndex, voiceVisualActive],
  );
  const narration = useMemo(
    () => stage.narration.map((beat) => resolveNarrationBeat(beat, language)),
    [language, stage],
  );
  const activeBeat = activeBeatIndex >= 0 ? narration[activeBeatIndex] ?? null : null;
  const pointerBeat = activeBeat;
  const visibleKey = activeBeat?.key ?? stage.screenKey[language];
  const voiceAnnouncement = voiceState === "loading"
    ? language === "hi"
      ? "Bodh की आवाज़ अपने आप तैयार हो रही है। तैयार होते ही अब सुनो बटन चमकेगा।"
      : "Bodh's voice is being prepared automatically. The Listen now button will light up when ready."
    : voiceState === "ready"
      ? language === "hi"
        ? "Bodh की आवाज़ तैयार है। एक बार अब सुनो दबाएँ।"
        : "Bodh's voice is ready. Press Listen now once."
      : voiceState === "unavailable"
        ? language === "hi"
          ? "Bodh ने अपनी आवाज़ नहीं बदली। फिर कोशिश करें, या पूरी बात नीचे पढ़ें।"
          : "Bodh kept the same voice. Try again, or read the full explanation below."
        : "";

  const runRef = useRef(0);
  const playerRef = useRef<ActivePlayer | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const clipCacheRef = useRef(new Map<string, Promise<string | null>>());
  const objectUrlsRef = useRef(new Set<string>());
  const voiceSessionRef = useRef<VoiceSession | null>(null);
  const preparedVoiceRef = useRef<PreparedVoice | null>(null);
  const preparationAbortRef = useRef<AbortController | null>(null);
  const stageIdRef = useRef(`${language}/${stage.id}`);
  const mountedRef = useRef(true);
  const reportedEvidenceRef = useRef(new Set<FractionConceptStageId>());
  const stageHeadingRef = useRef<HTMLHeadingElement>(null);

  const markStageEvidence = useCallback((stageId: FractionConceptStageId) => {
    if (reportedEvidenceRef.current.has(stageId)) return;
    reportedEvidenceRef.current.add(stageId);
    setEvidencedStageIds((current) => {
      const next = new Set(current);
      next.add(stageId);
      return next;
    });
    onStageEvidence?.(stageId);
  }, [onStageEvidence]);

  const settlePlayer = useCallback((player: ActivePlayer, result: PlaybackResult) => {
    if (playerRef.current !== player || player.run !== runRef.current) return;
    playerRef.current = null;
    detachPlayerHandlers(player);
    if (result === "failed") {
      if (player.kind === "audio") {
        player.media.pause();
        player.media.removeAttribute("src");
        player.media.load();
      } else if (typeof window !== "undefined") {
        window.speechSynthesis?.cancel();
      }
    }
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
    preparationAbortRef.current?.abort();
    preparationAbortRef.current = null;
    cancelPlayer();
    setVoiceState("idle");
    setVoiceSource(null);
    setActiveBeatIndex(-1);
    setVoiceVisualActive(false);
  }, [cancelPlayer]);

  const clearRemoteClipCache = useCallback(() => {
    clipCacheRef.current.clear();
    for (const objectUrl of objectUrlsRef.current) URL.revokeObjectURL(objectUrl);
    objectUrlsRef.current.clear();
  }, []);

  const loadClip = useCallback((
    stageId: string,
    beatId: string,
    clipLanguage: NarrationLanguage,
    preparationSignal?: AbortSignal,
  ) => {
    const availabilityKey = `${clipLanguage}/${stageId}`;
    const cacheKey = `${FRACTION_NARRATION_VERSION}/${availabilityKey}/${beatId}`;
    const cached = clipCacheRef.current.get(cacheKey);
    if (cached) return cached;

    const requestController = new AbortController();
    const abortFromPreparation = () => requestController.abort();
    if (preparationSignal?.aborted) requestController.abort();
    else preparationSignal?.addEventListener("abort", abortFromPreparation, { once: true });
    const timeout = window.setTimeout(() => requestController.abort(), 25_000);

    const request = fetch(
      `/api/narration/${FRACTION_NARRATION_VERSION}/${clipLanguage}/${stageId}/${beatId}.mp3`,
      {
        headers: { accept: "audio/mpeg" },
        signal: requestController.signal,
      },
    )
      .then(async (response) => {
        if (!response.ok || !/^audio\//i.test(response.headers.get("content-type") || "")) {
          clipCacheRef.current.delete(cacheKey);
          return null;
        }
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
      })
      .finally(() => {
        window.clearTimeout(timeout);
        preparationSignal?.removeEventListener("abort", abortFromPreparation);
      });

    clipCacheRef.current.set(cacheKey, request);
    return request;
  }, []);

  const resolveDeviceVoice = useCallback((
    speechLanguage: NarrationLanguage,
    signal: AbortSignal,
  ) => new Promise<SpeechSynthesisVoice | null>((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || signal.aborted) {
      resolve(null);
      return;
    }

    const synth = window.speechSynthesis;
    const choose = () => selectStableSpeechVoice(synth.getVoices(), NARRATION_SPEECH_LOCALE[speechLanguage]);
    const immediate = choose();
    if (immediate) {
      resolve(immediate);
      return;
    }

    let timer = 0;
    let finished = false;
    const finish = (voice: SpeechSynthesisVoice | null) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      synth.removeEventListener("voiceschanged", onVoicesChanged);
      signal.removeEventListener("abort", onAbort);
      resolve(voice);
    };
    const onVoicesChanged = () => {
      const voice = choose();
      if (voice) finish(voice);
    };
    const onAbort = () => finish(null);
    synth.addEventListener("voiceschanged", onVoicesChanged);
    signal.addEventListener("abort", onAbort, { once: true });
    timer = window.setTimeout(() => finish(choose()), 1_500);
  }), []);

  const playAudio = useCallback((url: string, run: number, beatIndex: number) => new Promise<PlaybackResult>((resolve) => {
    if (run !== runRef.current) {
      resolve("cancelled");
      return;
    }

    const media = audioElementRef.current ?? new Audio();
    audioElementRef.current = media;
    media.src = url;
    media.preload = "auto";
    let startupTimer = 0;
    const player: ActivePlayer = {
      kind: "audio",
      media,
      run,
      resolve,
      cancelStartup: () => window.clearTimeout(startupTimer),
    };
    startupTimer = window.setTimeout(() => settlePlayer(player, "failed"), 8_000);
    playerRef.current = player;
    media.onplaying = () => {
      if (playerRef.current !== player || run !== runRef.current) return;
      player.cancelStartup();
      setActiveBeatIndex(beatIndex);
      setVoiceSource("openai");
      setVoiceState("playing");
      setHasStartedVoice(true);
      setVoiceVisualActive(true);
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
    voice: SpeechSynthesisVoice,
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
    utterance.voice = voice;
    let startupTimer = 0;
    const player: ActivePlayer = {
      kind: "speech",
      utterance,
      run,
      resolve,
      cancelStartup: () => window.clearTimeout(startupTimer),
    };
    startupTimer = window.setTimeout(() => settlePlayer(player, "failed"), 8_000);
    playerRef.current = player;
    utterance.onstart = () => {
      if (playerRef.current !== player || run !== runRef.current) return;
      player.cancelStartup();
      setActiveBeatIndex(beatIndex);
      setVoiceSource("device");
      setVoiceState("playing");
      setHasStartedVoice(true);
      setVoiceVisualActive(true);
    };
    utterance.onend = () => settlePlayer(player, "ended");
    utterance.onerror = () => settlePlayer(player, "failed");
    window.speechSynthesis.speak(utterance);
  }), [settlePlayer]);

  const playNarration = useCallback(async (prepared: PreparedVoice) => {
    if (prepared.stageId !== stage.id || prepared.language !== language) return;
    const run = runRef.current + 1;
    runRef.current = run;
    preparationAbortRef.current?.abort();
    preparationAbortRef.current = null;
    cancelPlayer();
    setActiveBeatIndex(-1);
    setVoiceSource(prepared.source);
    setVoiceState("loading");

    for (let index = 0; index < narration.length; index += 1) {
      if (run !== runRef.current) return;
      const beat = narration[index];
      const result = prepared.source === "openai"
        ? await playAudio(prepared.urls[index], run, index)
        : await playDeviceSpeech(beat.text, run, index, language, prepared.voice);
      if (result === "cancelled" || run !== runRef.current) return;
      if (result === "failed") {
        setActiveBeatIndex(-1);
        preparedVoiceRef.current = null;
        if (prepared.source === "openai") clearRemoteClipCache();
        setVoiceSource(prepared.source);
        setVoiceState("unavailable");
        return;
      }
    }

    if (run === runRef.current) {
      setVoiceState("ended");
    }
  }, [cancelPlayer, clearRemoteClipCache, language, narration, playAudio, playDeviceSpeech, stage.id]);

  const prepareNarration = useCallback(async () => {
    preparationAbortRef.current?.abort();
    const controller = new AbortController();
    preparationAbortRef.current = controller;
    const run = runRef.current + 1;
    runRef.current = run;
    cancelPlayer();
    setActiveBeatIndex(-1);
    setVoiceSource(null);
    setVoiceState("loading");

    const currentSession = voiceSessionRef.current?.language === language
      ? voiceSessionRef.current
      : null;
    if (!currentSession) voiceSessionRef.current = null;

    if (currentSession?.source === "device") {
      preparedVoiceRef.current = {
        stageId: stage.id,
        language,
        source: "device",
        voice: currentSession.voice,
      };
      if (preparationAbortRef.current === controller) preparationAbortRef.current = null;
      setVoiceSource("device");
      setVoiceState("ready");
      return;
    }

    const urls = await Promise.all(narration.map((beat) => loadClip(
      stage.id,
      beat.id,
      language,
      controller.signal,
    )));
    if (controller.signal.aborted || run !== runRef.current) return;

    if (urls.every((url): url is string => Boolean(url))) {
      voiceSessionRef.current = currentSession ?? { language, source: "openai" };
      preparedVoiceRef.current = { stageId: stage.id, language, source: "openai", urls };
      setVoiceSource("openai");
      setVoiceState("ready");
    } else if (currentSession?.source === "openai") {
      preparedVoiceRef.current = null;
      setVoiceSource("openai");
      setVoiceState("unavailable");
    } else {
      const deviceVoice = await resolveDeviceVoice(language, controller.signal);
      if (controller.signal.aborted || run !== runRef.current) return;
      if (deviceVoice) {
        voiceSessionRef.current = {
          language,
          source: "device",
          voice: deviceVoice,
          voiceURI: deviceVoice.voiceURI,
        };
        preparedVoiceRef.current = { stageId: stage.id, language, source: "device", voice: deviceVoice };
        setVoiceSource("device");
        setVoiceState("ready");
      } else {
        preparedVoiceRef.current = null;
        setVoiceSource(null);
        setVoiceState("unavailable");
      }
    }
    if (preparationAbortRef.current === controller) preparationAbortRef.current = null;
  }, [cancelPlayer, language, loadClip, narration, resolveDeviceVoice, stage.id]);

  const handleVoiceButton = () => {
    const player = playerRef.current;
    if (voiceState === "loading") return;
    if (voiceState === "unavailable") {
      void prepareNarration();
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

    void prepareNarration();
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
    if (stageIndex > entryStageIndex) {
      setStageIndex((current) => current - 1);
      setProved(true);
    }
  };

  const takePrimaryAction = () => {
    stopNarration();
    if (!proved) {
      markStageEvidence(stage.id);
      setProved(true);
      return;
    }
    markStageEvidence(stage.id);
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
    if (voiceSessionRef.current?.language !== language) voiceSessionRef.current = null;
    runRef.current += 1;
    preparationAbortRef.current?.abort();
    preparationAbortRef.current = null;
    cancelPlayer();
    preparedVoiceRef.current = null;
    const prepareFrame = window.requestAnimationFrame(() => {
      if (stageIdRef.current !== playbackKey) return;
      setHasStartedVoice(false);
      setVoiceVisualActive(false);
      void prepareNarration();
    });
    return () => {
      window.cancelAnimationFrame(prepareFrame);
      preparationAbortRef.current?.abort();
      preparationAbortRef.current = null;
      runRef.current += 1;
      cancelPlayer();
    };
  }, [cancelPlayer, language, prepareNarration, stage.id]);

  useEffect(() => {
    const focusFrame = window.requestAnimationFrame(() => {
      const heading = stageHeadingRef.current;
      heading?.focus({ preventScroll: true });
      const headingBounds = heading?.getBoundingClientRect();
      if (heading && headingBounds && (headingBounds.top < 96 || headingBounds.bottom > window.innerHeight - 48)) {
        heading.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start",
        });
      }
    });
    return () => window.cancelAnimationFrame(focusFrame);
  }, [stage.id]);

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
    <section
      className="atomic-explainer"
      aria-label={language === "hi" ? "फ्रैक्शन concept explainer" : "Fraction concept explainer"}
      lang={language}
    >
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
              className={`atomic-play ${voiceState === "ready" ? "atomic-play-ready" : ""}`}
              type="button"
              aria-pressed={voiceState === "playing" || voiceState === "paused"}
              aria-busy={voiceState === "loading"}
              aria-describedby="bodh-voice-disclosure"
              disabled={voiceState === "loading"}
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
          const state: ProgressState = index < entryStageIndex
            ? "not-repeated"
            : evidencedStageIds.has(conceptStage.id)
              ? "complete"
              : index === stageIndex
                ? "active"
                : "future";
          const isCurrent = index === stageIndex;
          return (
            <li
              className={`${state === "complete" && isCurrent ? "atomic-progress-active " : ""}atomic-progress-${state}`}
              data-progress-state={state}
              aria-current={isCurrent ? "step" : undefined}
              aria-label={progressLabel(state, index, language)}
              title={progressLabel(state, index, language)}
              key={conceptStage.id}
            >
              <span aria-hidden="true">{state === "not-repeated" ? "↺" : index + 1}</span>
            </li>
          );
        })}
      </ol>

      <LessonClimb stageIndex={stageIndex} language={language} />

      <div className="atomic-explainer-grid">
        <div className="atomic-stage-copy">
          <span className="atomic-step-count">{language === "hi" ? "बात" : "IDEA"} {stageIndex + 1} / {FRACTION_CONCEPT_STAGES.length}</span>
          <p className="atomic-eyebrow">{stage.eyebrow[language]}</p>
          <h2 ref={stageHeadingRef} tabIndex={-1}>{stage.title[language]}</h2>
          <p className="atomic-key-copy" aria-live="polite">{visibleKey}</p>
          <div className="atomic-speaking-line">
            <span className={voiceState === "playing" ? "atomic-wave-active" : ""} aria-hidden="true">•••</span>
            <small>
              {voiceState === "loading"
                ? language === "hi" ? "Bodh की आवाज़ अपने आप तैयार हो रही है…" : "Bodh's voice is getting ready automatically…"
                : voiceState === "ready"
                  ? voiceSource === "openai"
                    ? language === "hi" ? "शांत AI आवाज़ तैयार है—एक बार अब सुनो दबाओ" : "The calm AI voice is ready—press Listen now once"
                    : language === "hi" ? "इस डिवाइस की आवाज़ तैयार है—एक बार अब सुनो दबाओ" : "This device's voice is ready—press Listen now once"
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
        <button
          className="atomic-back"
          type="button"
          onClick={goBack}
          disabled={stageIndex === entryStageIndex && !proved}
        >
          <span aria-hidden="true">←</span> {language === "hi" ? "पीछे" : "Back"}
        </button>
        {(voiceState === "playing" || voiceState === "paused" || voiceState === "loading") && (
          <span className="atomic-playing-status">
            {voiceState === "paused"
              ? language === "hi" ? "Bodh यहीं रुका है" : "Bodh is paused here"
              : voiceState === "loading" && !hasStartedVoice
                ? language === "hi" ? "Bodh की आवाज़ तैयार हो रही है" : "Bodh's voice is getting ready"
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
