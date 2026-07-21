"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type Ref,
} from "react";
import {
  EVAPORATION_CONCEPT_STAGES,
  EVAPORATION_NARRATION_VERSION,
  type EvaporationCueTarget,
} from "../../../lib/evaporation-concept";
import type { NarrationLanguage } from "../../../lib/narration-language";
import {
  parseSeedJourneyHandoff,
  SEEDED_JOURNEY_STORAGE_KEY,
  type SeedJourneyHandoff,
} from "../../../lib/seeded-journey";
import { createEvaporationReceiptCardModel } from "../../../lib/receipt-card";
import { BodhMark } from "../../components/BodhMark";
import { EvaporationCurriculumClimb } from "../../components/EvaporationCurriculumClimb";
import {
  NarrationLanguageToggle,
  useNarrationLanguage,
} from "../../components/NarrationLanguageToggle";
import { ReceiptImageCard } from "../../components/ReceiptImageCard";
import styles from "./EvaporationJourney.module.css";

type AudioState = "preparing" | "ready" | "playing" | "unavailable";
type ProbeChoice = "moved" | "destroyed" | "underground";
type TransferChoice = "moved-cooled" | "new-water" | "destroyed-unrelated" | "underground";
type LessonMode = Readonly<{
  live: boolean;
  requestedLive: boolean;
  handoff: SeedJourneyHandoff | null;
}>;

type PreparedClip = Readonly<{
  beatId: string;
  src: string;
}>;

const noopSubscribe = () => () => undefined;
const browserHydrated = () => true;
const serverHydrated = () => false;

const PROBE_OPTIONS: ReadonlyArray<Readonly<{
  id: ProbeChoice;
  icon: string;
  hi: string;
  en: string;
  correct: boolean;
}>> = [
  {
    id: "moved",
    icon: "↗",
    hi: "पानी invisible vapour बनकर हवा में गया",
    en: "The water moved into the air as invisible vapour",
    correct: true,
  },
  {
    id: "destroyed",
    icon: "☀",
    hi: "Sun ने पानी खत्म कर दिया",
    en: "The Sun destroyed the water",
    correct: false,
  },
  {
    id: "underground",
    icon: "↓",
    hi: "सारा पानी liquid रहकर जमीन के नीचे गया",
    en: "All the water stayed liquid and went underground",
    correct: false,
  },
];

const TRANSFER_OPTIONS: ReadonlyArray<Readonly<{
  id: TransferChoice;
  icon: string;
  hi: string;
  en: string;
  correct: boolean;
}>> = [
  {
    id: "moved-cooled",
    icon: "↗ · ❄ · ●",
    hi: "Puddle का पानी हवा में गया, फिर cold lid पर cool होकर liquid drops बना",
    en: "Puddle water moved into the air, then cooled into liquid drops on the cold lid",
    correct: true,
  },
  {
    id: "new-water",
    icon: "＋ ●",
    hi: "Cold lid ने नया पानी बना दिया",
    en: "The cold lid made brand-new water",
    correct: false,
  },
  {
    id: "destroyed-unrelated",
    icon: "☀ × · ?",
    hi: "Sun ने puddle खत्म किया; lid की drops उससे अलग हैं",
    en: "The Sun destroyed the puddle; the lid drops are unrelated",
    correct: false,
  },
  {
    id: "underground",
    icon: "↓",
    hi: "सारा puddle-water जमीन के नीचे ही रहा",
    en: "All the puddle water stayed underground",
    correct: false,
  },
];

function lessonMode(): LessonMode {
  const query = new URLSearchParams(window.location.search);
  const requestedLive = query.get("live") === "seed-09";
  if (!requestedLive) return { live: false, requestedLive: false, handoff: null };

  try {
    const handoff = parseSeedJourneyHandoff(window.sessionStorage.getItem(SEEDED_JOURNEY_STORAGE_KEY));
    if (handoff?.seedId === "seed-09" && handoff.source === "openai") {
      return { live: true, requestedLive: true, handoff };
    }
  } catch {
    // A missing or unavailable session becomes the reviewed curated journey.
  }
  return { live: false, requestedLive: true, handoff: null };
}

function narrationUrl(language: NarrationLanguage, stageId: string, beatId: string) {
  return `/api/narration/${EVAPORATION_NARRATION_VERSION}/${language}/${stageId}/${beatId}.mp3`;
}

function probeChoiceFromHandoff(handoff: SeedJourneyHandoff | null): ProbeChoice | null {
  if (!handoff) return null;
  const carriedChoices: Readonly<Record<string, ProbeChoice>> = {
    "water-invisible-vapour": "moved",
    "water-destroyed-by-sun": "destroyed",
    "water-only-underground": "underground",
  };
  return carriedChoices[handoff.optionId] ?? null;
}

function useEvaporationNarration(stageIndex: number, language: NarrationLanguage) {
  const stage = EVAPORATION_CONCEPT_STAGES[stageIndex];
  const [state, setState] = useState<AudioState>("preparing");
  const [activeBeatIndex, setActiveBeatIndex] = useState(-1);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const clipsRef = useRef<PreparedClip[]>([]);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const playbackTokenRef = useRef(0);

  const haltPlayer = useCallback(() => {
    playbackTokenRef.current += 1;
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current.removeAttribute("src");
      playerRef.current.load();
      playerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    haltPlayer();
    setActiveBeatIndex(-1);
    setState((current) => current === "playing" ? "ready" : current);
  }, [haltPlayer]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const objectUrls: string[] = [];

    haltPlayer();
    clipsRef.current = [];
    queueMicrotask(() => {
      if (cancelled) return;
      setActiveBeatIndex(-1);
      setHasPlayed(false);
      setState("preparing");
    });

    Promise.all(stage.narration.map(async (beat) => {
      const response = await fetch(narrationUrl(language, stage.id, beat.id), {
        method: "GET",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("narration_unavailable");
      const blob = await response.blob();
      if (!blob.type.startsWith("audio/") || blob.size === 0) throw new Error("invalid_narration");
      const src = URL.createObjectURL(blob);
      objectUrls.push(src);
      return { beatId: beat.id, src };
    })).then((clips) => {
      if (cancelled) return;
      clipsRef.current = clips;
      setState("ready");
    }).catch((error: unknown) => {
      if (cancelled || (error instanceof DOMException && error.name === "AbortError")) return;
      clipsRef.current = [];
      setState("unavailable");
    });

    return () => {
      cancelled = true;
      controller.abort();
      haltPlayer();
      for (const url of objectUrls) URL.revokeObjectURL(url);
    };
  }, [haltPlayer, language, retryKey, stage]);

  const play = useCallback(async () => {
    if (state === "unavailable") {
      setRetryKey((value) => value + 1);
      return;
    }
    if (state !== "ready" || clipsRef.current.length !== stage.narration.length) return;

    stop();
    const token = playbackTokenRef.current;
    setState("playing");
    setHasPlayed(true);

    for (let index = 0; index < clipsRef.current.length; index += 1) {
      if (token !== playbackTokenRef.current) return;
      setActiveBeatIndex(index);
      const clip = clipsRef.current[index];
      const audio = new Audio(clip.src);
      playerRef.current = audio;
      try {
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error("narration_playback_failed"));
          void audio.play().catch(reject);
        });
      } catch {
        if (token === playbackTokenRef.current) {
          setActiveBeatIndex(-1);
          setState("unavailable");
        }
        return;
      }
    }

    if (token === playbackTokenRef.current) {
      playerRef.current = null;
      setActiveBeatIndex(-1);
      setState("ready");
    }
  }, [stage.narration.length, state, stop]);

  const activeBeat = activeBeatIndex >= 0 ? stage.narration[activeBeatIndex] : null;
  return {
    state,
    activeBeat,
    activeBeatIndex,
    hasPlayed,
    play,
    stop,
    beatCount: stage.narration.length,
  };
}

function NarrationControl({
  language,
  state,
  activeBeatIndex,
  beatCount,
  hasPlayed,
  onPlay,
  onStop,
}: {
  language: NarrationLanguage;
  state: AudioState;
  activeBeatIndex: number;
  beatCount: number;
  hasPlayed: boolean;
  onPlay: () => void;
  onStop: () => void;
}) {
  const label = state === "preparing"
    ? language === "hi" ? "Bodh की calm voice तैयार हो रही है…" : "Preparing Bodh's calm voice…"
    : state === "playing"
      ? language === "hi" ? `Bodh समझा रहा है · ${activeBeatIndex + 1}/${beatCount} · रोकें` : `Bodh is explaining · ${activeBeatIndex + 1}/${beatCount} · stop`
      : state === "unavailable"
        ? language === "hi" ? "Studio voice नहीं मिली · फिर कोशिश करें" : "Studio voice unavailable · try again"
        : hasPlayed
          ? language === "hi" ? "फिर से सुनें" : "Replay explanation"
          : language === "hi" ? "यह idea सुनें" : "Listen to this idea";

  return (
    <div className={styles.narrationControl}>
      <button
        className={`${styles.listenButton} ${state === "ready" && !hasPlayed ? styles.listenReady : ""}`}
        type="button"
        onClick={state === "playing" ? onStop : onPlay}
        disabled={state === "preparing"}
        aria-label={label}
      >
        <span className={styles.soundGlyph} aria-hidden="true"><i /><i /><i /></span>
        <strong>{label}</strong>
      </button>
      <small>{language === "hi"
        ? "Reviewed OpenAI studio voice · device voice fallback नहीं"
        : "Reviewed OpenAI studio voice · no device-voice fallback"}</small>
    </div>
  );
}

function targetClass(activeTarget: EvaporationCueTarget | null, targets: readonly EvaporationCueTarget[]) {
  return activeTarget && targets.includes(activeTarget) ? styles.targetActive : "";
}

function WaterCycleScene({
  stageIndex,
  activeTarget,
  cueText,
  language,
}: {
  stageIndex: number;
  activeTarget: EvaporationCueTarget | null;
  cueText: string | null;
  language: NarrationLanguage;
}) {
  const ledger = [
    { liquid: 12, air: 0, cloud: 0 },
    { liquid: 10, air: 2, cloud: 0 },
    { liquid: 5, air: 7, cloud: 0 },
    { liquid: 3, air: 3, cloud: 6 },
    { liquid: 10, air: 1, cloud: 1 },
  ][stageIndex];

  return (
    <div className={styles.sceneShell}>
      <div className={styles.scene} data-stage={stageIndex}>
        <div className={styles.skyWash} aria-hidden="true" />
        <div className={`${styles.sun} ${targetClass(activeTarget, ["sun"])}`} aria-label={language === "hi" ? "Sunlight puddle को energy देती है" : "Sunlight transfers energy to the puddle"}>
          <span aria-hidden="true" />
        </div>
        <div className={`${styles.coolAir} ${targetClass(activeTarget, ["cool-air"])}`} aria-hidden="true">
          <i>❄</i><i>❄</i><i>❄</i>
        </div>
        <div className={`${styles.cloud} ${targetClass(activeTarget, ["droplets", "cloud"])}`} aria-label={language === "hi" ? "Cloud: tiny liquid water droplets" : "Cloud: tiny liquid water droplets"}>
          <i /><i /><i /><span>{language === "hi" ? "tiny liquid drops" : "tiny liquid drops"}</span>
        </div>
        <div className={`${styles.tracker} ${targetClass(activeTarget, ["vapour-tracker", "invisible-note"])}`} aria-label={language === "hi" ? "Bodh tracker invisible water vapour की imagined path दिखाता है" : "Bodh's tracker represents the imagined path of invisible water vapour"}>
          {Array.from({ length: 9 }, (_, index) => <i style={{ "--tracker-index": index } as React.CSSProperties} key={index} />)}
        </div>
        <div className={styles.trackerLabel}>
          <strong>{language === "hi" ? "Bodh tracker view" : "Bodh tracker view"}</strong>
          <span>{language === "hi" ? "Dots केवल invisible water की यात्रा दिखाते हैं" : "Dots only map the invisible water's journey"}</span>
        </div>
        <div className={`${styles.rain} ${targetClass(activeTarget, ["rain"])}`} aria-label={language === "hi" ? "Rain पानी को धरती पर लौटाती है" : "Rain returns water to Earth"}>
          {Array.from({ length: 8 }, (_, index) => <i style={{ "--rain-index": index } as React.CSSProperties} key={index} />)}
        </div>
        <div className={`${styles.upArrow} ${targetClass(activeTarget, ["surface", "vapour-tracker", "cycle"])}`} aria-hidden="true"><span>↑</span></div>
        <div className={`${styles.downArrow} ${targetClass(activeTarget, ["rain", "cycle"])}`} aria-hidden="true"><span>↓</span></div>
        <div className={styles.ground} aria-hidden="true"><i /><i /><i /></div>
        <div className={`${styles.puddleWrap} ${targetClass(activeTarget, ["puddle", "water-boundary", "surface"])}`}>
          <div className={styles.oldBoundary} aria-hidden="true" />
          <div className={styles.puddle} role="img" aria-label={language === "hi" ? "Stage के साथ छोटा और rain में फिर बड़ा होता puddle" : "A puddle shrinking through the stages and growing again with rain"}>
            <i /><i /><i />
          </div>
          <span>{stageIndex === 0
            ? language === "hi" ? "liquid water" : "liquid water"
            : stageIndex === 4
              ? language === "hi" ? "वापस धरती पर" : "back on Earth"
              : language === "hi" ? "कम liquid यहाँ" : "less liquid here"}</span>
        </div>
      </div>

      <div className={styles.conservationLedger} aria-label={language === "hi" ? "Water conservation tracker" : "Water conservation tracker"}>
        <div><strong>{language === "hi" ? "Water accounted for" : "Water accounted for"} · 12/12</strong><small>{language === "hi" ? "Bodh के model counters" : "Bodh's model counters"}</small></div>
        <span>{language === "hi" ? "liquid" : "liquid"} <b>{ledger.liquid}</b></span>
        <span>{language === "hi" ? "air" : "air"} <b>{ledger.air}</b></span>
        <span>{language === "hi" ? "cloud/rain" : "cloud/rain"} <b>{ledger.cloud}</b></span>
      </div>

      <div className={styles.cueRail} aria-live="polite">
        <span aria-hidden="true">↗</span>
        <div>
          <small>{language === "hi" ? "Bodh अभी यहाँ point कर रहा है" : "Bodh is pointing here"}</small>
          <strong>{cueText ?? (language === "hi" ? "Voice play करें—artifact साथ चलेगा" : "Play the voice—the artifact will follow")}</strong>
        </div>
      </div>
    </div>
  );
}

function TransferExperiment({
  language,
  onComplete,
}: {
  language: NarrationLanguage;
  onComplete: () => void;
}) {
  const [lidPlaced, setLidPlaced] = useState(false);
  const [choice, setChoice] = useState<TransferChoice | null>(null);
  const [checked, setChecked] = useState(false);
  const selected = TRANSFER_OPTIONS.find((option) => option.id === choice);
  const correct = Boolean(checked && selected?.correct);

  return (
    <section className={styles.transferCard} aria-labelledby="transfer-title">
      <div className={styles.transferIntro}>
        <div>
          <span className={styles.eyebrow}>{language === "hi" ? "नया evidence · वही model" : "New evidence · same model"}</span>
          <h2 id="transfer-title">{language === "hi" ? "Warm puddle के ऊपर cold lid रखो।" : "Hold a cold lid above the warm puddle."}</h2>
          <p>{language === "hi" ? "पहले evidence बनाओ, फिर वह story चुनो जो दोनों changes समझाती है।" : "Create the evidence first, then choose the one story that explains both changes."}</p>
        </div>
        <BodhMark pose="tinker" size="medium" motion="tinker" />
      </div>

      <div className={`${styles.lidLab} ${lidPlaced ? styles.lidLabActive : ""}`}>
        <div className={styles.lid} aria-hidden="true"><span>{language === "hi" ? "cold lid" : "cold lid"}</span><i /><i /><i /><i /></div>
        <div className={styles.lidTracker} aria-hidden="true">↑ ↑ ↑</div>
        <div className={styles.warmPuddle} aria-hidden="true"><i /><i /><i /></div>
        <div className={styles.lidLabels}>
          <span>{language === "hi" ? "warm water" : "warm water"}</span>
          <strong>{lidPlaced ? language === "hi" ? "नई drops नीचे दिखीं" : "New drops appeared underneath" : language === "hi" ? "Evidence अभी बनाएँ" : "Create the evidence"}</strong>
        </div>
        <button type="button" onClick={() => { setLidPlaced(true); setChecked(false); }} disabled={lidPlaced}>
          {lidPlaced ? language === "hi" ? "Cold lid रखी गई ✓" : "Cold lid placed ✓" : language === "hi" ? "Cold lid पकड़ें" : "Hold the cold lid"}
        </button>
      </div>

      {lidPlaced && (
        <div className={styles.transferQuestion}>
          <h3>{language === "hi"
            ? "कौन-सी story shrinking puddle और lid की नई drops—दोनों को समझाती है?"
            : "Which story explains both the shrinking puddle and the new drops on the lid?"}</h3>
          <div className={styles.transferOptions} role="group" aria-label={language === "hi" ? "Transfer check choices" : "Transfer check choices"}>
            {TRANSFER_OPTIONS.map((option) => (
              <button
                className={choice === option.id ? styles.optionSelected : ""}
                type="button"
                aria-pressed={choice === option.id}
                onClick={() => { setChoice(option.id); setChecked(false); }}
                key={option.id}
              >
                <span aria-hidden="true">{option.icon}</span>
                <strong>{option[language]}</strong>
              </button>
            ))}
          </div>
          {checked && !correct && <p className={styles.gentleHint}>{language === "hi"
            ? "अभी नहीं—एक ही water matter को puddle से air और air से drops तक track करो।"
            : "Not yet—track the same water matter from puddle to air and from air to drops."}</p>}
          {correct && <div className={styles.transferSuccess} role="status">
            <strong>{language === "hi" ? "हाँ—यही condensation है।" : "Yes—that is condensation."}</strong>
            <p>{language === "hi"
              ? "Hot shower के बाद cool bathroom mirror पर droplets भी इसी तरह बनती हैं: invisible vapour cool होकर liquid बनती है।"
              : "Droplets on a cool bathroom mirror after a hot shower form the same way: invisible vapour cools into liquid."}</p>
          </div>}
          <button
            className={styles.primaryAction}
            type="button"
            disabled={!choice}
            onClick={() => correct ? onComplete() : setChecked(true)}
          >
            {correct
              ? language === "hi" ? "Journey पूरी करें और receipt देखें →" : "Finish journey and view receipt →"
              : language === "hi" ? "मेरी story जाँचें" : "Check my story"}
          </button>
        </div>
      )}
    </section>
  );
}

function CycleCompleteBridge({ language }: { language: NarrationLanguage }) {
  return (
    <section className={styles.cycleCompleteBridge} role="status" aria-live="polite">
      <div className={styles.cycleCompleteMark} aria-hidden="true">✓</div>
      <div>
        <span className={styles.eyebrow}>{language === "hi" ? "Water journey · 5/5 पूरी" : "Water journey · 5/5 complete"}</span>
        <h2>{language === "hi" ? "तुमने पानी को हर stop पर ढूँढ लिया।" : "You found the water at every stop."}</h2>
        <p>{language === "hi"
          ? "अब सिर्फ़ एक final step है: यही model cold lid पर नई situation में इस्तेमाल करो।"
          : "One final step remains: use the same model in a new cold-lid situation."}</p>
      </div>
      <div className={styles.cycleCompleteMascot}>
        <BodhMark pose="guide" size="medium" motion="guide" />
        <strong>{language === "hi" ? "अंतिम step → Transfer" : "Final step → Transfer"}</strong>
      </div>
    </section>
  );
}

function UnderstandingReceipt({
  language,
  mode,
  onRestart,
  headingRef,
}: {
  language: NarrationLanguage;
  mode: LessonMode;
  onRestart: () => void;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const receiptModel = useMemo(
    () => createEvaporationReceiptCardModel(language),
    [language],
  );

  return (
    <article className={styles.receipt}>
      <div className={styles.journeyCompleteBanner} role="status" aria-live="polite">
        <span aria-hidden="true">✓</span>
        <div>
          <strong>{language === "hi" ? "Journey पूरी · 6/6" : "Journey complete · 6/6"}</strong>
          <small>{language === "hi"
            ? "5 water-cycle ideas + 1 नई transfer situation"
            : "5 water-cycle ideas + 1 new transfer situation"}</small>
        </div>
      </div>

      <ReceiptImageCard
        language={language}
        variant="curated"
        model={receiptModel}
        headingRef={headingRef}
      />

      <div className={styles.receiptFooter}>
        <div className={styles.receiptMeta}>
          <span>✓ Marble · mt_Qkewo5M3_c</span>
          <span>✓ Hindi + English</span>
          {mode.live && <span>✓ {mode.handoff?.model} · seed-09</span>}
        </div>
        <p>{language === "hi"
          ? "यह आज के actions का evidence है—grade या long-term mastery claim नहीं।"
          : "This records today's actions—not a grade or a claim of long-term mastery."}</p>
        <div className={styles.receiptActions}>
          <button className={styles.primaryAction} type="button" onClick={onRestart}>{language === "hi" ? "Journey फिर देखें" : "Replay the journey"}</button>
          <Link className={styles.secondaryAction} href="/diagnose">{language === "hi" ? "एक और doubt लाएँ" : "Bring another doubt"}</Link>
        </div>
      </div>
    </article>
  );
}

export function EvaporationJourney() {
  const language = useNarrationLanguage();
  const hydrated = useSyncExternalStore(noopSubscribe, browserHydrated, serverHydrated);
  const mode = useMemo<LessonMode>(() => hydrated
    ? lessonMode()
    : { live: false, requestedLive: false, handoff: null }, [hydrated]);
  const [probeChoice, setProbeChoice] = useState<ProbeChoice | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [cycleComplete, setCycleComplete] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const receiptHeadingRef = useRef<HTMLHeadingElement>(null);
  const stage = EVAPORATION_CONCEPT_STAGES[stageIndex];
  const narration = useEvaporationNarration(stageIndex, language);
  const carriedProbeChoice = mode.live ? probeChoiceFromHandoff(mode.handoff) : null;
  const effectiveProbeChoice = probeChoice ?? carriedProbeChoice;
  const probe = PROBE_OPTIONS.find((option) => option.id === effectiveProbeChoice);

  useEffect(() => {
    if (!receiptVisible) return;
    const frame = window.requestAnimationFrame(() => {
      receiptHeadingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      receiptHeadingRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [receiptVisible]);

  const advanceStage = () => {
    narration.stop();
    if (stageIndex < EVAPORATION_CONCEPT_STAGES.length - 1) {
      setStageIndex((index) => index + 1);
      return;
    }
    setCycleComplete(true);
  };

  const restart = () => {
    narration.stop();
    setStageIndex(0);
    setProbeChoice(null);
    setCycleComplete(false);
    setReceiptVisible(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!hydrated) {
    return (
      <main className={`journey-shell ${styles.shell}`} id="main-content" aria-busy="true">
        <header className="journey-header">
          <span className="brand brand-compact"><BodhMark size="mark" motion="breathe" priority /><span className="brand-copy"><strong>BODH</strong></span></span>
        </header>
        <section className={styles.loadingCard}>
          <BodhMark pose="guide" size="medium" motion="guide" />
          <h1>Following one drop of water…</h1>
        </section>
      </main>
    );
  }

  return (
    <main className={`journey-shell ${styles.shell}`} id="main-content" lang={language}>
      <header className="journey-header">
        <Link className="back-link" href="/diagnose"><span aria-hidden="true">←</span> {language === "hi" ? "Doubts" : "Doubts"}</Link>
        <Link className="brand brand-compact" href="/" aria-label="Bodh home">
          <BodhMark size="mark" motion="still" priority />
          <span className="brand-copy"><strong>BODH</strong></span>
        </Link>
        <div className="journey-header-tools">
          <span className="fixture-label">{mode.live ? "Live Science repair" : "Curated Science"}</span>
          <NarrationLanguageToggle compact />
        </div>
      </header>

      {mode.requestedLive && !mode.live && (
        <div className={styles.safeFallback} role="status">
          <strong>{language === "hi" ? "Curated fallback खुला है।" : "The reviewed fallback is open."}</strong>
          <span>{language === "hi" ? "Validated live handoff नहीं मिला, इसलिए Bodh live diagnosis का दावा नहीं करेगा।" : "No validated live handoff was found, so Bodh will not claim a live diagnosis."}</span>
        </div>
      )}

      <ol className={styles.progress} aria-label={language === "hi" ? "Lesson progress" : "Lesson progress"}>
        {EVAPORATION_CONCEPT_STAGES.map((candidate, index) => (
          <li className={index < stageIndex || cycleComplete ? styles.progressDone : index === stageIndex ? styles.progressCurrent : ""} aria-current={index === stageIndex && !cycleComplete ? "step" : undefined} key={candidate.id}>
            <span>{index < stageIndex || cycleComplete ? "✓" : index + 1}</span>
            <strong>{candidate.screenKey[language]}</strong>
          </li>
        ))}
        <li
          className={receiptVisible ? styles.progressDone : cycleComplete ? styles.progressCurrent : ""}
          aria-current={cycleComplete && !receiptVisible ? "step" : undefined}
        >
          <span>{receiptVisible ? "✓" : 6}</span>
          <strong>{language === "hi" ? "नई situation में transfer" : "Transfer to a new situation"}</strong>
        </li>
      </ol>

      {!cycleComplete && !receiptVisible && (
        <article className={styles.lessonCard}>
          <section className={styles.hero}>
            <div className={styles.heroCopy}>
              <span className={`${styles.modeBadge} ${mode.live ? styles.modeBadgeLive : ""}`}><i aria-hidden="true" /> {mode.live ? "Live OpenAI diagnosis" : language === "hi" ? "Curated Science & Earth" : "Curated Science & Earth"}</span>
              <span className={styles.eyebrow}>{language === "hi" ? "एक puddle · एक deep idea" : "One puddle · one deep idea"}</span>
              <h1>{language === "hi" ? "Puddle का पानी कहाँ गया?" : "Where did the puddle water go?"}</h1>
              <p>{language === "hi"
                ? "पानी को हर state और location में follow करो—फिर bathroom mirror पर वही idea पहचानो।"
                : "Follow the water through every state and location—then recognise the same idea on a bathroom mirror."}</p>
              {mode.live && mode.handoff && (
                <div className={styles.liveTrace}>
                  <span>{mode.handoff.model}</span><span>{mode.handoff.promptVersion}</span><span>seed-09</span>
                </div>
              )}
            </div>
            <div className={styles.heroMascot}>
              <BodhMark pose="listen" size="large" motion="listen" priority />
              <div><strong>{language === "hi" ? "मैं answer नहीं guess करूँगा।" : "I won't guess the answer."}</strong><span>{language === "hi" ? "हम उसी पानी को track करेंगे।" : "We'll track the same water."}</span></div>
            </div>
          </section>

          <section className={styles.questionCarry}>
            <span>{mode.live ? language === "hi" ? "Live doubt साथ आया" : "Live doubt carried through" : language === "hi" ? "आज का reviewed doubt" : "Today's reviewed doubt"}</span>
            <strong>{mode.handoff?.canonicalEquation ?? (language === "hi" ? "धूप में puddle का पानी गायब कहाँ हो गया?" : "Where did the puddle water go in the sunshine?")}</strong>
            <p>{language === "hi"
              ? "Bodh की जाँच: क्या पानी को destroyed माना गया है, या state और location change अभी missing है?"
              : "Bodh's check: is the water thought to be destroyed, or is the change of state and location the missing bridge?"}</p>
          </section>

          <section className={styles.quickProbe} aria-labelledby="quick-probe-title">
            <div className={styles.probeHeading}>
              <div><span className={styles.eyebrow}>{language === "hi" ? "पहले एक quick thought" : "First, one quick thought"}</span><h2 id="quick-probe-title">{language === "hi" ? "Puddle छोटा हुआ—पानी के साथ क्या हुआ होगा?" : "The puddle shrank—what might have happened to the water?"}</h2></div>
              <span>{carriedProbeChoice ? language === "hi" ? "Live probe साथ आया" : "Live probe carried through" : language === "hi" ? "कोई penalty नहीं" : "No penalty"}</span>
            </div>
            <div className={styles.probeOptions} role="group" aria-label={language === "hi" ? "Initial probe choices" : "Initial probe choices"}>
              {PROBE_OPTIONS.map((option) => (
                <button className={effectiveProbeChoice === option.id ? styles.optionSelected : ""} type="button" aria-pressed={effectiveProbeChoice === option.id} onClick={() => setProbeChoice(option.id)} disabled={Boolean(carriedProbeChoice)} key={option.id}>
                  <span aria-hidden="true">{option.icon}</span><strong>{option[language]}</strong>
                </button>
              ))}
            </div>
            {effectiveProbeChoice && <p className={styles.probeResponse} role="status">{carriedProbeChoice
              ? language === "hi" ? "यह तुम्हारा live diagnosis वाला choice है—दोबारा answer देने की ज़रूरत नहीं।" : "This is your choice from the live diagnosis—you do not need to answer it twice."
              : probe?.correct
                ? language === "hi" ? "अच्छा model—अब evidence से इसे साबित करते हैं।" : "Strong model—now let's prove it with evidence."
              : language === "hi" ? "यह useful starting idea है। इसे challenge नहीं—artifact से जाँचेंगे।" : "That is a useful starting idea. We will test it with the artifact, not challenge you."}</p>}
          </section>

          <section className={styles.stageCard} aria-labelledby="evaporation-stage-title">
            <div className={styles.stageHeading}>
              <div>
                <span className={styles.eyebrow}>{stage.eyebrow[language]} · {stageIndex + 1}/{EVAPORATION_CONCEPT_STAGES.length}</span>
                <h2 id="evaporation-stage-title">{stage.title[language]}</h2>
                <p>{stage.screenKey[language]}</p>
              </div>
              <BodhMark pose={stageIndex < 2 ? "guide" : "tinker"} size="small" motion={stageIndex < 2 ? "guide" : "tinker"} />
            </div>

            <NarrationControl
              language={language}
              state={narration.state}
              activeBeatIndex={narration.activeBeatIndex}
              beatCount={narration.beatCount}
              hasPlayed={narration.hasPlayed}
              onPlay={narration.play}
              onStop={narration.stop}
            />

            <WaterCycleScene
              stageIndex={stageIndex}
              activeTarget={narration.activeBeat?.target ?? null}
              cueText={narration.activeBeat?.key[language] ?? null}
              language={language}
            />

            <div className={styles.stageActionRow}>
              <div><span>{language === "hi" ? "देखा गया evidence" : "Evidence to notice"}</span><strong>{stage.evidence[language]}</strong></div>
              <button className={styles.primaryAction} type="button" disabled={stageIndex === 0 && !effectiveProbeChoice} onClick={advanceStage}>
                {stage.action[language]} <span aria-hidden="true">→</span>
              </button>
            </div>
          </section>
        </article>
      )}

      {cycleComplete && !receiptVisible && (
        <>
          <CycleCompleteBridge language={language} />
          <TransferExperiment language={language} onComplete={() => setReceiptVisible(true)} />
        </>
      )}
      {receiptVisible && (
        <UnderstandingReceipt
          language={language}
          mode={mode}
          onRestart={restart}
          headingRef={receiptHeadingRef}
        />
      )}

      {!receiptVisible && (
        <EvaporationCurriculumClimb language={language} stageIndex={cycleComplete ? 4 : stageIndex} />
      )}
    </main>
  );
}
