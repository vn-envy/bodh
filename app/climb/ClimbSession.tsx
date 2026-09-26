"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LocalizedText, NarrationLanguage } from "../../lib/narration-language";
import {
  FACET_COPY,
  MISCONCEPTIONS,
  checkFor,
  evaluateCheck,
  variantCount,
  type CheckAnswer,
  type CheckOutcome,
  type UnderstandingCheck,
} from "../../lib/understanding-checks";
import {
  climbTopicCopy,
  type CurriculumGraph,
  type EvidenceIndex,
} from "../../lib/understanding-curriculum";
import {
  nextVariantFor,
  recordAttempt,
  type Confidence,
} from "../../lib/understanding-evidence";
import { BodhMark } from "../components/BodhMark";
import { CheckVisualView, DotsVisual } from "./ClimbVisuals";
import { currentUnderstandingLedger, saveUnderstandingLedger } from "./understanding-ledger-store";
import styles from "./Climb.module.css";

export type SessionItem = Readonly<{ topicId: string; evidenceIndex: EvidenceIndex; variant: number; extra: boolean }>;

export type SessionResult = Readonly<{
  topicId: string;
  evidenceIndex: EvidenceIndex;
  correct: boolean;
  confidence: Confidence;
  hinted: boolean;
}>;

/** A statement may be re-checked at most twice in one visit, so a miss never becomes a drill loop. */
const MAX_EXTRA_PER_STATEMENT = 2;

const hiEn = (hi: string, en: string): LocalizedText => ({ hi, en });

const CONFIDENCE_COPY: Record<Confidence, LocalizedText> = {
  sure: hiEn("पक्का", "I'm sure"),
  think: hiEn("लगता है", "I think so"),
  guess: hiEn("अंदाज़ा", "Just guessing"),
};

function feedbackHeadline(outcome: CheckOutcome, confidence: Confidence, hinted: boolean, anotherQueued: boolean): LocalizedText {
  if (outcome.correct && hinted) {
    return anotherQueued
      ? hiEn("सही—hint के साथ। अब Bodh एक बिना hint के पूछेगा।", "Right—with a hint. Next, Bodh will ask one without it.")
      : hiEn("सही—hint के साथ। Bodh इसे बाद में बिना hint के फिर पूछेगा।", "Right—with a hint. Bodh will ask this again later, without one.");
  }
  if (outcome.correct && confidence === "guess") {
    return anotherQueued
      ? hiEn("सही! तुमने अंदाज़ा कहा था, इसलिए Bodh एक और पूछेगा ताकि यह पक्का हो।", "Right! You said it was a guess, so Bodh will ask one more to make it firm.")
      : hiEn("सही! तुमने अंदाज़ा कहा था, इसलिए Bodh इसे बाद में फिर पूछेगा ताकि यह पक्का हो।", "Right! You said it was a guess, so Bodh will ask again later to make it firm.");
  }
  if (outcome.correct) return hiEn("हाँ! यह evidence अब पक्का है।", "Yes! This evidence is firm now.");
  if (confidence === "sure") return hiEn("अभी नहीं—और तुम्हें पक्का लगा था। यह काम की बात है: अब पता है कौन-सी idea फिर से बनानी है।", "Not yet—and you felt sure. That is useful: now we know exactly which idea to rebuild.");
  return hiEn("अभी नहीं—चलो देखें क्यों।", "Not yet—let's see why.");
}

function initialAnswer(check: UnderstandingCheck): CheckAnswer | null {
  if (check.response.kind === "shade") return { kind: "shade", shaded: [] };
  if (check.response.kind === "hops") return { kind: "hops", hops: 0 };
  if (check.response.kind === "order") return { kind: "order", tileIds: [] };
  return null;
}

function answerReady(check: UnderstandingCheck, answer: CheckAnswer | null) {
  if (!answer) return false;
  if (answer.kind === "shade") return answer.shaded.length > 0;
  if (answer.kind === "hops") return answer.hops > 0;
  if (answer.kind === "order" && check.response.kind === "order") return answer.tileIds.length === check.response.tiles.length;
  return true;
}

function ShadeResponse({ parts, target, shaded, locked, onChange, language }: {
  parts: number;
  target: number;
  shaded: readonly number[];
  locked: boolean;
  onChange: (next: number[]) => void;
  language: NarrationLanguage;
}) {
  const set = new Set(shaded);
  return (
    <div className={styles.shadeResponse}>
      <div className={styles.shadeTrack} style={{ gridTemplateColumns: `repeat(${parts}, minmax(0, 1fr))` }} role="group" aria-label={language === "hi" ? `${target}/${parts} बनाने के लिए हिस्से रँगो` : `Shade parts to build ${target}/${parts}`}>
        {Array.from({ length: parts }, (_, index) => (
          <button
            className={set.has(index) ? styles.shadeOn : styles.shadeOff}
            type="button"
            aria-pressed={set.has(index)}
            aria-label={language === "hi" ? `हिस्सा ${index + 1}` : `Part ${index + 1}`}
            disabled={locked}
            onClick={() => onChange(set.has(index) ? shaded.filter((value) => value !== index) : [...shaded, index])}
            key={index}
          />
        ))}
      </div>
      <p className={styles.responseCount} aria-live="polite">
        {language === "hi" ? `रँगे हिस्से: ${parts} में से ${set.size}` : `Shaded: ${set.size} of ${parts}`}
      </p>
    </div>
  );
}

function HopsResponse({ denominator, max, hops, locked, onChange, language }: {
  denominator: number;
  max: number;
  hops: number;
  locked: boolean;
  onChange: (next: number) => void;
  language: NarrationLanguage;
}) {
  const total = denominator * max;
  const position = Math.min(hops, total) / total;
  return (
    <div className={styles.hopsResponse}>
      <div className={styles.numberLine} aria-hidden="true">
        <span className={styles.numberLineRail} />
        {Array.from({ length: total + 1 }, (_, tick) => (
          <span
            className={tick % denominator === 0 ? styles.tickWhole : styles.tick}
            style={{ left: `${(tick / total) * 100}%` }}
            key={tick}
          >
            {tick % denominator === 0 && <b>{tick / denominator}</b>}
          </span>
        ))}
        {Array.from({ length: Math.min(hops, total) }, (_, hop) => (
          <i className={styles.hopArc} style={{ left: `${(hop / total) * 100}%`, width: `${100 / total}%` }} key={hop} />
        ))}
        <span className={styles.hopMarker} style={{ left: `${position * 100}%` }}>
          <BodhMark pose="tinker" size="mark" motion="still" />
        </span>
      </div>
      <div className={styles.hopControls}>
        <button className="button button-secondary" type="button" disabled={locked || hops === 0} onClick={() => onChange(hops - 1)}>
          {language === "hi" ? "↶ एक पीछे" : "↶ One back"}
        </button>
        <strong aria-live="polite">{language === "hi" ? `${hops} छलांगें` : `${hops} ${hops === 1 ? "hop" : "hops"}`}</strong>
        <button className="button button-primary" type="button" disabled={locked || hops >= total} onClick={() => onChange(hops + 1)}>
          {language === "hi" ? `+ 1/${denominator} छलांग` : `+ hop 1/${denominator}`}
        </button>
      </div>
    </div>
  );
}

function OrderResponse({ check, placed, locked, onChange, language }: {
  check: Extract<UnderstandingCheck["response"], { kind: "order" }>;
  placed: readonly string[];
  locked: boolean;
  onChange: (next: string[]) => void;
  language: NarrationLanguage;
}) {
  const byId = new Map(check.tiles.map((tile) => [tile.id, tile]));
  return (
    <div className={styles.orderResponse}>
      <ol className={styles.orderSlots} aria-label={language === "hi" ? "तुम्हारा क्रम" : "Your order"}>
        {check.tiles.map((_, index) => {
          const tileId = placed[index];
          return (
            <li key={index}>
              <span>{index + 1}</span>
              {tileId ? (
                <button type="button" disabled={locked} onClick={() => onChange(placed.filter((id) => id !== tileId))} aria-label={language === "hi" ? `हटाओ: ${byId.get(tileId)!.label.hi}` : `Remove: ${byId.get(tileId)!.label.en}`}>
                  {byId.get(tileId)!.label[language]}
                </button>
              ) : (
                <em>{language === "hi" ? "यहाँ अगला चरण" : "Next step goes here"}</em>
              )}
            </li>
          );
        })}
      </ol>
      <div className={styles.orderTiles} role="group" aria-label={language === "hi" ? "चरण चुनो" : "Choose steps"}>
        {check.display.filter((id) => !placed.includes(id)).map((id) => (
          <button type="button" disabled={locked} onClick={() => onChange([...placed, id])} key={id}>{byId.get(id)!.label[language]}</button>
        ))}
      </div>
    </div>
  );
}

function CheckCard({ item, marbleEvidence, position, total, language, onAnswered, onNext }: {
  item: SessionItem;
  marbleEvidence: string;
  position: number;
  total: number;
  language: NarrationLanguage;
  /** Returns whether a fresh variant of this statement was queued next. */
  onAnswered: (check: UnderstandingCheck, outcome: CheckOutcome, confidence: Confidence, hinted: boolean) => boolean;
  onNext: () => void;
}) {
  const check = useMemo(() => checkFor(item.topicId, item.evidenceIndex, item.variant)!, [item]);
  const copy = climbTopicCopy(item.topicId)!;
  const [answer, setAnswer] = useState<CheckAnswer | null>(() => initialAnswer(check));
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [hinted, setHinted] = useState(false);
  const [outcome, setOutcome] = useState<CheckOutcome | null>(null);
  const [anotherQueued, setAnotherQueued] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const locked = outcome !== null;

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: false });
  }, []);

  useEffect(() => {
    if (outcome) feedbackRef.current?.focus();
  }, [outcome]);

  const submit = () => {
    if (!answer || !confidence || !answerReady(check, answer)) return;
    const result = evaluateCheck(check, answer);
    setOutcome(result);
    setAnotherQueued(onAnswered(check, result, confidence, hinted));
  };

  const selectedOption = answer?.kind === "choice" && check.response.kind === "choice"
    ? check.response.options.find((option) => option.id === answer.optionId) ?? null
    : null;
  const correctOption = check.response.kind === "choice" ? check.response.options.find((option) => option.correct) ?? null : null;

  return (
    <article className={styles.checkCard} aria-labelledby={`check-${check.id}`}>
      <header className={styles.checkHeader}>
        <span className={styles.facetChip}>{FACET_COPY[check.facet][language]}</span>
        <span className={styles.checkCounter}>{language === "hi" ? `check ${position + 1} / ${total}` : `Check ${position + 1} of ${total}`}</span>
      </header>
      <p className={styles.checkTopic}>{copy.short[language]} · <span>{language === "hi" ? `Marble evidence ${check.evidenceIndex + 1}/3` : `Marble evidence ${check.evidenceIndex + 1} of 3`}</span></p>
      <h2 className={styles.checkPrompt} id={`check-${check.id}`} ref={headingRef} tabIndex={-1}>{check.prompt[language]}</h2>

      {check.visual && <div className={styles.checkVisual}><CheckVisualView visual={check.visual} language={language} /></div>}

      {check.response.kind === "choice" && (
        <div className={styles.choiceGrid} role="group" aria-label={language === "hi" ? "जवाब चुनो" : "Choose an answer"}>
          {check.response.options.map((option) => {
            const chosen = answer?.kind === "choice" && answer.optionId === option.id;
            const reveal = locked && (option.correct || chosen);
            return (
              <button
                className={`${styles.choice} ${chosen ? styles.choiceChosen : ""} ${reveal ? (option.correct ? styles.choiceRight : styles.choiceWrong) : ""}`}
                type="button"
                aria-pressed={chosen}
                disabled={locked}
                onClick={() => setAnswer({ kind: "choice", optionId: option.id })}
                key={option.id}
              >
                {option.visual?.kind === "dots" && <DotsVisual total={option.visual.total} groupSize={option.visual.groupSize} language={language} compact />}
                <span>{option.label[language]}</span>
              </button>
            );
          })}
        </div>
      )}
      {check.response.kind === "shade" && answer?.kind === "shade" && (
        <ShadeResponse parts={check.response.parts} target={check.response.target} shaded={answer.shaded} locked={locked} onChange={(shaded) => setAnswer({ kind: "shade", shaded })} language={language} />
      )}
      {check.response.kind === "hops" && answer?.kind === "hops" && (
        <HopsResponse denominator={check.response.denominator} max={check.response.max} hops={answer.hops} locked={locked} onChange={(hops) => setAnswer({ kind: "hops", hops })} language={language} />
      )}
      {check.response.kind === "order" && answer?.kind === "order" && (
        <OrderResponse check={check.response} placed={answer.tileIds} locked={locked} onChange={(tileIds) => setAnswer({ kind: "order", tileIds })} language={language} />
      )}

      {!locked && (
        <div className={styles.checkControls}>
          <div className={styles.hintRow}>
            {hinted ? (
              <p className={styles.hint} role="note"><BodhMark pose="guide" size="mark" motion="still" /> <span>{check.hint[language]}</span></p>
            ) : (
              <button className={styles.hintButton} type="button" onClick={() => setHinted(true)}>
                {language === "hi" ? "Bodh से hint लो" : "Ask Bodh for a hint"}
              </button>
            )}
          </div>
          <fieldset className={styles.confidence}>
            <legend>{language === "hi" ? "तुम्हें कितना पक्का लग रहा है? (इसका कोई गलत जवाब नहीं)" : "How sure do you feel? (There is no wrong answer here.)"}</legend>
            {(["sure", "think", "guess"] as const).map((level) => (
              <label className={confidence === level ? styles.confidenceActive : ""} key={level}>
                <input type="radio" name={`confidence-${check.id}`} value={level} checked={confidence === level} onChange={() => setConfidence(level)} />
                <span>{CONFIDENCE_COPY[level][language]}</span>
              </label>
            ))}
          </fieldset>
          <button className="button button-primary" type="button" disabled={!confidence || !answerReady(check, answer)} onClick={submit}>
            {language === "hi" ? "जाँचो" : "Check"} <span aria-hidden="true">→</span>
          </button>
        </div>
      )}

      {outcome && confidence && (
        <div className={`${styles.feedback} ${outcome.correct ? styles.feedbackRight : styles.feedbackNotYet}`} role="status" tabIndex={-1} ref={feedbackRef}>
          <BodhMark pose={outcome.correct ? "celebrate" : "listen"} size="small" motion={outcome.correct ? "celebrate" : "listen"} />
          <div>
            <strong>{feedbackHeadline(outcome, confidence, hinted, anotherQueued)[language]}</strong>
            {outcome.why && <p>{outcome.why[language]}</p>}
            {!outcome.correct && correctOption && selectedOption && (
              <p className={styles.feedbackKey}>{language === "hi" ? "सही जवाब: " : "The answer: "}<b>{correctOption.label[language]}</b></p>
            )}
            <p className={styles.feedbackIdea}><span>{language === "hi" ? "Idea:" : "The idea:"}</span> {check.explanation[language]}</p>
            {outcome.misconceptionId && (
              <p className={styles.feedbackSignal}>{language === "hi" ? "फिर से बनाने वाली idea: " : "Idea to rebuild: "}{MISCONCEPTIONS[outcome.misconceptionId].label[language]}</p>
            )}
          </div>
          <button className="button button-primary" type="button" onClick={onNext}>
            {position + 1 < total ? (language === "hi" ? "अगला check" : "Next check") : (language === "hi" ? "मेरा evidence देखें" : "See my evidence")} <span aria-hidden="true">→</span>
          </button>
        </div>
      )}

      <details className={styles.marbleNote}>
        <summary>{language === "hi" ? "यह check क्या जाँचता है?" : "What does this check?"}</summary>
        <p>{copy.evidence[check.evidenceIndex][language]}</p>
        <p lang="en"><small>Marble evidence statement:</small> “{marbleEvidence}”</p>
      </details>
    </article>
  );
}

export function ClimbSession({ items, graph, language, title, onExit, onFinish }: {
  items: readonly SessionItem[];
  graph: CurriculumGraph;
  language: NarrationLanguage;
  title: LocalizedText;
  onExit: () => void;
  onFinish: (results: readonly SessionResult[]) => void;
}) {
  const [queue, setQueue] = useState<readonly SessionItem[]>(items);
  const [position, setPosition] = useState(0);
  const [results, setResults] = useState<readonly SessionResult[]>([]);

  const recordAnswer = (check: UnderstandingCheck, outcome: CheckOutcome, confidence: Confidence, hinted: boolean) => {
    const updated = recordAttempt(currentUnderstandingLedger(), {
      topicId: check.topicId,
      evidenceIndex: check.evidenceIndex,
      variant: check.variant,
      correct: outcome.correct,
      confidence,
      hinted,
      misconceptionId: outcome.misconceptionId,
      at: Date.now(),
    });
    saveUnderstandingLedger(updated);
    setResults((current) => [...current, { topicId: check.topicId, evidenceIndex: check.evidenceIndex, correct: outcome.correct, confidence, hinted }]);

    const needsAnother = !outcome.correct || confidence === "guess" || hinted;
    const extrasSoFar = queue.filter((entry) => entry.extra && entry.topicId === check.topicId && entry.evidenceIndex === check.evidenceIndex).length;
    // Re-asking a question whose answer the feedback just showed is not evidence, so only fresh variants are queued.
    const freshVariants = variantCount(check.topicId, check.evidenceIndex) - 1;
    if (needsAnother && extrasSoFar < Math.min(MAX_EXTRA_PER_STATEMENT, freshVariants)) {
      const next: SessionItem = {
        topicId: check.topicId,
        evidenceIndex: check.evidenceIndex,
        variant: nextVariantFor(updated, check.topicId, check.evidenceIndex),
        extra: true,
      };
      setQueue((current) => [...current.slice(0, position + 1), next, ...current.slice(position + 1)]);
      return true;
    }
    return false;
  };

  const goNext = () => {
    if (position + 1 >= queue.length) {
      onFinish(results);
      return;
    }
    setPosition(position + 1);
  };

  const item = queue[position];
  return (
    <section className={styles.session} aria-labelledby="climb-session-title">
      <div className={styles.sessionTop}>
        <button className={styles.backButton} type="button" onClick={onExit}><span aria-hidden="true">←</span> {language === "hi" ? "Map पर लौटें" : "Back to the map"}</button>
        <h1 id="climb-session-title">{title[language]}</h1>
        <ol className={styles.sessionDots} aria-label={language === "hi" ? "Session progress" : "Session progress"}>
          {queue.map((entry, index) => {
            const result = results[index];
            return (
              <li
                className={index === position ? styles.sessionDotCurrent : result ? (result.correct ? styles.sessionDotRight : styles.sessionDotAgain) : ""}
                aria-current={index === position ? "step" : undefined}
                key={`${entry.topicId}-${entry.evidenceIndex}-${entry.variant}-${index}`}
              >
                <span className={styles.srOnly}>{index + 1}</span>
              </li>
            );
          })}
        </ol>
      </div>
      {item && (
        <CheckCard
          key={`${position}-${item.topicId}-${item.evidenceIndex}-${item.variant}`}
          item={item}
          marbleEvidence={graph.topicById.get(item.topicId)?.evidence[item.evidenceIndex] ?? ""}
          position={position}
          total={queue.length}
          language={language}
          onAnswered={recordAnswer}
          onNext={goNext}
        />
      )}
    </section>
  );
}
