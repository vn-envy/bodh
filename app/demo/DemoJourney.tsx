"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  ADAPTIVE_SESSION_STORAGE_KEY,
  EVIDENCE_MEANING_CHOICE_ID,
  MEANING_CHOICES,
  REPAIR_ENTRY_ATOM_IDS,
  adaptiveProbeById,
  adaptiveReceiptSupport,
  createAdaptiveEvidenceState,
  parseAdaptiveSessionPayload,
  reduceAdaptiveEvidence,
  type AdaptiveSessionPayload,
  type MeaningChoiceId,
  type RepairEntryAtomId,
} from "../../lib/adaptive-repair";
import {
  HERO_FIXTURE,
  isCorrectWholeNumberAnswer,
  isLabComplete,
  nextCuratedJourneyStep,
  type CuratedJourneyStep,
} from "../../lib/phase1-fixture";
import { BodhMark } from "../components/BodhMark";
import {
  FractionConceptExplainer,
  type FractionConceptStageId,
} from "../components/FractionConceptExplainer";
import { LearningStrip } from "../components/LearningStrip";
import { NarrationLanguageToggle, useNarrationLanguage } from "../components/NarrationLanguageToggle";
import { ProgressPath } from "../components/ProgressPath";

type JourneyStep = CuratedJourneyStep | "loading" | "route";
type CheckState = "idle" | "try-again" | "correct";
type PathReturnStep = "lab" | "transfer";

const probeOptions = [
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "8", label: "8" },
];

const entryAtomCopy: Record<RepairEntryAtomId, {
  number: number;
  label: { hi: string; en: string };
  reason: { hi: string; en: string };
}> = {
  "chosen-whole": {
    number: 1,
    label: { hi: "पूरा पहचानना", en: "Choose the whole" },
    reason: {
      hi: "पहले यह पक्का करेंगे कि फ्रैक्शन किस पूरी चीज़ का हिस्सा बता रहा है।",
      en: "We will first make sure which complete thing the fraction is describing.",
    },
  },
  "equal-parts": {
    number: 2,
    label: { hi: "बराबर हिस्से", en: "Equal parts" },
    reason: {
      hi: "तुमने पूरा सही पहचाना। अब यह देखेंगे कि fraction बनाने के लिए उस पूरे के हिस्से बराबर क्यों होने चाहिए।",
      en: "You identified the whole. Next, we will see why a fraction needs equal parts of that whole.",
    },
  },
  "unit-and-denominator": {
    number: 3,
    label: { hi: "एक हिस्से का size", en: "Size of one part" },
    reason: {
      hi: "तुम्हारा answer बताता है कि denominator और एक हिस्से के size का connection फिर से बनाना उपयोगी होगा।",
      en: "Your answer suggests it will help to rebuild the connection between the denominator and one part's size.",
    },
  },
  "numerator-count": {
    number: 4,
    label: { hi: "कितने हिस्से लिए", en: "Count the chosen parts" },
    reason: {
      hi: "तुमने उसी whole में 1/8 को छोटा पहचाना। अब numerator को उन equal-size units की गिनती से जोड़ेंगे।",
      en: "You identified 1/8 as the smaller unit in the same whole. Next, we will connect the numerator to a count of those equal-size units.",
    },
  },
  "equivalent-repartition": {
    number: 5,
    label: { hi: "मात्रा वही, हिस्से नए", en: "Same amount, new parts" },
    reason: {
      hi: "तुम्हारा answer बताता है कि हिस्सों का नाम बदलने पर मात्रा वही कैसे रहती है, उस picture को फिर से बनाना उपयोगी होगा।",
      en: "Your answer suggests it will help to rebuild the picture of how an amount can stay the same when the parts are renamed.",
    },
  },
  "repeated-composition": {
    number: 6,
    label: { hi: "छोटे हिस्सों से मात्रा बनाना", en: "Build an amount from units" },
    reason: {
      hi: "तुमने पहचान लिया कि दोबारा बाँटने से मात्रा नहीं बदलती। अब देखेंगे कि छोटे units बार-बार जोड़कर वही मात्रा कैसे बनाते हैं।",
      en: "You saw that repartitioning does not change the amount. Next, we will build that amount by repeatedly composing the smaller units.",
    },
  },
  "division-unknown-factor": {
    number: 7,
    label: { hi: "Division में छुपी गिनती", en: "The hidden count in division" },
    reason: {
      hi: "अब fraction picture को multiplication और division की missing-count relationship से जोड़ेंगे।",
      en: "Now we will connect the fraction picture to multiplication and division as a missing-count relationship.",
    },
  },
};

function progressFor(step: JourneyStep) {
  if (step === "loading") return 1;
  if (step === "confirm") return 1;
  if (step === "path" || step === "probe" || step === "route") return 2;
  if (step === "lab") return 3;
  return 4;
}

export function DemoJourney() {
  const language = useNarrationLanguage();
  const [step, setStep] = useState<JourneyStep>("loading");
  const [adaptiveSession, setAdaptiveSession] = useState<AdaptiveSessionPayload | null>(null);
  const [entryStageId, setEntryStageId] = useState<FractionConceptStageId>("chosen-whole");
  const [pathReturnStep, setPathReturnStep] = useState<PathReturnStep>("lab");
  const [evidence, dispatchEvidence] = useReducer(
    reduceAdaptiveEvidence,
    null,
    createAdaptiveEvidenceState,
  );
  const [probeAnswer, setProbeAnswer] = useState<string | null>(null);
  const [tileSelected, setTileSelected] = useState(false);
  const [placedSlots, setPlacedSlots] = useState<number[]>([]);
  const [transferAnswer, setTransferAnswer] = useState("");
  const [returnAnswer, setReturnAnswer] = useState("");
  const [transferState, setTransferState] = useState<CheckState>("idle");
  const [returnState, setReturnState] = useState<CheckState>("idle");
  const [meaningChoice, setMeaningChoice] = useState<MeaningChoiceId | null>(null);
  const stageHeadingRef = useRef<HTMLHeadingElement>(null);
  const meaningHeadingRef = useRef<HTMLHeadingElement>(null);

  const labComplete = useMemo(() => isLabComplete(placedSlots), [placedSlots]);
  const adaptiveProbe = adaptiveSession ? adaptiveProbeById(adaptiveSession.probeId) : null;
  const adaptiveOption = adaptiveProbe?.options.find((option) => option.id === adaptiveSession?.optionId) ?? null;
  const suggestedEntry = adaptiveSession ? entryAtomCopy[adaptiveSession.entryAtomId] : entryAtomCopy["chosen-whole"];
  const receiptSupport = adaptiveReceiptSupport(evidence);
  const receiptSupportReason = evidence.transfer.hintShown && evidence.repairHistory.length > 0
    ? "hint और concept repair के बाद"
    : evidence.repairHistory.length > 0
      ? "concept repair के बाद"
      : "hint के बाद";

  useEffect(() => {
    let parsed: AdaptiveSessionPayload | null = null;
    try {
      parsed = parseAdaptiveSessionPayload(window.sessionStorage.getItem(ADAPTIVE_SESSION_STORAGE_KEY));
      window.sessionStorage.removeItem(ADAPTIVE_SESSION_STORAGE_KEY);
    } catch {
      // Direct /demo visits always retain the complete curated path.
    }
    const handoff = window.setTimeout(() => {
      if (!parsed) {
        setStep("confirm");
        return;
      }
      setAdaptiveSession(parsed);
      setEntryStageId(parsed.entryAtomId);
      dispatchEvidence({ type: "probe-answered", probeId: parsed.probeId, optionId: parsed.optionId });
      setStep("route");
    }, 0);
    return () => window.clearTimeout(handoff);
  }, []);

  useEffect(() => {
    if (adaptiveSession && labComplete) dispatchEvidence({ type: "lab-completed" });
  }, [adaptiveSession, labComplete]);

  useEffect(() => {
    if (step === "loading") return;
    const target = step === "transfer" && transferState === "correct"
      ? meaningHeadingRef.current
      : stageHeadingRef.current;
    target?.focus({ preventScroll: true });
  }, [step, transferState]);

  const chooseProbe = (value: string) => setProbeAnswer(value);
  const placeTile = (slot: number) => {
    if (!tileSelected || slot >= HERO_FIXTURE.targetSlots || placedSlots.includes(slot)) return;
    setPlacedSlots((current) => [...current, slot]);
  };

  const checkTransfer = () => {
    const correct = isCorrectWholeNumberAnswer(transferAnswer, HERO_FIXTURE.transferAnswer);
    setTransferState(correct ? "correct" : "try-again");
    if (adaptiveSession) {
      dispatchEvidence({ type: "transfer-attempted", correct });
      if (!correct) dispatchEvidence({ type: "transfer-hint-shown" });
    }
  };

  const checkReturn = () => {
    const correct = isCorrectWholeNumberAnswer(returnAnswer, HERO_FIXTURE.originalAnswer);
    setReturnState(correct ? "correct" : "try-again");
    if (adaptiveSession) dispatchEvidence({ type: "return-attempted", correct });
  };

  const chooseMeaning = (choiceId: MeaningChoiceId) => {
    setMeaningChoice(choiceId);
    if (adaptiveSession) dispatchEvidence({ type: "meaning-chosen", choiceId });
  };

  const openPath = (stageId: FractionConceptStageId, returnStep: PathReturnStep = "lab") => {
    setEntryStageId(stageId);
    setPathReturnStep(returnStep);
    setStep("path");
  };

  const beginJourney = (stageId: FractionConceptStageId) => {
    if (adaptiveSession) dispatchEvidence({ type: "journey-started", entryAtomId: stageId });
    openPath(stageId);
  };

  const finishPath = () => {
    if (pathReturnStep === "transfer") {
      setMeaningChoice(null);
      setPathReturnStep("lab");
      setStep("transfer");
      return;
    }
    setStep(nextCuratedJourneyStep("path"));
  };

  const continueAfterTransfer = () => {
    if (meaningChoice === EVIDENCE_MEANING_CHOICE_ID) {
      setStep(nextCuratedJourneyStep("transfer"));
      return;
    }
    if (adaptiveSession) {
      dispatchEvidence({ type: "conceptual-repair-started", atomId: "equivalent-repartition" });
    }
    openPath("equivalent-repartition", "transfer");
  };

  return (
    <main className="journey-shell" id="main-content">
      <header className="journey-header">
        <Link className="back-link" href="/" aria-label="Bodh home पर वापस जाएँ">
          <span aria-hidden="true">←</span> वापस
        </Link>
        <Link className="brand brand-compact" href="/" aria-label="Bodh home">
          <BodhMark size="mark" motion="still" priority />
          <span className="brand-copy"><strong>BODH</strong></span>
        </Link>
        <div className="journey-header-tools">
          <span className="fixture-label">Curated demo</span>
          <NarrationLanguageToggle compact />
        </div>
      </header>

      {step !== "loading" && <ProgressPath active={progressFor(step)} />}

      <section className="journey-stage" aria-live="polite">
        {step === "loading" && (
          <article className="journey-card journey-card-confirm" aria-busy="true" lang={language}>
            <div className="stage-with-bodh">
              <div>
                <h1>{language === "hi" ? "तुम्हारा रास्ता तैयार हो रहा है…" : "Preparing your learning path…"}</h1>
              </div>
              <BodhMark pose="listen" size="medium" motion="listen" />
            </div>
          </article>
        )}

        {step === "route" && adaptiveSession && adaptiveOption && (
          <article className="journey-card journey-card-route" lang={language}>
            <div className="stage-topline">
              <span className="eyebrow">{language === "hi" ? "तुम्हारी समझ का रास्ता" : "Your learning path"}</span>
              <span className="stage-counter">{language === "hi" ? "Probe → idea" : "Probe → idea"}</span>
            </div>
            <div className="stage-with-bodh">
              <div>
                <h1 ref={stageHeadingRef} tabIndex={-1}>
                  {language === "hi" ? "Bodh ने एक शुरुआती idea सुझाई है।" : "Bodh suggests a place to begin."}
                </h1>
                <p className="stage-lead">
                  {language === "hi"
                    ? "यह सिर्फ तुम्हारे एक probe answer से चुनी गई safe शुरुआत है। पहले की ideas को complete या mastered नहीं माना गया है।"
                    : "This is a conservative starting point chosen from one probe answer. Earlier ideas are not marked complete or mastered."}
                </p>
              </div>
              <BodhMark pose="guide" size="medium" motion="guide" />
            </div>

            <div className="adaptive-probe-readback">
              <small>{language === "hi" ? "तुमने चुना" : "You chose"}</small>
              <strong>{adaptiveOption.label[language]}</strong>
            </div>

            <ol className="adaptive-route-path" aria-label={language === "hi" ? "Bodh की सुझाई शुरुआत" : "Bodh's suggested start"}>
              <li className="adaptive-route-start" style={{ gridColumn: "1 / -1" }}>
                <span aria-hidden="true">{suggestedEntry.number}</span>
                <div>
                  <small>
                    {language === "hi"
                      ? `यहाँ से शुरू · idea ${suggestedEntry.number} / ${REPAIR_ENTRY_ATOM_IDS.length}`
                      : `Start here · idea ${suggestedEntry.number} of ${REPAIR_ENTRY_ATOM_IDS.length}`}
                  </small>
                  <strong>{suggestedEntry.label[language]}</strong>
                </div>
              </li>
            </ol>

            <div className="adaptive-route-reason">
              <span aria-hidden="true">↳</span>
              <p>{suggestedEntry.reason[language]}</p>
            </div>

            <div className="adaptive-route-actions">
              <button
                className="button button-primary journey-primary"
                type="button"
                onClick={() => beginJourney(adaptiveSession.entryAtomId)}
              >
                {language === "hi" ? `${suggestedEntry.label.hi} से शुरू करें` : `Start with ${suggestedEntry.label.en}`}
                <span aria-hidden="true">→</span>
              </button>
              <button className="quiet-action" type="button" onClick={() => beginJourney("chosen-whole")}>
                {language === "hi" ? "शुरुआत से सब देखें" : "Review everything from the beginning"}
              </button>
            </div>
          </article>
        )}

        {step === "confirm" && (
          <article className="journey-card journey-card-confirm" lang="hi">
            <div className="stage-topline">
              <span className="eyebrow">तुम्हारा सवाल</span>
              <span className="stage-counter">1 / 4</span>
            </div>
            <div className="stage-with-bodh">
              <div>
                <h1 ref={stageHeadingRef} tabIndex={-1}>पहले जाँच लें कि हमने सही सुना।</h1>
                <p className="stage-lead">तुम्हारा original सवाल और तुम्हारे शब्द, बिल्कुल वैसे ही रखे गए हैं।</p>
              </div>
              <BodhMark pose="listen" size="medium" motion="listen" />
            </div>
            <div className="confirmed-equation journey-equation" aria-label="three quarters divided by one eighth">
              <span>3/4</span><span>÷</span><span>1/8</span><span>= ?</span>
            </div>
            <div className="reasoning-box">
              <span className="reasoning-label">तुमने कहा</span>
              <p>“{HERO_FIXTURE.learnerReasoning}”</p>
            </div>
            <p className="calm-note">Bodh तुम्हें grade नहीं कर रहा। वह बस यह देख रहा है कि कौन-सी छोटी idea पहले काम आएगी।</p>
            <button className="button button-primary journey-primary" type="button" onClick={() => setStep(nextCuratedJourneyStep("confirm"))}>
              हाँ, यही मेरा सवाल है <span aria-hidden="true">→</span>
            </button>
          </article>
        )}

        {step === "path" && (
          <article className="journey-card journey-card-path" lang="hi">
            <div className="stage-topline">
              <span className="eyebrow">छुपी हुई idea</span>
              <span className="stage-counter">2 / 4</span>
            </div>
            <div className="stage-with-bodh">
              <div>
                <h1 ref={stageHeadingRef} tabIndex={-1}>एक ही whole को बदलते हुए देखें।</h1>
                <p className="stage-lead">हर screen पर सिर्फ एक idea: पहले picture पर action, फिर उसी picture से evidence।</p>
              </div>
              <BodhMark pose="guide" size="medium" motion="guide" />
            </div>
            <div lang={language}>
              <FractionConceptExplainer
                initialStageId={entryStageId}
                onStageEvidence={(stageId) => {
                  if (adaptiveSession) dispatchEvidence({ type: "atom-completed", atomId: stageId });
                }}
                onFinish={finishPath}
              />
            </div>
          </article>
        )}

        {step === "probe" && (
          <article className="journey-card journey-card-probe" lang="hi">
            <div className="stage-topline">
              <span className="eyebrow">एक छोटी जाँच</span>
              <span className="stage-counter">2 / 4</span>
            </div>
            <div className="stage-with-bodh">
              <div>
                <h1 ref={stageHeadingRef} tabIndex={-1}>एक whole में कितने 1/4 आते हैं?</h1>
                <p className="stage-lead">यह test नहीं है। इससे Bodh को सही picture चुनने में मदद मिलती है।</p>
              </div>
              <BodhMark
                pose={probeAnswer === "4" ? "celebrate" : "listen"}
                size="medium"
                motion={probeAnswer === "4" ? "celebrate" : "listen"}
              />
            </div>
            <LearningStrip total={4} filled={4} unit="1/4" label="एक पूरा whole" tone="blue" compact />
            <div className="probe-options" role="group" aria-label="एक whole में कितने एक बटे चार">
              {probeOptions.map((option) => (
                <button
                  className={`probe-option ${probeAnswer === option.value ? "probe-option-selected" : ""}`}
                  type="button"
                  key={option.value}
                  aria-pressed={probeAnswer === option.value}
                  onClick={() => chooseProbe(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {probeAnswer && (
              <div className={`probe-response ${probeAnswer === "4" ? "probe-response-right" : ""}`}>
                {probeAnswer === "4"
                  ? "हाँ—चार बराबर 1/4 मिलकर एक whole बनाते हैं। अब यही सोच 1/8 और 3/4 पर लगाएँ।"
                  : "करीब है। एक whole को चार बराबर हिस्सों में बाँटकर फिर देखो—तुम answer बदल सकते हो।"}
              </div>
            )}
            <button
              className="button button-primary journey-primary"
              type="button"
              disabled={probeAnswer !== "4"}
              onClick={() => beginJourney("chosen-whole")}
            >
              अब Bodh के साथ idea बनाएँ <span aria-hidden="true">→</span>
            </button>
          </article>
        )}

        {step === "lab" && (
          <article className="journey-card journey-card-lab" lang="hi">
            <div className="stage-topline">
              <span className="eyebrow">खुद करके देखो</span>
              <span className="stage-counter">3 / 4</span>
            </div>
            <div className="stage-with-bodh stage-with-bodh-lab">
              <div>
                <h1 ref={stageHeadingRef} tabIndex={-1}>3/4 के अंदर कितने 1/8 पूरे-पूरा बैठते हैं?</h1>
                <p className="stage-lead">पहले एक tile चुनो, फिर peach वाली जगहों पर tap करके उसे रखो।</p>
              </div>
              <BodhMark
                pose={labComplete ? "celebrate" : "tinker"}
                size="medium"
                motion={labComplete ? "celebrate" : "tinker"}
              />
            </div>
            <div className="lab-equation" aria-live="polite">
              <span>{placedSlots.length || "?"}</span> × <span>1/8</span> = <span>3/4</span>
            </div>
            <button
              className={`tile-picker ${tileSelected ? "tile-picker-selected" : ""}`}
              type="button"
              aria-pressed={tileSelected}
              onClick={() => setTileSelected(true)}
            >
              <span className="tile-swatch">1/8</span>
              {tileSelected ? "Tile चुना गया है—अब जगह tap करो" : "एक 1/8 tile चुनें"}
            </button>
            <div className="fraction-bar-wrap">
              <div className="fraction-bar-labels" aria-hidden="true"><span>3/4</span><span>पूरा whole</span></div>
              <div className="fraction-bar-scroll">
                <div className="fraction-bar" aria-label="eight-part whole with three-quarters available for tiles">
                  {Array.from({ length: HERO_FIXTURE.totalSlots }, (_, slot) => {
                    const inTarget = slot < HERO_FIXTURE.targetSlots;
                    const placed = placedSlots.includes(slot);
                    return (
                      <button
                        className={`fraction-slot ${inTarget ? "fraction-slot-target" : "fraction-slot-outside"} ${placed ? "fraction-slot-placed" : ""}`}
                        type="button"
                        key={slot}
                        disabled={!inTarget || placed || !tileSelected}
                        aria-label={
                          placed
                            ? `जगह ${slot + 1}: एक बटे आठ रखा गया`
                            : inTarget
                              ? `जगह ${slot + 1} में एक बटे आठ रखें`
                              : `जगह ${slot + 1}, तीन बटे चार से बाहर`
                        }
                        onClick={() => placeTile(slot)}
                      >
                        {placed && <span>1/8</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            {labComplete && (
              <div className="lab-success">
                <strong>तुमने देख लिया:</strong> 3/4 में छह 1/8 बैठते हैं। इसलिए <span>3/4 ÷ 1/8 = 6</span>।
              </div>
            )}
            <div className="lab-actions">
              <button className="quiet-action" type="button" onClick={() => setPlacedSlots([])}>फिर से देखें</button>
              <button className="button button-primary journey-primary" type="button" disabled={!labComplete} onClick={() => setStep(nextCuratedJourneyStep("lab"))}>
                एक नए सवाल में आज़माएँ <span aria-hidden="true">→</span>
              </button>
            </div>
          </article>
        )}

        {step === "transfer" && (
          <article className="journey-card journey-card-transfer" lang="hi">
            <div className="stage-topline">
              <span className="eyebrow">अब एक नया सवाल</span>
              <span className="stage-counter">4 / 4</span>
            </div>
            <div className="stage-with-bodh">
              <div>
                <h1 ref={stageHeadingRef} tabIndex={-1}>क्या वही idea नई कहानी में भी काम करती है?</h1>
                <p className="stage-lead">पहले अपने दम पर कोशिश करो। जरूरत हुई तो वही tool वापस आएगा।</p>
              </div>
              <BodhMark
                pose={transferState === "correct" ? "celebrate" : "guide"}
                size="medium"
                motion={transferState === "correct" ? "celebrate" : "guide"}
              />
            </div>
            <div className="word-problem">
              <p>{HERO_FIXTURE.transferProblem}</p>
              <strong>2/3 ÷ 1/6 = ?</strong>
            </div>
            {transferState === "try-again" && (
              <LearningStrip total={6} filled={4} unit="1/6" label="Hint picture: 2/3 को sixths में देखें" tone="olive" compact showUnits={false} />
            )}
            <label className="answer-field">
              <span>तुम्हारा जवाब</span>
              <input
                inputMode="numeric"
                value={transferAnswer}
                onChange={(event) => {
                  setTransferAnswer(event.target.value);
                  setTransferState("idle");
                  setMeaningChoice(null);
                }}
                aria-describedby="transfer-feedback"
                placeholder="यहाँ लिखो"
              />
            </label>
            {transferState === "try-again" && (
              <p className="answer-feedback" id="transfer-feedback">अब hint picture में peach हिस्से देखो। उनमें 1/6 size के groups खुद गिनो।</p>
            )}
            {transferState === "correct" && (
              <p className="answer-feedback answer-feedback-correct" id="transfer-feedback" lang={language}>
                {language === "hi" ? "Number सही है। अब बताओ कि इस कहानी में 4 का मतलब क्या है।" : "The number is correct. Now tell Bodh what 4 means in this story."}
              </p>
            )}
            {transferState === "correct" && (
              <section className="transfer-meaning" aria-labelledby="transfer-meaning-title" lang={language}>
                <span className="reasoning-label">{language === "hi" ? "सिर्फ answer नहीं—meaning भी" : "Not only the answer—the meaning"}</span>
                <h2 id="transfer-meaning-title" ref={meaningHeadingRef} tabIndex={-1}>
                  {language === "hi" ? "यहाँ 4 किस चीज़ की गिनती है?" : "What is the 4 counting here?"}
                </h2>
                <div className="meaning-options" role="group" aria-label={language === "hi" ? "4 का meaning चुनें" : "Choose what 4 means"}>
                  {MEANING_CHOICES.map((choice) => (
                    <button
                      className={meaningChoice === choice.id ? "meaning-option-selected" : ""}
                      type="button"
                      aria-pressed={meaningChoice === choice.id}
                      key={choice.id}
                      onClick={() => chooseMeaning(choice.id)}
                    >
                      {choice.label[language]}
                    </button>
                  ))}
                </div>
                {meaningChoice === EVIDENCE_MEANING_CHOICE_ID && (
                  <p className="meaning-feedback meaning-feedback-correct">
                    {language === "hi" ? "हाँ—चार 1/6-size के groups, 2/3 ribbon में fit होते हैं।" : "Yes—four groups of size 1/6 fit inside 2/3 of the ribbon."}
                  </p>
                )}
                {meaningChoice && meaningChoice !== EVIDENCE_MEANING_CHOICE_ID && (
                  <p className="meaning-feedback">
                    {language === "hi" ? "Number मिल गया, लेकिन relationship अभी rule से जुड़ी है। Bodh उसी छोटी idea को फिर दिखाएगा।" : "You found the number, but its meaning is still tied to a rule. Bodh will revisit that one small idea."}
                  </p>
                )}
              </section>
            )}
            <button
              className="button button-primary journey-primary"
              type="button"
              disabled={transferState === "correct" && !meaningChoice}
              onClick={transferState === "correct" ? continueAfterTransfer : checkTransfer}
              lang={language}
            >
              {transferState !== "correct"
                ? language === "hi" ? "अपना जवाब जाँचें" : "Check my answer"
                : meaningChoice === EVIDENCE_MEANING_CHOICE_ID
                  ? language === "hi" ? "अब अपना पहला सवाल करें" : "Return to my first question"
                  : meaningChoice
                    ? language === "hi" ? "इस idea को फिर समझें" : "Repair this idea"
                    : language === "hi" ? "पहले meaning चुनें" : "Choose the meaning first"}
              <span aria-hidden="true">→</span>
            </button>
          </article>
        )}

        {step === "return" && (
          <article className="journey-card journey-card-return" lang="hi">
            <div className="stage-topline">
              <span className="eyebrow">वही सवाल, अब तुम्हारी समझ के साथ</span>
              <span className="stage-counter">4 / 4</span>
            </div>
            <div className="stage-with-bodh">
              <h1 ref={stageHeadingRef} tabIndex={-1}>अब वही सवाल—लेकिन idea तुम्हारे पास है।</h1>
              <BodhMark
                pose={returnState === "correct" ? "celebrate" : "listen"}
                size="medium"
                motion={returnState === "correct" ? "celebrate" : "listen"}
              />
            </div>
            <div className="confirmed-equation journey-equation">
              <span>3/4</span><span>÷</span><span>1/8</span><span>= ?</span>
            </div>
            <label className="answer-field">
              <span>तुम्हारा जवाब</span>
              <input
                inputMode="numeric"
                value={returnAnswer}
                onChange={(event) => {
                  setReturnAnswer(event.target.value);
                  setReturnState("idle");
                }}
                aria-describedby="return-feedback"
                placeholder="यहाँ लिखो"
              />
            </label>
            {returnState === "try-again" && (
              <p className="answer-feedback" id="return-feedback">एक hint: सोचो कि 3/4 के अंदर कितने 1/8 पूरे-पूरा बैठते हैं।</p>
            )}
            {returnState === "correct" && (
              <p className="answer-feedback answer-feedback-correct" id="return-feedback">हाँ। तुमने rule नहीं, relationship इस्तेमाल किया।</p>
            )}
            <button
              className="button button-primary journey-primary"
              type="button"
              onClick={returnState === "correct" ? () => setStep(nextCuratedJourneyStep("return")) : checkReturn}
            >
              {returnState === "correct" ? "आज की समझ देखें" : "अपना जवाब जाँचें"} <span aria-hidden="true">→</span>
            </button>
          </article>
        )}

        {step === "receipt" && (
          <article className="journey-card journey-card-receipt" lang="hi">
            <div className="receipt-heading">
              <BodhMark pose="celebrate" size="medium" motion="celebrate" />
              <div>
                <span className="eyebrow">इस session में क्या evidence मिला</span>
                <h1 ref={stageHeadingRef} tabIndex={-1}>
                  {receiptSupport === "independent"
                    ? "तुमने वही idea एक नए सवाल में अपने दम पर समझाई।"
                    : receiptSupport === "supported"
                      ? `तुमने ${receiptSupportReason} वही idea एक नए सवाल में समझाई।`
                      : "तुमने एक idea को दो अलग सवालों में इस्तेमाल किया।"}
                </h1>
              </div>
            </div>
            <p className="receipt-trust-note">यह आज के actions का receipt है—long-term mastery, grade, या score का दावा नहीं।</p>
            <div className="receipt-artifacts">
              <LearningStrip total={8} filled={6} unit="1/8" label="तुम्हारा fraction evidence" tone="peach" compact showUnits={false} />
              <LearningStrip total={6} filled={4} unit="1/6" label="तुम्हारा transfer evidence" tone="olive" compact showUnits={false} />
            </div>
            {adaptiveSession && (
              <ol className="receipt-evidence-timeline" aria-label="इस session का evidence timeline">
                <li><span>1</span><div><small>Probe</small><strong>Starting point चुनी गई</strong></div></li>
                <li><span>2</span><div><small>Visual repair</small><strong>{evidence.completedAtomIds.length} concept checkpoints evidence के साथ पूरे</strong></div></li>
                <li><span>3</span><div><small>Build</small><strong>3/4 में 1/8 tiles खुद रखे</strong></div></li>
                <li>
                  <span>4</span>
                  <div>
                    <small>Transfer</small>
                    <strong>{receiptSupport === "independent" ? "नई कहानी बिना support समझी" : `नई कहानी ${receiptSupportReason} समझी`}</strong>
                  </div>
                </li>
                <li><span>5</span><div><small>Meaning + return</small><strong>4 का meaning बताया और original सवाल पर लौटे</strong></div></li>
              </ol>
            )}
            <div className="receipt-grid">
              <section>
                <span>IDEA</span>
                <strong>Division पूछ सकती है: इस size के कितने groups यहाँ fit होते हैं?</strong>
              </section>
              <section>
                <span>तुमने evidence दिया</span>
                <strong>
                  तुमने 3/4 में छह 1/8 रखे और 2/3 में चार 1/6-size groups का meaning पहचाना
                  {receiptSupport === "supported" ? `—${receiptSupportReason}।` : "।"}
                </strong>
              </section>
              <section>
                <span>शब्द जो याद रखें</span>
                <strong>हर <em>(denominator)</em> size बताता है · अंश <em>(numerator)</em> units गिनता है</strong>
              </section>
              <section>
                <span>Connection</span>
                <strong>Multiplication मात्रा बनाती है; division वही missing count पूछती है।</strong>
              </section>
            </div>
            <div className="receipt-problems">
              <span>तुम्हारा original: <strong>3/4 ÷ 1/8 = 6</strong></span>
              <span>तुम्हारा transfer: <strong>2/3 ÷ 1/6 = 4</strong></span>
            </div>
            <Link className="button button-primary journey-primary" href="/">
              एक और doubt <span aria-hidden="true">→</span>
            </Link>
          </article>
        )}
      </section>
    </main>
  );
}
