"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer, useRef, useState, type FormEvent } from "react";
import {
  ADAPTIVE_SESSION_STORAGE_KEY,
  EVIDENCE_MEANING_CHOICE_ID,
  MEANING_CHOICES,
  REPAIR_ENTRY_ATOM_IDS,
  adaptiveProbeById,
  adaptiveReceiptSupport,
  canIssueAdaptiveReceipt,
  createAdaptiveEvidenceState,
  parseAdaptiveSessionPayload,
  reduceAdaptiveEvidence,
  type AdaptiveSessionPayload,
  type MeaningChoiceId,
} from "../../lib/adaptive-repair";
import {
  HERO_FIXTURE,
  curatedProbeEntryAtomId,
  isCorrectWholeNumberAnswer,
  isLabComplete,
  nextCuratedJourneyStep,
  toggleLabTile,
  type CuratedJourneyStep,
} from "../../lib/phase1-fixture";
import {
  DEMO_JOURNEY_COPY,
  JOURNEY_ENTRY_COPY,
  receiptShareText,
  routeStartButtonText,
  type ReceiptShareVariant,
} from "../../lib/demo-journey-copy";
import { BodhMark } from "../components/BodhMark";
import { FractionLabRepresentation } from "../components/FractionLabRepresentation";
import {
  FractionConceptExplainer,
  type FractionConceptStageId,
} from "../components/FractionConceptExplainer";
import { LearningStrip } from "../components/LearningStrip";
import { NarrationLanguageToggle, useNarrationLanguage } from "../components/NarrationLanguageToggle";
import { ProgressPath } from "../components/ProgressPath";
import { ReceiptImageCard } from "../components/ReceiptImageCard";
import {
  createReceiptCardModel,
  downloadReceiptCardPng,
  shareReceiptCard,
} from "../../lib/receipt-card";

type JourneyStep = CuratedJourneyStep | "loading" | "route";
type CheckState = "idle" | "try-again" | "correct";
type PathReturnStep = "lab" | "transfer";
type ShareState = "idle" | "preparing" | "shared-image" | "shared-text" | "copied" | "downloaded" | "failed";

const probeOptions = [
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "8", label: "8" },
];

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
  const [shareState, setShareState] = useState<ShareState>("idle");
  const stageHeadingRef = useRef<HTMLHeadingElement>(null);
  const meaningHeadingRef = useRef<HTMLHeadingElement>(null);

  const t = (text: { hi: string; en: string }) => text[language];
  const labComplete = useMemo(() => isLabComplete(placedSlots), [placedSlots]);
  const adaptiveProbe = adaptiveSession ? adaptiveProbeById(adaptiveSession.probeId) : null;
  const adaptiveOption = adaptiveProbe?.options.find((option) => option.id === adaptiveSession?.optionId) ?? null;
  const suggestedEntry = JOURNEY_ENTRY_COPY[adaptiveSession?.entryAtomId ?? "chosen-whole"];
  const adaptiveReceiptReady = adaptiveSession ? canIssueAdaptiveReceipt(evidence) : false;
  const receiptSupport = adaptiveReceiptReady ? adaptiveReceiptSupport(evidence) : null;
  const canShowReceiptClaims = !adaptiveSession || adaptiveReceiptReady;
  const receiptShareVariant: ReceiptShareVariant = receiptSupport ?? "curated";
  const receiptCardModel = useMemo(
    () => createReceiptCardModel(language, receiptShareVariant),
    [language, receiptShareVariant],
  );

  useEffect(() => {
    let parsed: AdaptiveSessionPayload | null = null;
    try {
      parsed = parseAdaptiveSessionPayload(window.sessionStorage.getItem(ADAPTIVE_SESSION_STORAGE_KEY));
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
    if (step !== "receipt") return;
    try {
      window.sessionStorage.removeItem(ADAPTIVE_SESSION_STORAGE_KEY);
    } catch {
      // The receipt remains usable when storage is unavailable.
    }
  }, [step]);

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
  const toggleTile = (slot: number) => {
    const alreadyPlaced = placedSlots.includes(slot);
    if (!alreadyPlaced && !tileSelected) return;
    setPlacedSlots((current) => toggleLabTile(current, slot));
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

  const submitTransfer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (transferState !== "correct") {
      checkTransfer();
      return;
    }
    if (meaningChoice) continueAfterTransfer();
  };

  const submitReturn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (returnState === "correct") {
      setStep(nextCuratedJourneyStep("return"));
      return;
    }
    checkReturn();
  };

  const shareReceipt = async () => {
    if (!canShowReceiptClaims) return;
    const text = receiptShareText(language, receiptShareVariant);
    setShareState("preparing");
    const result = await shareReceiptCard(
      receiptCardModel,
      `Bodh · ${t(DEMO_JOURNEY_COPY.receipt.eyebrow)}`,
      text,
    );
    setShareState(result === "shared-file"
      ? "shared-image"
      : result === "shared-text"
        ? "shared-text"
        : result === "cancelled"
          ? "idle"
          : result);
  };

  const downloadReceipt = async () => {
    if (!canShowReceiptClaims) return;
    setShareState("preparing");
    try {
      await downloadReceiptCardPng(receiptCardModel);
      setShareState("downloaded");
    } catch {
      setShareState("failed");
    }
  };

  const startAnotherDoubt = () => {
    try {
      window.sessionStorage.removeItem(ADAPTIVE_SESSION_STORAGE_KEY);
    } catch {
      // Home remains reachable when storage is unavailable.
    }
  };

  return (
    <main className="journey-shell" id="main-content">
      <header className="journey-header">
        <Link className="back-link" href="/" aria-label={t(DEMO_JOURNEY_COPY.header.backAria)}>
          <span aria-hidden="true">←</span> {t(DEMO_JOURNEY_COPY.header.back)}
        </Link>
        <Link className="brand brand-compact" href="/" aria-label={t(DEMO_JOURNEY_COPY.header.homeAria)}>
          <BodhMark size="mark" motion="still" priority />
          <span className="brand-copy"><strong>BODH</strong></span>
        </Link>
        <div className="journey-header-tools">
          <span className="fixture-label" lang={language}>{t(DEMO_JOURNEY_COPY.header.demoLabel)}</span>
          <NarrationLanguageToggle compact />
        </div>
      </header>

      {step !== "loading" && <ProgressPath active={progressFor(step)} language={language} />}

      <section className="journey-stage" aria-live="polite">
        {step === "loading" && (
          <article className="journey-card journey-card-confirm" aria-busy="true" lang={language}>
            <div className="stage-with-bodh">
              <div>
                <h1>{t(DEMO_JOURNEY_COPY.loading.title)}</h1>
              </div>
              <BodhMark pose="listen" size="medium" motion="listen" />
            </div>
          </article>
        )}

        {step === "route" && adaptiveSession && adaptiveOption && (
          <article className="journey-card journey-card-route" lang={language}>
            <div className="stage-topline">
              <span className="eyebrow">{t(DEMO_JOURNEY_COPY.route.eyebrow)}</span>
              <span className="stage-counter">{t(DEMO_JOURNEY_COPY.route.counter)}</span>
            </div>
            <div className="stage-with-bodh">
              <div>
                <h1 ref={stageHeadingRef} tabIndex={-1}>
                  {t(DEMO_JOURNEY_COPY.route.title)}
                </h1>
                <p className="stage-lead">{t(DEMO_JOURNEY_COPY.route.lead)}</p>
              </div>
              <BodhMark pose="guide" size="medium" motion="guide" />
            </div>

            <div className="adaptive-probe-readback">
              <small>{t(DEMO_JOURNEY_COPY.route.chosen)}</small>
              <strong>{adaptiveOption.label[language]}</strong>
            </div>

            <ol className="adaptive-route-path" aria-label={t(DEMO_JOURNEY_COPY.route.pathAria)}>
              {REPAIR_ENTRY_ATOM_IDS.map((atomId, index) => {
                const atom = JOURNEY_ENTRY_COPY[atomId];
                const suggestedIndex = REPAIR_ENTRY_ATOM_IDS.indexOf(adaptiveSession.entryAtomId);
                const relation = index < suggestedIndex ? "before" : index === suggestedIndex ? "start" : "after";
                const status = relation === "before"
                  ? DEMO_JOURNEY_COPY.route.before
                  : relation === "start"
                    ? DEMO_JOURNEY_COPY.route.suggested
                    : DEMO_JOURNEY_COPY.route.after;
                return (
                  <li
                    className={`adaptive-route-node adaptive-route-${relation}`}
                    key={atomId}
                    aria-current={relation === "start" ? "step" : undefined}
                  >
                    <span aria-hidden="true">{atom.number}</span>
                    <div>
                      <small className="adaptive-route-status">{t(status)}</small>
                      <strong>{t(atom.label)}</strong>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="adaptive-route-reason">
              <span aria-hidden="true">↳</span>
              <p>{t(suggestedEntry.reason)}</p>
            </div>

            <div className="adaptive-route-actions">
              <button
                className="button button-primary journey-primary"
                type="button"
                onClick={() => beginJourney(adaptiveSession.entryAtomId)}
              >
                {routeStartButtonText(language, suggestedEntry.label)}
                <span aria-hidden="true">→</span>
              </button>
              <button className="quiet-action" type="button" onClick={() => beginJourney("chosen-whole")}>
                {t(DEMO_JOURNEY_COPY.route.startAll)}
              </button>
            </div>
          </article>
        )}

        {step === "confirm" && (
          <article className="journey-card journey-card-confirm" lang={language}>
            <div className="stage-topline">
              <span className="eyebrow">{t(DEMO_JOURNEY_COPY.confirm.eyebrow)}</span>
              <span className="stage-counter">{t(DEMO_JOURNEY_COPY.confirm.counter)}</span>
            </div>
            <div className="stage-with-bodh">
              <div>
                <h1 ref={stageHeadingRef} tabIndex={-1}>{t(DEMO_JOURNEY_COPY.confirm.title)}</h1>
                <p className="stage-lead">{t(DEMO_JOURNEY_COPY.confirm.lead)}</p>
              </div>
              <BodhMark pose="listen" size="medium" motion="listen" />
            </div>
            <div className="confirmed-equation journey-equation" aria-label={t(DEMO_JOURNEY_COPY.confirm.equationAria)}>
              <span>3/4</span><span>÷</span><span>1/8</span><span>= ?</span>
            </div>
            <div className="reasoning-box">
              <span className="reasoning-label">{t(DEMO_JOURNEY_COPY.confirm.learnerSaid)}</span>
              <p lang="hi">“{HERO_FIXTURE.learnerReasoning}”</p>
            </div>
            <p className="calm-note">{t(DEMO_JOURNEY_COPY.confirm.calmNote)}</p>
            <button className="button button-primary journey-primary" type="button" onClick={() => setStep(nextCuratedJourneyStep("confirm"))}>
              {t(DEMO_JOURNEY_COPY.confirm.continue)} <span aria-hidden="true">→</span>
            </button>
          </article>
        )}

        {step === "path" && (
          <article className="journey-card journey-card-path" lang={language}>
            <div className="stage-topline">
              <span className="eyebrow">{t(DEMO_JOURNEY_COPY.path.eyebrow)}</span>
              <span className="stage-counter">{t(DEMO_JOURNEY_COPY.path.counter)}</span>
            </div>
            <div className="stage-with-bodh">
              <div>
                <h1 ref={stageHeadingRef} tabIndex={-1}>{t(DEMO_JOURNEY_COPY.path.title)}</h1>
                <p className="stage-lead">{t(DEMO_JOURNEY_COPY.path.lead)}</p>
                {entryStageId !== "chosen-whole" && (
                  <button
                    className="quiet-action path-review-all"
                    type="button"
                    onClick={() => setEntryStageId("chosen-whole")}
                  >
                    {t(DEMO_JOURNEY_COPY.path.reviewAll)}
                  </button>
                )}
              </div>
              <BodhMark pose="guide" size="medium" motion="guide" />
            </div>
            <div lang={language}>
              <FractionConceptExplainer
                key={entryStageId}
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
          <article className="journey-card journey-card-probe" lang={language}>
            <div className="stage-topline">
              <span className="eyebrow">{t(DEMO_JOURNEY_COPY.probe.eyebrow)}</span>
              <span className="stage-counter">{t(DEMO_JOURNEY_COPY.probe.counter)}</span>
            </div>
            <div className="stage-with-bodh">
              <div>
                <h1 ref={stageHeadingRef} tabIndex={-1}>{t(DEMO_JOURNEY_COPY.probe.title)}</h1>
                <p className="stage-lead">{t(DEMO_JOURNEY_COPY.probe.lead)}</p>
              </div>
              <BodhMark
                pose={probeAnswer === "4" ? "celebrate" : "listen"}
                size="medium"
                motion={probeAnswer === "4" ? "celebrate" : "listen"}
              />
            </div>
            <LearningStrip
              total={4}
              filled={4}
              unit="1/4"
              label={t(DEMO_JOURNEY_COPY.probe.stripLabel)}
              tone="blue"
              compact
              language={language}
            />
            <div className="probe-options" role="group" aria-label={t(DEMO_JOURNEY_COPY.probe.optionsAria)}>
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
                  ? t(DEMO_JOURNEY_COPY.probe.feedbackFour)
                  : t(DEMO_JOURNEY_COPY.probe.feedbackOther)}
              </div>
            )}
            <button
              className="button button-primary journey-primary"
              type="button"
              disabled={!probeAnswer}
              onClick={() => beginJourney(curatedProbeEntryAtomId(probeAnswer))}
            >
              {t(DEMO_JOURNEY_COPY.probe.continue)} <span aria-hidden="true">→</span>
            </button>
          </article>
        )}

        {step === "lab" && (
          <article className="journey-card journey-card-lab" lang={language}>
            <div className="stage-topline">
              <span className="eyebrow">{t(DEMO_JOURNEY_COPY.lab.eyebrow)}</span>
              <span className="stage-counter">{t(DEMO_JOURNEY_COPY.lab.counter)}</span>
            </div>
            <div className="stage-with-bodh stage-with-bodh-lab">
              <div>
                <h1 ref={stageHeadingRef} tabIndex={-1}>{t(DEMO_JOURNEY_COPY.lab.title)}</h1>
                <p className="stage-lead">{t(DEMO_JOURNEY_COPY.lab.lead)}</p>
              </div>
              <BodhMark
                pose={labComplete ? "celebrate" : "tinker"}
                size="medium"
                motion={labComplete ? "celebrate" : "tinker"}
              />
            </div>
            <div className="lab-equation" aria-live="polite" aria-label={t(DEMO_JOURNEY_COPY.lab.equationAria)}>
              <span>{placedSlots.length || "?"}</span> × <span>1/8</span> = <span>3/4</span>
            </div>
            <button
              className={`tile-picker ${tileSelected ? "tile-picker-selected" : ""}`}
              type="button"
              aria-pressed={tileSelected}
              onClick={() => setTileSelected(true)}
            >
              <span className="tile-swatch">1/8</span>
              {tileSelected ? t(DEMO_JOURNEY_COPY.lab.tileSelected) : t(DEMO_JOURNEY_COPY.lab.chooseTile)}
            </button>
            <FractionLabRepresentation
              language={language}
              placedSlots={placedSlots}
              targetSlots={HERO_FIXTURE.targetSlots}
              totalSlots={HERO_FIXTURE.totalSlots}
              tileSelected={tileSelected}
              onToggle={toggleTile}
            />
            {labComplete && (
              <div className="lab-success">
                <strong>{t(DEMO_JOURNEY_COPY.lab.successLead)}</strong> {t(DEMO_JOURNEY_COPY.lab.success)}
              </div>
            )}
            <div className="lab-actions">
              <button className="quiet-action" type="button" onClick={() => setPlacedSlots([])}>{t(DEMO_JOURNEY_COPY.lab.reset)}</button>
              <button className="button button-primary journey-primary" type="button" disabled={!labComplete} onClick={() => setStep(nextCuratedJourneyStep("lab"))}>
                {t(DEMO_JOURNEY_COPY.lab.continue)} <span aria-hidden="true">→</span>
              </button>
            </div>
          </article>
        )}

        {step === "transfer" && (
          <article className="journey-card journey-card-transfer" lang={language}>
            <div className="stage-topline">
              <span className="eyebrow">{t(DEMO_JOURNEY_COPY.transfer.eyebrow)}</span>
              <span className="stage-counter">{t(DEMO_JOURNEY_COPY.transfer.counter)}</span>
            </div>
            <div className="stage-with-bodh">
              <div>
                <h1 ref={stageHeadingRef} tabIndex={-1}>{t(DEMO_JOURNEY_COPY.transfer.title)}</h1>
                <p className="stage-lead">{t(DEMO_JOURNEY_COPY.transfer.lead)}</p>
              </div>
              <BodhMark
                pose={transferState === "correct" ? "celebrate" : "guide"}
                size="medium"
                motion={transferState === "correct" ? "celebrate" : "guide"}
              />
            </div>
            <div className="word-problem">
              <p>{t(DEMO_JOURNEY_COPY.transfer.problem)}</p>
              <strong>2/3 ÷ 1/6 = ?</strong>
            </div>
            {transferState === "try-again" && (
              <LearningStrip
                total={6}
                filled={4}
                unit="1/6"
                label={t(DEMO_JOURNEY_COPY.transfer.hintLabel)}
                tone="olive"
                compact
                showUnits={false}
                language={language}
              />
            )}
            <form className="answer-form" onSubmit={submitTransfer}>
              <label className="answer-field">
                <span>{t(DEMO_JOURNEY_COPY.transfer.answerLabel)}</span>
                <input
                  inputMode="numeric"
                  name="transfer-answer"
                  value={transferAnswer}
                  onChange={(event) => {
                    setTransferAnswer(event.target.value);
                    setTransferState("idle");
                    setMeaningChoice(null);
                  }}
                  aria-describedby={transferState === "idle" ? undefined : "transfer-feedback"}
                  placeholder={t(DEMO_JOURNEY_COPY.transfer.answerPlaceholder)}
                />
              </label>
              {transferState === "try-again" && (
                <p className="answer-feedback" id="transfer-feedback">{t(DEMO_JOURNEY_COPY.transfer.hintFeedback)}</p>
              )}
              {transferState === "correct" && (
                <p className="answer-feedback answer-feedback-correct" id="transfer-feedback">
                  {t(DEMO_JOURNEY_COPY.transfer.correctFeedback)}
                </p>
              )}
              {transferState === "correct" && (
                <section className="transfer-meaning" aria-labelledby="transfer-meaning-title">
                  <span className="reasoning-label">{t(DEMO_JOURNEY_COPY.transfer.meaningEyebrow)}</span>
                  <h2 id="transfer-meaning-title" ref={meaningHeadingRef} tabIndex={-1}>
                    {t(DEMO_JOURNEY_COPY.transfer.meaningTitle)}
                  </h2>
                  <div className="meaning-options" role="group" aria-label={t(DEMO_JOURNEY_COPY.transfer.meaningAria)}>
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
                      {t(DEMO_JOURNEY_COPY.transfer.meaningCorrect)}
                    </p>
                  )}
                  {meaningChoice && meaningChoice !== EVIDENCE_MEANING_CHOICE_ID && (
                    <p className="meaning-feedback">{t(DEMO_JOURNEY_COPY.transfer.meaningRepair)}</p>
                  )}
                </section>
              )}
              <button
                className="button button-primary journey-primary"
                type="submit"
                disabled={transferState === "correct" && !meaningChoice}
              >
                {transferState !== "correct"
                  ? t(DEMO_JOURNEY_COPY.transfer.check)
                  : meaningChoice === EVIDENCE_MEANING_CHOICE_ID
                    ? t(DEMO_JOURNEY_COPY.transfer.return)
                    : meaningChoice
                      ? t(DEMO_JOURNEY_COPY.transfer.repair)
                      : t(DEMO_JOURNEY_COPY.transfer.chooseMeaning)}
                <span aria-hidden="true">→</span>
              </button>
            </form>
          </article>
        )}

        {step === "return" && (
          <article className="journey-card journey-card-return" lang={language}>
            <div className="stage-topline">
              <span className="eyebrow">{t(DEMO_JOURNEY_COPY.return.eyebrow)}</span>
              <span className="stage-counter">{t(DEMO_JOURNEY_COPY.return.counter)}</span>
            </div>
            <div className="stage-with-bodh">
              <h1 ref={stageHeadingRef} tabIndex={-1}>{t(DEMO_JOURNEY_COPY.return.title)}</h1>
              <BodhMark
                pose={returnState === "correct" ? "celebrate" : "listen"}
                size="medium"
                motion={returnState === "correct" ? "celebrate" : "listen"}
              />
            </div>
            <div className="confirmed-equation journey-equation" aria-label={t(DEMO_JOURNEY_COPY.return.equationAria)}>
              <span>3/4</span><span>÷</span><span>1/8</span><span>= ?</span>
            </div>
            <form className="answer-form" onSubmit={submitReturn}>
              <label className="answer-field">
                <span>{t(DEMO_JOURNEY_COPY.return.answerLabel)}</span>
                <input
                  inputMode="numeric"
                  name="return-answer"
                  value={returnAnswer}
                  onChange={(event) => {
                    setReturnAnswer(event.target.value);
                    setReturnState("idle");
                  }}
                  aria-describedby={returnState === "idle" ? undefined : "return-feedback"}
                  placeholder={t(DEMO_JOURNEY_COPY.return.answerPlaceholder)}
                />
              </label>
              {returnState === "try-again" && (
                <p className="answer-feedback" id="return-feedback">{t(DEMO_JOURNEY_COPY.return.hint)}</p>
              )}
              {returnState === "correct" && (
                <p className="answer-feedback answer-feedback-correct" id="return-feedback">{t(DEMO_JOURNEY_COPY.return.correct)}</p>
              )}
              <button className="button button-primary journey-primary" type="submit">
                {returnState === "correct" ? t(DEMO_JOURNEY_COPY.return.receipt) : t(DEMO_JOURNEY_COPY.return.check)} <span aria-hidden="true">→</span>
              </button>
            </form>
          </article>
        )}

        {step === "receipt" && (
          <article className="journey-card journey-card-receipt" lang={language}>
            {canShowReceiptClaims ? (
              <ReceiptImageCard
                language={language}
                variant={receiptShareVariant}
                headingRef={stageHeadingRef}
              />
            ) : (
              <>
                <div className="receipt-heading">
                  <BodhMark pose="listen" size="medium" motion="listen" />
                  <div>
                    <span className="eyebrow">{t(DEMO_JOURNEY_COPY.receipt.eyebrow)}</span>
                    <h1 ref={stageHeadingRef} tabIndex={-1}>{t(DEMO_JOURNEY_COPY.receipt.unavailableTitle)}</h1>
                  </div>
                </div>
                <p className="receipt-trust-note">{t(DEMO_JOURNEY_COPY.receipt.unavailableTrust)}</p>
              </>
            )}
            {canShowReceiptClaims && (
              <>
                <div className="receipt-artifacts">
                  <LearningStrip
                    total={8}
                    filled={6}
                    unit="1/8"
                    label={t(DEMO_JOURNEY_COPY.receipt.fractionEvidence)}
                    tone="peach"
                    compact
                    showUnits={false}
                    language={language}
                  />
                  <LearningStrip
                    total={6}
                    filled={4}
                    unit="1/6"
                    label={t(DEMO_JOURNEY_COPY.receipt.transferEvidence)}
                    tone="olive"
                    compact
                    showUnits={false}
                    language={language}
                  />
                </div>
                {adaptiveSession && adaptiveReceiptReady && (
                  <ol className="receipt-evidence-timeline" aria-label={t(DEMO_JOURNEY_COPY.receipt.timelineAria)}>
                    <li><span>1</span><div><small>{t(DEMO_JOURNEY_COPY.receipt.timeline.probeLabel)}</small><strong>{t(DEMO_JOURNEY_COPY.receipt.timeline.probe)}</strong></div></li>
                    <li><span>2</span><div><small>{t(DEMO_JOURNEY_COPY.receipt.timeline.repairLabel)}</small><strong>{evidence.completedAtomIds.length} {t(DEMO_JOURNEY_COPY.receipt.timeline.repairSuffix)}</strong></div></li>
                    <li><span>3</span><div><small>{t(DEMO_JOURNEY_COPY.receipt.timeline.buildLabel)}</small><strong>{t(DEMO_JOURNEY_COPY.receipt.timeline.build)}</strong></div></li>
                    <li>
                      <span>4</span>
                      <div>
                        <small>{t(DEMO_JOURNEY_COPY.receipt.timeline.transferLabel)}</small>
                        <strong>
                          {t(receiptSupport === "independent"
                            ? DEMO_JOURNEY_COPY.receipt.timeline.transferIndependent
                            : DEMO_JOURNEY_COPY.receipt.timeline.transferSupported)}
                        </strong>
                      </div>
                    </li>
                    <li><span>5</span><div><small>{t(DEMO_JOURNEY_COPY.receipt.timeline.returnLabel)}</small><strong>{t(DEMO_JOURNEY_COPY.receipt.timeline.return)}</strong></div></li>
                  </ol>
                )}
                <div className="receipt-grid">
                  <section>
                    <span>{t(DEMO_JOURNEY_COPY.receipt.ideaLabel)}</span>
                    <strong>{t(DEMO_JOURNEY_COPY.receipt.idea)}</strong>
                  </section>
                  <section>
                    <span>{t(DEMO_JOURNEY_COPY.receipt.evidenceLabel)}</span>
                    <strong>{t(DEMO_JOURNEY_COPY.receipt.evidence)}</strong>
                  </section>
                  <section>
                    <span>{t(DEMO_JOURNEY_COPY.receipt.wordsLabel)}</span>
                    <strong>{t(DEMO_JOURNEY_COPY.receipt.words)}</strong>
                  </section>
                  <section>
                    <span>{t(DEMO_JOURNEY_COPY.receipt.connectionLabel)}</span>
                    <strong>{t(DEMO_JOURNEY_COPY.receipt.connection)}</strong>
                  </section>
                </div>
                <div className="receipt-problems">
                  <span>{t(DEMO_JOURNEY_COPY.receipt.original)}: <strong>3/4 ÷ 1/8 = 6</strong></span>
                  <span>{t(DEMO_JOURNEY_COPY.receipt.transfer)}: <strong>2/3 ÷ 1/6 = 4</strong></span>
                </div>
              </>
            )}
            <div className="receipt-actions mobile-action-tray">
              <button
                className="button receipt-share-action"
                type="button"
                disabled={!canShowReceiptClaims || shareState === "preparing"}
                aria-label={t(DEMO_JOURNEY_COPY.receipt.shareAria)}
                onClick={shareReceipt}
              >
                {t(DEMO_JOURNEY_COPY.receipt.share)}
              </button>
              <button
                className="button receipt-download-action"
                type="button"
                disabled={!canShowReceiptClaims || shareState === "preparing"}
                aria-label={t(DEMO_JOURNEY_COPY.receipt.downloadAria)}
                onClick={downloadReceipt}
              >
                {t(DEMO_JOURNEY_COPY.receipt.download)}
              </button>
              <button
                className="button receipt-print-action"
                type="button"
                disabled={!canShowReceiptClaims || shareState === "preparing"}
                aria-label={t(DEMO_JOURNEY_COPY.receipt.printAria)}
                onClick={() => window.print()}
              >
                {t(DEMO_JOURNEY_COPY.receipt.print)}
              </button>
            </div>
            {shareState !== "idle" && (
              <p className="receipt-share-status" role={shareState === "failed" ? "alert" : "status"} aria-live="polite">
                {t(shareState === "preparing"
                  ? DEMO_JOURNEY_COPY.receipt.preparing
                  : shareState === "shared-image"
                    ? DEMO_JOURNEY_COPY.receipt.sharedImage
                    : shareState === "shared-text"
                      ? DEMO_JOURNEY_COPY.receipt.shared
                      : shareState === "downloaded"
                        ? DEMO_JOURNEY_COPY.receipt.downloaded
                  : shareState === "copied"
                    ? DEMO_JOURNEY_COPY.receipt.copied
                    : DEMO_JOURNEY_COPY.receipt.shareFailed)}
              </p>
            )}
            <Link className="button button-primary journey-primary receipt-restart-action" href="/" onClick={startAnotherDoubt}>
              {t(DEMO_JOURNEY_COPY.receipt.oneMore)} <span aria-hidden="true">→</span>
            </Link>
          </article>
        )}
      </section>
    </main>
  );
}
