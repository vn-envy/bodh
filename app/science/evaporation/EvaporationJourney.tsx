"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Ref,
} from "react";
import {
  EVAPORATION_CONCEPT_STAGES,
  EVAPORATION_NARRATION_VERSION,
  type EvaporationCueTarget,
} from "../../../lib/evaporation-concept";
import {
  evaporationJourneyReducer,
  evaporationPathPosition,
  INITIAL_EVAPORATION_JOURNEY,
  type EvaporationJourneyState,
} from "../../../lib/evaporation-journey";
import { localized, type NarrationLanguage } from "../../../lib/narration-language";
import {
  parseSeedJourneyHandoff,
  SEEDED_JOURNEY_STORAGE_KEY,
  type SeedJourneyHandoff,
} from "../../../lib/seeded-journey";
import { createEvaporationReceiptCardModel } from "../../../lib/receipt-card";
import { BodhMark } from "../../components/BodhMark";
import {
  NarrationLanguageToggle,
  useNarrationLanguage,
} from "../../components/NarrationLanguageToggle";
import { ReceiptImageCard } from "../../components/ReceiptImageCard";
import styles from "./EvaporationJourney.module.css";

type AudioState = "ready" | "preparing" | "playing" | "unavailable";
type ProbeChoice = "moved" | "destroyed" | "underground";
type TransferChoice = "moved-cooled" | "new-water" | "destroyed-unrelated" | "underground";
type LessonMode = Readonly<{
  live: boolean;
  requestedLive: boolean;
  handoff: SeedJourneyHandoff | null;
}>;

const CURATED_MODE: LessonMode = { live: false, requestedLive: false, handoff: null };

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
    hi: "पानी जलवाष्प बनकर हवा में चला गया",
    en: "The water moved into the air as invisible vapour",
    correct: true,
  },
  {
    id: "destroyed",
    icon: "☀",
    hi: "सूरज ने पानी खत्म कर दिया",
    en: "The Sun destroyed the water",
    correct: false,
  },
  {
    id: "underground",
    icon: "↓",
    hi: "सारा पानी तरल रहकर जमीन के नीचे चला गया",
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
    hi: "वही पानी हवा में गया, ठंडा हुआ और ढक्कन पर बूँदें बना गया",
    en: "The same water moved into the air, cooled, and formed drops on the lid",
    correct: true,
  },
  {
    id: "new-water",
    icon: "＋ ●",
    hi: "ठंडे ढक्कन ने नया पानी बना दिया",
    en: "The cold lid made brand-new water",
    correct: false,
  },
  {
    id: "destroyed-unrelated",
    icon: "☀ × · ?",
    hi: "सूरज ने पानी खत्म किया; ढक्कन की बूँदें अलग हैं",
    en: "The Sun destroyed the puddle; the lid drops are unrelated",
    correct: false,
  },
  {
    id: "underground",
    icon: "↓",
    hi: "सारा पानी जमीन के नीचे ही रहा",
    en: "All the puddle water stayed underground",
    correct: false,
  },
];

const PATH_LABELS = [
  { hi: "सोचो", en: "Think" },
  { hi: "पानी", en: "Water" },
  { hi: "गर्मी", en: "Warmth" },
  { hi: "जलवाष्प", en: "Vapour" },
  { hi: "बूँदें", en: "Drops" },
  { hi: "बारिश", en: "Rain" },
  { hi: "आज़माओ", en: "Transfer" },
] as const;

function readLessonMode(): LessonMode {
  const query = new URLSearchParams(window.location.search);
  const requestedLive = query.get("live") === "seed-09";
  if (!requestedLive) return CURATED_MODE;

  try {
    const handoff = parseSeedJourneyHandoff(window.sessionStorage.getItem(SEEDED_JOURNEY_STORAGE_KEY));
    if (handoff?.seedId === "seed-09" && handoff.source === "openai") {
      return { live: true, requestedLive: true, handoff };
    }
  } catch {
    // A missing or unavailable session becomes the reviewed journey.
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

export function evaporationQuestionFor(language: NarrationLanguage) {
  return language === "hi"
    ? "धूप में पानी का छोटा गड्ढा सूख गया—पानी कहाँ गया?"
    : "A puddle dried in the sunshine—where did the water go?";
}

function useEvaporationNarration(stageIndex: number, language: NarrationLanguage) {
  const stage = EVAPORATION_CONCEPT_STAGES[stageIndex];
  const [state, setState] = useState<AudioState>("ready");
  const [activeBeatIndex, setActiveBeatIndex] = useState(-1);
  const [hasPlayed, setHasPlayed] = useState(false);
  const preloadedRef = useRef<Map<string, HTMLAudioElement>>(new Map());
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
    setState("ready");
  }, [haltPlayer]);

  useEffect(() => {
    haltPlayer();
    for (const audio of preloadedRef.current.values()) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }

    // Warm all three short, authored beats in parallel. The first click can
    // start beat one immediately, while beats two and three keep loading in the
    // background instead of creating silent gaps mid-explanation.
    const prepared = new Map<string, HTMLAudioElement>();
    for (const beat of stage.narration) {
      const audio = new Audio(narrationUrl(language, stage.id, beat.id));
      audio.preload = "auto";
      audio.load();
      prepared.set(beat.id, audio);
    }
    preloadedRef.current = prepared;
    queueMicrotask(() => {
      setState("ready");
      setActiveBeatIndex(-1);
      setHasPlayed(false);
    });

    return () => {
      haltPlayer();
      if (preloadedRef.current === prepared) preloadedRef.current = new Map();
      for (const audio of prepared.values()) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
    };
  }, [haltPlayer, language, stage]);

  const play = useCallback(async () => {
    haltPlayer();
    const token = playbackTokenRef.current;
    setState("preparing");
    setHasPlayed(true);

    for (let index = 0; index < stage.narration.length; index += 1) {
      if (token !== playbackTokenRef.current) return;
      const beat = stage.narration[index];
      setActiveBeatIndex(index);
      const audio = preloadedRef.current.get(beat.id)
        ?? new Audio(narrationUrl(language, stage.id, beat.id));
      preloadedRef.current.delete(beat.id);
      playerRef.current = audio;

      try {
        await new Promise<void>((resolve, reject) => {
          audio.onplaying = () => {
            if (token === playbackTokenRef.current) setState("playing");
          };
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error("narration_playback_failed"));
          void audio.play().catch(reject);
        });
      } catch {
        if (token === playbackTokenRef.current) {
          playerRef.current = null;
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
  }, [haltPlayer, language, stage]);

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
    ? language === "hi" ? "आवाज़ आ रही है · रोकें" : "Voice is on its way · stop"
    : state === "playing"
      ? language === "hi" ? `Bodh समझा रहा है · ${activeBeatIndex + 1}/${beatCount} · रोकें` : `Bodh is explaining · ${activeBeatIndex + 1}/${beatCount} · stop`
      : state === "unavailable"
        ? language === "hi" ? "आवाज़ फिर चलाएँ" : "Try the voice again"
        : hasPlayed
          ? language === "hi" ? "फिर से सुनें" : "Replay explanation"
          : language === "hi" ? "अभी सुनें" : "Listen now";
  const active = state === "preparing" || state === "playing";

  return (
    <div className={styles.narrationControl}>
      <button
        className={`${styles.listenButton} ${!active ? styles.listenReady : ""}`}
        type="button"
        onClick={active ? onStop : onPlay}
        aria-label={label}
      >
        <span className={styles.soundGlyph} aria-hidden="true"><i /><i /><i /></span>
        <span><strong>{label}</strong><small>{language === "hi" ? "शांत, एक जैसी Bodh आवाज़" : "One calm, consistent Bodh voice"}</small></span>
      </button>
      <span className={styles.voiceNote}>{language === "hi"
        ? "आवाज़ तैयार होते समय भी आगे बढ़ सकते हो"
        : "You can keep learning while the voice gets ready"}</span>
    </div>
  );
}

function targetClass(activeTarget: EvaporationCueTarget | null, targets: readonly EvaporationCueTarget[]) {
  return activeTarget && targets.includes(activeTarget) ? styles.targetActive : "";
}

function WaterCycleScene({
  stageIndex,
  activeTarget,
  language,
}: {
  stageIndex: number;
  activeTarget: EvaporationCueTarget | null;
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
        <div className={`${styles.sun} ${targetClass(activeTarget, ["sun"])}`} aria-label={language === "hi" ? "धूप पानी को ऊर्जा देती है" : "Sunlight transfers energy to the water"}><span aria-hidden="true" /></div>
        <div className={`${styles.coolAir} ${targetClass(activeTarget, ["cool-air"])}`} aria-hidden="true"><i>❄</i><i>❄</i><i>❄</i></div>
        <div className={`${styles.cloud} ${targetClass(activeTarget, ["droplets", "cloud"])}`} aria-label={language === "hi" ? "बादल: तरल पानी की छोटी बूँदें" : "Cloud: tiny drops of liquid water"}>
          <i /><i /><i /><span>{language === "hi" ? "तरल पानी की बूँदें" : "tiny liquid drops"}</span>
        </div>
        <div className={`${styles.tracker} ${targetClass(activeTarget, ["vapour-tracker", "invisible-note"])}`} aria-label={language === "hi" ? "Bodh के बिंदु अदृश्य जलवाष्प का रास्ता समझाते हैं" : "Bodh's dots map the imagined path of invisible water vapour"}>
          {Array.from({ length: 9 }, (_, index) => <i key={index} />)}
        </div>
        <div className={styles.trackerLabel}>
          <strong>{language === "hi" ? "Bodh का खोजी नक्शा" : "Bodh's tracker"}</strong>
          <span>{language === "hi" ? "बिंदु केवल अदृश्य पानी का रास्ता दिखाते हैं" : "Dots map invisible water; they are not visible vapour"}</span>
        </div>
        <div className={`${styles.rain} ${targetClass(activeTarget, ["rain"])}`} aria-label={language === "hi" ? "बारिश पानी को धरती पर लौटाती है" : "Rain returns water to Earth"}>
          {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
        </div>
        <div className={styles.upArrow} aria-hidden="true"><span>↑</span></div>
        <div className={styles.downArrow} aria-hidden="true"><span>↓</span></div>
        <div className={styles.ground} aria-hidden="true"><i /><i /><i /></div>
        <div className={`${styles.puddleWrap} ${targetClass(activeTarget, ["puddle", "water-boundary", "surface"])}`}>
          <div className={styles.oldBoundary} aria-hidden="true" />
          <div className={styles.puddle} role="img" aria-label={language === "hi" ? "हर पड़ाव पर छोटा होकर बारिश में फिर भरता पानी" : "Water shrinking at each stage and filling again with rain"}><i /><i /><i /></div>
          <span>{stageIndex === 0
            ? language === "hi" ? "तरल पानी" : "liquid water"
            : stageIndex === 4
              ? language === "hi" ? "धरती पर वापस" : "back on Earth"
              : language === "hi" ? "यहाँ कम तरल" : "less liquid here"}</span>
        </div>
      </div>

      <div className={styles.conservationLedger} aria-label={language === "hi" ? "पानी की पूरी गिनती" : "Complete water count"}>
        <div><strong>{language === "hi" ? "पूरा पानी मिला" : "All water accounted for"} · 12/12</strong><small>{language === "hi" ? "Bodh के बारह संकेत" : "Bodh's twelve counters"}</small></div>
        <span>{language === "hi" ? "तरल" : "liquid"} <b>{ledger.liquid}</b></span>
        <span>{language === "hi" ? "हवा" : "air"} <b>{ledger.air}</b></span>
        <span>{language === "hi" ? "बादल/बारिश" : "cloud/rain"} <b>{ledger.cloud}</b></span>
      </div>
    </div>
  );
}

function ScienceJourneyPath({
  language,
  state,
  onProbe,
  onConcept,
  onTransfer,
}: {
  language: NarrationLanguage;
  state: EvaporationJourneyState;
  onProbe: () => void;
  onConcept: (stageIndex: number) => void;
  onTransfer: () => void;
}) {
  const current = evaporationPathPosition(state);
  const furthest = state.transferUnlocked ? 6 : state.furthestConcept + 1;
  const complete = state.screen.kind === "receipt";

  return (
    <nav className={styles.pathNav} aria-label={language === "hi" ? "पानी की सीखने की यात्रा" : "Water learning journey"}>
      <ol className={styles.path}>
        {PATH_LABELS.map((label, index) => {
          const enabled = index === 0 || index <= furthest;
          const done = complete || (index === 6 ? state.transferCompleted : enabled && index !== current);
          const status = !complete && index === current ? "current" : done ? "done" : "ahead";
          const onClick = index === 0 ? onProbe : index === 6 ? onTransfer : () => onConcept(index - 1);
          return (
            <li data-state={status} key={label.en}>
              <button type="button" onClick={onClick} disabled={!enabled} aria-current={status === "current" ? "step" : undefined}>
                {status === "current" && <BodhMark pose="guide" size="mark" motion="guide" className={styles.pathBodh} />}
                <span>{status === "done" ? "✓" : index + 1}</span>
                <strong>{localized(label, language)}</strong>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ProbeScreen({
  language,
  mode,
  choice,
  carriedChoice,
  onChoose,
  onStart,
  headingRef,
}: {
  language: NarrationLanguage;
  mode: LessonMode;
  choice: ProbeChoice | null;
  carriedChoice: ProbeChoice | null;
  onChoose: (choice: ProbeChoice) => void;
  onStart: () => void;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const selected = PROBE_OPTIONS.find((option) => option.id === choice);

  return (
    <article className={`${styles.screen} ${styles.probeScreen}`} data-science-screen="probe">
      <section className={styles.probeStory}>
        <span className={styles.modeBadge}><i aria-hidden="true" />{mode.live
          ? language === "hi" ? "OpenAI की जाँच पूरी" : "OpenAI diagnosis complete"
          : language === "hi" ? "जाँची हुई विज्ञान यात्रा" : "Reviewed science journey"}</span>
        <span className={styles.eyebrow}>{language === "hi" ? "एक बूँद का रहस्य" : "One drop · one mystery"}</span>
        <h1 ref={headingRef} tabIndex={-1}>{language === "hi" ? "पानी सच में गायब हुआ?" : "Did the water really disappear?"}</h1>
        <p>{evaporationQuestionFor(language)}</p>
        <div className={styles.probeVisual} aria-hidden="true">
          <div className={styles.probeSun} />
          <div className={styles.probeBoundary} />
          <div className={styles.probePuddle} />
          <span>?</span>
          <BodhMark pose="listen" size="large" motion="listen" priority />
        </div>
      </section>

      <section className={styles.probePanel} aria-labelledby="science-probe-title">
        <div className={styles.panelHeading}>
          <div><span className={styles.eyebrow}>{language === "hi" ? "पहले अपनी सोच बताओ" : "First, show your thinking"}</span><h2 id="science-probe-title">{language === "hi" ? "पानी के साथ क्या हुआ होगा?" : "What might have happened to the water?"}</h2></div>
          <span>{language === "hi" ? "कोई अंक नहीं" : "No score"}</span>
        </div>
        <div className={styles.probeOptions} role="group" aria-label={language === "hi" ? "शुरुआती सोच के विकल्प" : "Initial thinking choices"}>
          {PROBE_OPTIONS.map((option) => (
            <button className={choice === option.id ? styles.optionSelected : ""} type="button" aria-pressed={choice === option.id} onClick={() => onChoose(option.id)} key={option.id}>
              <span aria-hidden="true">{option.icon}</span><strong>{localized(option, language)}</strong>
            </button>
          ))}
        </div>
        {choice && <p className={styles.probeResponse} role="status">{carriedChoice === choice
          ? language === "hi" ? "तुम्हारी पहले वाली सोच यहाँ सुरक्षित आई है। चाहो तो बदल सकते हो।" : "Your earlier idea arrived safely. You can still change it."
          : selected?.correct
            ? language === "hi" ? "अच्छी शुरुआत। अब इसे सबूत से परखते हैं।" : "Strong start. Now let's test it with evidence."
            : language === "hi" ? "यह उपयोगी शुरुआत है। Bodh इसे तस्वीर से परखेगा।" : "That is a useful starting point. Bodh will test it with the visual."}</p>}
        <button className={styles.primaryAction} type="button" disabled={!choice} onClick={onStart}>
          {language === "hi" ? "पानी के साथ चलें" : "Follow the water"} <span aria-hidden="true">→</span>
        </button>
      </section>
    </article>
  );
}

function ConceptScreen({
  language,
  stageIndex,
  narration,
  onAdvance,
  headingRef,
}: {
  language: NarrationLanguage;
  stageIndex: number;
  narration: ReturnType<typeof useEvaporationNarration>;
  onAdvance: () => void;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const stage = EVAPORATION_CONCEPT_STAGES[stageIndex];
  const matterState = localized([
    { hi: "अवस्था · तरल", en: "STATE · LIQUID" },
    { hi: "अवस्था · गरम होता तरल", en: "STATE · WARMING LIQUID" },
    { hi: "अवस्था · गैस", en: "STATE · GAS" },
    { hi: "अवस्था · गैस → तरल", en: "STATE · GAS → LIQUID" },
    { hi: "अवस्था · तरल", en: "STATE · LIQUID" },
  ][stageIndex], language);
  const cue = narration.activeBeat
    ? localized(narration.activeBeat.key, language)
    : language === "hi" ? "Bodh को सुनो—तीर उसी जगह चलेगा" : "Listen to Bodh—the pointer will follow";

  return (
    <article className={`${styles.screen} ${styles.conceptScreen}`} data-science-screen={`concept-${stageIndex + 1}`}>
      <header className={styles.stageHeading}>
        <div>
          <span className={styles.eyebrow}>{localized(stage.eyebrow, language)} · {stageIndex + 1}/5</span>
          <h1 ref={headingRef} tabIndex={-1}>{localized(stage.title, language)}</h1>
          <div className={styles.stageKeyRow}><p>{localized(stage.screenKey, language)}</p><span>{matterState}</span></div>
        </div>
        <BodhMark pose={stageIndex < 2 ? "guide" : "tinker"} size="small" motion={stageIndex < 2 ? "guide" : "tinker"} />
      </header>

      <div className={styles.conceptGrid}>
        <WaterCycleScene stageIndex={stageIndex} activeTarget={narration.activeBeat?.target ?? null} language={language} />
        <aside className={styles.conceptAside}>
          <NarrationControl
            language={language}
            state={narration.state}
            activeBeatIndex={narration.activeBeatIndex}
            beatCount={narration.beatCount}
            hasPlayed={narration.hasPlayed}
            onPlay={narration.play}
            onStop={narration.stop}
          />
          <div className={styles.cueRail} aria-live="polite"><span aria-hidden="true">↗</span><div><small>{language === "hi" ? "Bodh यहाँ दिखा रहा है" : "Bodh is pointing here"}</small><strong>{cue}</strong></div></div>
          <div className={styles.evidenceCard}><span>{language === "hi" ? "क्या देखा?" : "What did you notice?"}</span><strong>{localized(stage.evidence, language)}</strong></div>
          <button className={styles.primaryAction} type="button" onClick={onAdvance}>{localized(stage.action, language)} <span aria-hidden="true">→</span></button>
        </aside>
      </div>
    </article>
  );
}

function BridgeScreen({ language, onContinue, headingRef }: { language: NarrationLanguage; onContinue: () => void; headingRef: Ref<HTMLHeadingElement> }) {
  return (
    <article className={`${styles.screen} ${styles.bridgeScreen}`} data-science-screen="bridge">
      <div className={styles.bridgeOrbit} aria-hidden="true"><i /><i /><i /><i /><i /></div>
      <div className={styles.bridgeMascot}><BodhMark pose="celebrate" size="hero" motion="celebrate" /></div>
      <div className={styles.bridgeCopy}>
        <span className={styles.completionChip}>✓ {language === "hi" ? "पानी की यात्रा · 5/5" : "Water journey · 5/5"}</span>
        <h1 ref={headingRef} tabIndex={-1}>{language === "hi" ? "तुमने पानी को हर पड़ाव पर ढूँढ लिया।" : "You found the water at every stop."}</h1>
        <p>{language === "hi" ? "अब वही समझ एक बिल्कुल नई स्थिति में आज़माओ। यही असली समझ की जाँच है।" : "Now use the same idea in a completely new situation. That is the real understanding check."}</p>
        <button className={styles.primaryAction} type="button" onClick={onContinue}>{language === "hi" ? "नई स्थिति आज़माएँ" : "Try a new situation"} <span aria-hidden="true">→</span></button>
      </div>
    </article>
  );
}

function LidExperiment({ language, onPlace }: { language: NarrationLanguage; onPlace: () => void }) {
  return (
    <div className={styles.lidLab}>
      <div className={styles.lid} aria-hidden="true"><span>{language === "hi" ? "ठंडा ढक्कन" : "cold lid"}</span><i /><i /><i /><i /></div>
      <div className={styles.lidTracker} aria-hidden="true">↑ ↑ ↑</div>
      <div className={styles.warmPuddle} aria-hidden="true"><i /><i /><i /></div>
      <div className={styles.lidLabels}><span>{language === "hi" ? "गर्म पानी" : "warm water"}</span><strong>{language === "hi" ? "ढक्कन को पानी के ऊपर रखो" : "Move the lid above the water"}</strong></div>
      <button type="button" onClick={onPlace}>{language === "hi" ? "ढक्कन रखें" : "Place the lid"}</button>
    </div>
  );
}

function TransferScreen({
  language,
  phase,
  onPlace,
  onCorrect,
  onFinish,
  headingRef,
}: {
  language: NarrationLanguage;
  phase: "evidence" | "choice" | "success";
  onPlace: () => void;
  onCorrect: () => void;
  onFinish: () => void;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const [choice, setChoice] = useState<TransferChoice | null>(null);
  const [checked, setChecked] = useState(false);
  const selected = TRANSFER_OPTIONS.find((option) => option.id === choice);

  if (phase === "success") {
    return (
      <article className={`${styles.screen} ${styles.transferSuccessScreen}`} data-science-screen="transfer-success">
        <div className={styles.successVisual}><span className={styles.successHalo} aria-hidden="true" /><BodhMark pose="celebrate" size="hero" motion="celebrate" /><i aria-hidden="true">✓</i></div>
        <div>
          <span className={styles.completionChip}>{language === "hi" ? "नई स्थिति समझ ली" : "New situation understood"}</span>
          <h1 ref={headingRef} tabIndex={-1}>{language === "hi" ? "वही पानी—बस रूप और जगह बदली।" : "Same water—only its form and location changed."}</h1>
          <p>{language === "hi" ? "गर्म पानी की जलवाष्प ठंडे ढक्कन पर ठंडी हुई और फिर तरल बूँदें बन गई। तुमने समझ को याद नहीं किया—इस्तेमाल किया।" : "Water vapour from the warm water cooled on the lid and became liquid drops. You did not just remember the idea—you used it."}</p>
          <button className={styles.primaryAction} type="button" onClick={onFinish}>{language === "hi" ? "मेरी समझ का कार्ड देखें" : "See my understanding card"} <span aria-hidden="true">→</span></button>
        </div>
      </article>
    );
  }

  return (
    <article className={`${styles.screen} ${styles.transferScreen}`} data-science-screen={phase === "evidence" ? "transfer-evidence" : "transfer-choice"}>
      <header className={styles.stageHeading}>
        <div><span className={styles.eyebrow}>{phase === "evidence" ? language === "hi" ? "नई स्थिति · पहले सबूत" : "New situation · evidence first" : language === "hi" ? "नई स्थिति · अब समझाओ" : "New situation · explain it"}</span><h1 ref={headingRef} tabIndex={-1}>{phase === "evidence" ? language === "hi" ? "गर्म पानी के ऊपर ठंडा ढक्कन रखो।" : "Hold a cold lid above warm water." : language === "hi" ? "ढक्कन के नीचे नई बूँदें क्यों बनीं?" : "Why did new drops appear under the lid?"}</h1></div>
        <BodhMark pose="tinker" size="small" motion="tinker" />
      </header>

      {phase === "evidence" ? (
        <div className={styles.transferEvidenceGrid}>
          <LidExperiment language={language} onPlace={onPlace} />
          <aside className={styles.transferPrompt}><span aria-hidden="true">1</span><h2>{language === "hi" ? "कुछ बनाओ, फिर समझाओ" : "Make something happen, then explain it"}</h2><p>{language === "hi" ? "बटन दबाते ही ठंडी सतह पर बूँदें दिखेंगी। अगली स्क्रीन पर तुम उनकी कहानी चुनोगे।" : "Place the lid to reveal drops on the cool surface. On the next screen, you will choose their story."}</p></aside>
        </div>
      ) : (
        <div className={styles.transferChoiceGrid}>
          <div className={styles.miniEvidence} aria-label={language === "hi" ? "गर्म पानी से ठंडे ढक्कन तक पानी का रास्ता" : "Water path from warm water to the cold lid"}><span>{language === "hi" ? "गर्म पानी" : "warm water"}</span><i>↑</i><span>{language === "hi" ? "हवा" : "air"}</span><i>→</i><span>{language === "hi" ? "ठंडी बूँदें" : "cool drops"}</span></div>
          <div className={styles.transferQuestion}>
            <div className={styles.transferOptions} role="group" aria-label={language === "hi" ? "नई स्थिति के उत्तर" : "New-situation answers"}>
              {TRANSFER_OPTIONS.map((option) => (
                <button className={choice === option.id ? styles.optionSelected : ""} type="button" aria-pressed={choice === option.id} onClick={() => { setChoice(option.id); setChecked(false); }} key={option.id}>
                  <span aria-hidden="true">{option.icon}</span><strong>{localized(option, language)}</strong>
                </button>
              ))}
            </div>
            {checked && !selected?.correct && <p className={styles.gentleHint} role="status">{language === "hi" ? "एक ही पानी को नीचे से हवा और फिर ढक्कन की बूँदों तक खोजो।" : "Track the same water from below, through the air, and into the drops on the lid."}</p>}
            <button className={styles.primaryAction} type="button" disabled={!choice} onClick={() => selected?.correct ? onCorrect() : setChecked(true)}>{language === "hi" ? "अपनी कहानी जाँचें" : "Check my story"} <span aria-hidden="true">→</span></button>
          </div>
        </div>
      )}
    </article>
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
  const receiptModel = useMemo(() => createEvaporationReceiptCardModel(language), [language]);

  return (
    <article className={styles.receipt} data-science-screen="receipt">
      <div className={styles.journeyCompleteBanner} role="status" aria-live="polite"><span aria-hidden="true">✓</span><div><strong>{language === "hi" ? "यात्रा पूरी · 6/6" : "Journey complete · 6/6"}</strong><small>{language === "hi" ? "पाँच विचार + एक नई स्थिति" : "Five ideas + one new situation"}</small></div></div>
      <ReceiptImageCard language={language} variant="curated" model={receiptModel} headingRef={headingRef} />
      <div className={styles.receiptFooter}>
        <div className={styles.receiptMeta}><span>✓ Marble · mt_Qkewo5M3_c</span><span>✓ {language === "hi" ? "हिंदी" : "English"}</span>{mode.live && <span>✓ OpenAI · seed-09</span>}</div>
        <p>{language === "hi" ? "यह आज किए काम का सबूत है—अंक या लंबे समय की महारत का दावा नहीं।" : "This records today's actions—not a grade or a claim of long-term mastery."}</p>
        <div className={styles.receiptActions}><button className={styles.primaryAction} type="button" onClick={onRestart}>{language === "hi" ? "यात्रा फिर देखें" : "Replay the journey"}</button><Link className={styles.secondaryAction} href="/diagnose">{language === "hi" ? "एक और सवाल लाएँ" : "Bring another doubt"}</Link></div>
      </div>
    </article>
  );
}

function screenName(state: EvaporationJourneyState) {
  return state.screen.kind === "concept" ? `${state.screen.kind}-${state.screen.stageIndex}` : state.screen.kind;
}

export function EvaporationJourney() {
  const language = useNarrationLanguage();
  const [mode, setMode] = useState<LessonMode>(CURATED_MODE);
  const [journey, dispatch] = useReducer(evaporationJourneyReducer, INITIAL_EVAPORATION_JOURNEY);
  const [probeChoice, setProbeChoice] = useState<ProbeChoice | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const activeStageIndex = journey.screen.kind === "concept" ? journey.screen.stageIndex : 0;
  const narration = useEvaporationNarration(activeStageIndex, language);
  const carriedProbeChoice = mode.live ? probeChoiceFromHandoff(mode.handoff) : null;
  const effectiveProbeChoice = probeChoice ?? carriedProbeChoice;
  const currentScreenName = screenName(journey);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMode(readLessonMode()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    narration.stop();
    const frame = window.requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
    // Narration is intentionally stopped whenever the visible screen changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreenName]);

  const restart = () => {
    narration.stop();
    setProbeChoice(null);
    dispatch({ type: "restart" });
  };

  return (
    <main className={`journey-shell ${styles.shell} ${journey.screen.kind === "receipt" ? styles.receiptMode : ""}`} id="main-content" lang={language}>
      <header className="journey-header">
        <Link className="back-link" href="/diagnose"><span aria-hidden="true">←</span> {language === "hi" ? "सवाल" : "Doubts"}</Link>
        <Link className="brand brand-compact" href="/" aria-label={language === "hi" ? "Bodh का मुखपृष्ठ" : "Bodh home"}><BodhMark size="mark" motion="still" priority /><span className="brand-copy"><strong>BODH</strong></span></Link>
        <div className="journey-header-tools"><span className="fixture-label">{mode.live ? language === "hi" ? "सीधी विज्ञान जाँच" : "Live science repair" : mode.requestedLive ? language === "hi" ? "जाँचा हुआ सुरक्षित रास्ता" : "Reviewed safe route" : language === "hi" ? "विज्ञान यात्रा" : "Science journey"}</span><NarrationLanguageToggle compact /></div>
      </header>

      <ScienceJourneyPath
        language={language}
        state={journey}
        onProbe={() => dispatch({ type: "review-probe" })}
        onConcept={(stageIndex) => dispatch({ type: "review-concept", stageIndex })}
        onTransfer={() => dispatch({ type: "review-transfer" })}
      />

      <div className={styles.frame} key={currentScreenName}>
        {journey.screen.kind === "probe" && <ProbeScreen language={language} mode={mode} choice={effectiveProbeChoice} carriedChoice={carriedProbeChoice} onChoose={setProbeChoice} onStart={() => dispatch({ type: "start" })} headingRef={headingRef} />}
        {journey.screen.kind === "concept" && <ConceptScreen language={language} stageIndex={journey.screen.stageIndex} narration={narration} onAdvance={() => dispatch({ type: "advance-concept" })} headingRef={headingRef} />}
        {journey.screen.kind === "bridge" && <BridgeScreen language={language} onContinue={() => dispatch({ type: "begin-transfer" })} headingRef={headingRef} />}
        {journey.screen.kind === "transfer-evidence" && <TransferScreen language={language} phase="evidence" onPlace={() => dispatch({ type: "place-lid" })} onCorrect={() => dispatch({ type: "complete-transfer" })} onFinish={() => dispatch({ type: "show-receipt" })} headingRef={headingRef} />}
        {journey.screen.kind === "transfer-choice" && <TransferScreen language={language} phase="choice" onPlace={() => dispatch({ type: "place-lid" })} onCorrect={() => dispatch({ type: "complete-transfer" })} onFinish={() => dispatch({ type: "show-receipt" })} headingRef={headingRef} />}
        {journey.screen.kind === "transfer-success" && <TransferScreen language={language} phase="success" onPlace={() => dispatch({ type: "place-lid" })} onCorrect={() => dispatch({ type: "complete-transfer" })} onFinish={() => dispatch({ type: "show-receipt" })} headingRef={headingRef} />}
        {journey.screen.kind === "receipt" && <UnderstandingReceipt language={language} mode={mode} onRestart={restart} headingRef={headingRef} />}
      </div>
    </main>
  );
}
