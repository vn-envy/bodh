"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { NarrationLanguage } from "../../lib/narration-language";
import {
  SEEDED_JOURNEY_STORAGE_KEY,
  parseSeedJourneyHandoff,
  seedLessonById,
  type SeedJourneyHandoff,
  type SeedLessonVisual,
} from "../../lib/seeded-journey";
import { seededDoubtById } from "../../lib/seeded-doubts";
import { BodhMark } from "../components/BodhMark";
import { CurriculumClimb } from "../components/CurriculumClimb";
import { NarrationLanguageToggle, useNarrationLanguage } from "../components/NarrationLanguageToggle";
import styles from "./SeededLearningJourney.module.css";

type CheckState = "idle" | "try-again" | "correct";

const subscribeToHydration = () => () => {};
const browserHydrated = () => true;
const serverHydrated = () => false;

function FitArtifact({
  visual,
  language,
  onComplete,
}: {
  visual: Extract<SeedLessonVisual, { kind: "fit" }>;
  language: NarrationLanguage;
  onComplete: () => void;
}) {
  const groupedWholes = visual.wholeCount > 1;
  const [openedWholes, setOpenedWholes] = useState(0);
  const [countedUnits, setCountedUnits] = useState(0);
  const visibleCount = groupedWholes ? openedWholes * visual.denominator : countedUnits;
  const complete = visibleCount === visual.activeUnits;

  useEffect(() => {
    if (complete) onComplete();
  }, [complete, onComplete]);

  return (
    <section className={styles.fitArtifact} aria-label={language === "hi" ? `${visual.amountLabel} में ${visual.unitLabel} groups गिनें` : `Count ${visual.unitLabel} groups in ${visual.amountLabel}`}>
      <div className={styles.fitEquation} aria-live="polite">
        <span>{visual.amountLabel}</span>
        <b>÷</b>
        <span>{visual.unitLabel}</span>
        <b>=</b>
        <strong>{visibleCount || "?"}</strong>
      </div>

      <div className={styles.wholeStack}>
        {Array.from({ length: visual.wholeCount }, (_, wholeIndex) => {
          const opened = groupedWholes ? wholeIndex < openedWholes : true;
          const nextWhole = groupedWholes && wholeIndex === openedWholes;
          return (
            <div className={`${styles.wholeRow} ${opened ? styles.wholeOpened : ""}`} key={wholeIndex}>
              <button
                className={styles.wholeLabel}
                type="button"
                disabled={!groupedWholes || opened || !nextWhole}
                aria-pressed={opened}
                onClick={() => nextWhole && setOpenedWholes((count) => count + 1)}
              >
                <span>{language === "hi" ? `पूरा ${wholeIndex + 1}` : `Whole ${wholeIndex + 1}`}</span>
                <small>{opened ? `+${visual.denominator}` : language === "hi" ? "खोलो" : "open"}</small>
              </button>
              <div className={styles.unitTrack} style={{ gridTemplateColumns: `repeat(${visual.denominator}, minmax(0, 1fr))` }}>
                {Array.from({ length: visual.denominator }, (_, unitIndex) => {
                  const absoluteIndex = wholeIndex * visual.denominator + unitIndex;
                  const active = absoluteIndex < visual.activeUnits;
                  const counted = groupedWholes ? opened && active : absoluteIndex < countedUnits;
                  const nextUnit = !groupedWholes && active && absoluteIndex === countedUnits;
                  return (
                    <button
                      className={`${styles.unitPiece} ${active ? styles.unitActive : styles.unitOutside} ${counted ? styles.unitCounted : ""}`}
                      type="button"
                      disabled={groupedWholes || !nextUnit}
                      aria-pressed={counted}
                      aria-label={language === "hi"
                        ? `${visual.unitLabel} group ${absoluteIndex + 1}${counted ? ", गिना" : nextUnit ? ", गिनने के लिए tap करें" : ""}`
                        : `${visual.unitLabel} group ${absoluteIndex + 1}${counted ? ", counted" : nextUnit ? ", tap to count" : ""}`}
                      onClick={() => nextUnit && setCountedUnits((count) => count + 1)}
                      key={unitIndex}
                    >
                      <span>{active && (opened || !groupedWholes) ? visual.unitLabel : ""}</span>
                      <small>{counted ? groupedWholes ? absoluteIndex + 1 : countedUnits >= absoluteIndex + 1 ? absoluteIndex + 1 : "" : nextUnit ? "+" : ""}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className={styles.artifactStatus} role="status" aria-live="polite">
        {complete
          ? language === "hi" ? `${visibleCount} groups · बिल्कुल fit` : `${visibleCount} groups · exact fit`
          : groupedWholes
            ? language === "hi" ? `अभी ${visibleCount} ${visual.unitLabel} groups दिखे` : `${visibleCount} ${visual.unitLabel} groups visible so far`
            : language === "hi" ? `अगला coloured ${visual.unitLabel} tap करो` : `Tap the next coloured ${visual.unitLabel}`}
      </p>
    </section>
  );
}

function ShareArtifact({ language, onComplete }: { language: NarrationLanguage; onComplete: () => void }) {
  const [split, setSplit] = useState(false);
  const [shared, setShared] = useState(0);
  const complete = split && shared === 4;

  useEffect(() => {
    if (complete) onComplete();
  }, [complete, onComplete]);

  return (
    <section className={styles.shareArtifact} aria-label={language === "hi" ? "एक third को चार बराबर shares में बाँटो" : "Share one-third equally into four"}>
      <div className={styles.shareWhole}>
        {Array.from({ length: 12 }, (_, index) => (
          <span className={`${styles.shareCell} ${index < 4 ? styles.shareCellActive : ""} ${split && index < shared ? styles.shareCellGiven : ""}`} key={index}>
            {split && index < 4 ? <small>1/12</small> : index === 1 && !split ? <strong>1/3</strong> : null}
          </span>
        ))}
      </div>
      {!split ? (
        <button className={styles.artifactAction} type="button" onClick={() => setSplit(true)}>
          {language === "hi" ? "1/3 को 4 equal shares में split करें" : "Split one-third into four equal shares"}
        </button>
      ) : (
        <div className={styles.shareFriends}>
          {Array.from({ length: 4 }, (_, index) => {
            const given = index < shared;
            const next = index === shared;
            return (
              <button type="button" disabled={!next} aria-pressed={given} onClick={() => next && setShared((count) => count + 1)} key={index}>
                <span aria-hidden="true">{given ? "●" : "○"}</span>
                <strong>{language === "hi" ? `share ${index + 1}` : `Share ${index + 1}`}</strong>
                <small>{given ? "1/12" : next ? language === "hi" ? "दो" : "give" : "—"}</small>
              </button>
            );
          })}
        </div>
      )}
      <p className={styles.artifactStatus} role="status" aria-live="polite">
        {complete
          ? language === "hi" ? "चार बराबर shares · हर share 1/12" : "Four equal shares · each share is 1/12"
          : split
            ? language === "hi" ? "हर friend को एक mini-piece दो" : "Give one mini-piece to each friend"
            : language === "hi" ? "वही 1/3 amount रहेगी—सिर्फ shares छोटे होंगे" : "The same one-third remains—the shares become smaller"}
      </p>
    </section>
  );
}

function PairArtifact({ language, onComplete }: { language: NarrationLanguage; onComplete: () => void }) {
  const [groups, setGroups] = useState(0);
  const complete = groups === 3;

  useEffect(() => {
    if (complete) onComplete();
  }, [complete, onComplete]);

  return (
    <section className={styles.pairArtifact} aria-label={language === "hi" ? "पाँच sixths को thirds में group करें" : "Group five-sixths into thirds"}>
      <div className={styles.sixthTrack}>
        {Array.from({ length: 6 }, (_, index) => (
          <span className={index < 5 ? styles.sixthActive : styles.sixthEmpty} key={index}>1/6</span>
        ))}
      </div>
      <div className={styles.pairGroups}>
        {[0, 1, 2].map((index) => {
          const revealed = index < groups;
          const next = index === groups;
          const half = index === 2;
          return (
            <button type="button" disabled={!next} aria-pressed={revealed} onClick={() => next && setGroups((count) => count + 1)} key={index}>
              <span>{revealed ? half ? "1/6 + □" : "1/6 + 1/6" : "? + ?"}</span>
              <strong>{revealed ? half ? language === "hi" ? "आधा 1/3 group" : "half of a 1/3 group" : "1/3" : language === "hi" ? `group ${index + 1} खोलो` : `reveal group ${index + 1}`}</strong>
            </button>
          );
        })}
      </div>
      <p className={styles.artifactStatus} role="status" aria-live="polite">
        {complete
          ? language === "hi" ? "2 पूरे groups + 1 आधा group = 2 1/2 groups" : "2 whole groups + 1 half-group = 2 1/2 groups"
          : language === "hi" ? "हर 1/3 group के लिए दो sixths जोड़ो" : "Combine two sixths for each one-third group"}
      </p>
    </section>
  );
}

function SeedRepairArtifact({
  visual,
  language,
  onComplete,
}: {
  visual: SeedLessonVisual;
  language: NarrationLanguage;
  onComplete: () => void;
}) {
  if (visual.kind === "fit") return <FitArtifact visual={visual} language={language} onComplete={onComplete} />;
  if (visual.kind === "share") return <ShareArtifact language={language} onComplete={onComplete} />;
  if (visual.kind === "pair") return <PairArtifact language={language} onComplete={onComplete} />;
  return (
    <section className={styles.clarifyArtifact}>
      <strong>{language === "hi" ? "? ÷ ?" : "? ÷ ?"}</strong>
      <p>{language === "hi" ? "साफ़ equation मिलने तक कोई concept guess नहीं।" : "No concept is guessed until the equation is readable."}</p>
    </section>
  );
}

function MissingJourney({ language }: { language: NarrationLanguage }) {
  return (
    <main className={`journey-shell ${styles.shell}`} id="main-content" lang={language}>
      <header className="journey-header">
        <Link className="brand brand-compact" href="/" aria-label="Bodh home">
          <BodhMark size="mark" motion="still" priority />
          <span className="brand-copy"><strong>BODH</strong></span>
        </Link>
        <NarrationLanguageToggle compact />
      </header>
      <section className={styles.missingCard}>
        <BodhMark pose="listen" size="medium" motion="listen" />
        <span className="eyebrow">{language === "hi" ? "Live handoff चाहिए" : "Live handoff required"}</span>
        <h1>{language === "hi" ? "पहले Bodh को एक reviewed doubt सुनाएँ।" : "Let Bodh hear a reviewed doubt first."}</h1>
        <p>{language === "hi" ? "यह page केवल successful live diagnosis के बाद उसी सवाल की repair खोलता है।" : "This page opens the matching repair only after a successful live diagnosis."}</p>
        <div className={styles.missingActions}>
          <Link className="button button-primary" href="/diagnose">{language === "hi" ? "Reviewed doubt चुनें" : "Choose a reviewed doubt"}</Link>
          <Link className="button button-secondary" href="/demo">{language === "hi" ? "Curated fallback देखें" : "Open curated fallback"}</Link>
        </div>
      </section>
    </main>
  );
}

export function SeededLearningJourney() {
  const language = useNarrationLanguage();
  const hydrated = useSyncExternalStore(subscribeToHydration, browserHydrated, serverHydrated);
  const [visualComplete, setVisualComplete] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<string | null>(null);
  const [checkState, setCheckState] = useState<CheckState>("idle");
  const [receiptVisible, setReceiptVisible] = useState(false);

  const handoff = useMemo<SeedJourneyHandoff | null>(() => {
    if (!hydrated) return null;
    let parsed: SeedJourneyHandoff | null = null;
    try {
      parsed = parseSeedJourneyHandoff(window.sessionStorage.getItem(SEEDED_JOURNEY_STORAGE_KEY));
      const requestedSeed = new URLSearchParams(window.location.search).get("seed");
      if (parsed?.seedId !== requestedSeed) parsed = null;
    } catch {
      parsed = null;
    }
    return parsed;
  }, [hydrated]);

  const lesson = useMemo(() => seedLessonById(handoff?.seedId), [handoff]);
  const seed = useMemo(() => seededDoubtById(handoff?.seedId), [handoff]);

  if (!hydrated) {
    return (
      <main className={`journey-shell ${styles.shell}`} id="main-content" aria-busy="true">
        <header className="journey-header">
          <span className="brand brand-compact"><BodhMark size="mark" motion="breathe" priority /><span className="brand-copy"><strong>BODH</strong></span></span>
        </header>
        <section className={styles.loadingCard}>
          <BodhMark pose="guide" size="medium" motion="guide" />
          <span className="eyebrow">Live doubt → visual repair</span>
          <h1>{language === "hi" ? "तुम्हारा exact सवाल साथ ला रहे हैं…" : "Carrying your exact question into the repair…"}</h1>
        </section>
      </main>
    );
  }

  if (!handoff || !lesson || !seed) return <MissingJourney language={language} />;

  const checkAnswer = () => {
    const option = lesson.check.options.find((candidate) => candidate.id === selectedCheck);
    setCheckState(option?.correct ? "correct" : "try-again");
  };

  const startAnotherDoubt = () => {
    try {
      window.sessionStorage.removeItem(SEEDED_JOURNEY_STORAGE_KEY);
    } catch {
      // The next intake also clears stale handoffs.
    }
  };

  return (
    <main className={`journey-shell ${styles.shell}`} id="main-content" lang={language}>
      <header className="journey-header">
        <Link className="back-link" href="/diagnose"><span aria-hidden="true">←</span> {language === "hi" ? "Diagnosis" : "Diagnosis"}</Link>
        <Link className="brand brand-compact" href="/" aria-label="Bodh home">
          <BodhMark size="mark" motion="still" priority />
          <span className="brand-copy"><strong>BODH</strong></span>
        </Link>
        <div className="journey-header-tools"><span className="fixture-label">Live repair</span><NarrationLanguageToggle compact /></div>
      </header>

      <ol className={styles.progress} aria-label={language === "hi" ? "Learning journey progress" : "Learning journey progress"}>
        <li className={styles.progressDone}><span>1</span><strong>{language === "hi" ? "Live doubt" : "Live doubt"}</strong></li>
        <li className={visualComplete ? styles.progressDone : styles.progressCurrent}><span>2</span><strong>{language === "hi" ? "Picture" : "Picture"}</strong></li>
        <li className={checkState === "correct" ? styles.progressDone : visualComplete ? styles.progressCurrent : ""}><span>3</span><strong>{language === "hi" ? "Meaning check" : "Meaning check"}</strong></li>
        <li className={receiptVisible ? styles.progressCurrent : ""}><span>4</span><strong>{language === "hi" ? "Receipt" : "Receipt"}</strong></li>
      </ol>

      {!receiptVisible ? (
        <article className={styles.lessonCard}>
          <section className={styles.lessonIntro}>
            <div>
              <span className={styles.liveBadge}><i aria-hidden="true" /> {language === "hi" ? "Live OpenAI diagnosis" : "Live OpenAI diagnosis"}</span>
              <span className="eyebrow">{seed.concept[language]}</span>
              <h1>{lesson.title[language]}</h1>
              <p>{lesson.promise[language]}</p>
              <div className={styles.traceLine}>
                <span>{handoff.model}</span><span>{handoff.promptVersion}</span><span>{handoff.seedId}</span>
              </div>
            </div>
            <BodhMark pose={visualComplete ? "tinker" : "guide"} size="large" motion={visualComplete ? "tinker" : "guide"} />
          </section>

          <section className={styles.questionCarry} aria-label={language === "hi" ? "तुम्हारा exact सवाल" : "Your exact question"}>
            <span>{language === "hi" ? "Bodh यही doubt साथ लाया" : "Bodh carried this exact doubt"}</span>
            <strong>{handoff.canonicalEquation}</strong>
            <p>{lesson.diagnosis[language]}</p>
          </section>

          <section className={styles.atomicRow} aria-label={language === "hi" ? "तीन छोटी ideas" : "Three small ideas"}>
            {lesson.atomicIdeas.map((idea, index) => (
              <article key={index}><span>{index + 1}</span><p>{idea[language]}</p></article>
            ))}
          </section>

          <section className={styles.interactionCard}>
            <div className={styles.interactionHeading}>
              <div><span className="reasoning-label">{language === "hi" ? "अब picture से बनाओ" : "Now build it with a picture"}</span><h2>{lesson.interactionTitle[language]}</h2><p>{lesson.interactionHelp[language]}</p></div>
              <BodhMark pose="tinker" size="small" motion="tinker" />
            </div>
            <SeedRepairArtifact key={lesson.seedId} visual={lesson.visual} language={language} onComplete={() => setVisualComplete(true)} />
            {visualComplete && <p className={styles.completionCopy}>{lesson.completion[language]}</p>}
          </section>

          {visualComplete && (
            <section className={styles.meaningCheck} aria-labelledby="seed-meaning-check-title">
              <span className="reasoning-label">{language === "hi" ? "एक छोटा transfer check" : "One small transfer check"}</span>
              <h2 id="seed-meaning-check-title">{lesson.check.question[language]}</h2>
              <div className={styles.checkOptions} role="group" aria-label={lesson.check.question[language]}>
                {lesson.check.options.map((option) => (
                  <button
                    className={selectedCheck === option.id ? styles.checkSelected : ""}
                    type="button"
                    aria-pressed={selectedCheck === option.id}
                    onClick={() => { setSelectedCheck(option.id); setCheckState("idle"); }}
                    key={option.id}
                  >{option.label[language]}</button>
                ))}
              </div>
              {checkState === "try-again" && <p className={styles.gentleHint}>{language === "hi" ? "अभी नहीं—" : "Not yet—"}{lesson.check.hint[language]}</p>}
              {checkState === "correct" && <p className={styles.correctNote}>{language === "hi" ? "हाँ—अब picture और meaning जुड़े हुए हैं।" : "Yes—the picture and the meaning are connected now."}</p>}
              {checkState === "correct" ? (
                <button className="button button-primary" type="button" onClick={() => setReceiptVisible(true)}>{language === "hi" ? "मेरी understanding receipt बनाएँ" : "Make my understanding receipt"} <span aria-hidden="true">→</span></button>
              ) : (
                <button className="button button-primary" type="button" disabled={!selectedCheck} onClick={checkAnswer}>{language === "hi" ? "Meaning check करें" : "Check the meaning"} <span aria-hidden="true">→</span></button>
              )}
            </section>
          )}
        </article>
      ) : (
        <article className={styles.receiptCard}>
          <div className={styles.receiptBodh}><BodhMark pose="celebrate" size="large" motion="celebrate" /><span>{language === "hi" ? "समझ का नया foothold" : "A new foothold in understanding"}</span></div>
          <div className={styles.receiptCopy}>
            <span className="eyebrow">Live diagnosis · reviewed visual evidence</span>
            <h1>{language === "hi" ? "सिर्फ answer नहीं—meaning भी साथ गया।" : "Not just an answer—the meaning came with it."}</h1>
            <div className={styles.receiptQuestion}><span>{seed.title[language]}</span><strong>{handoff.canonicalEquation}</strong></div>
            <blockquote>{lesson.receiptIdea[language]}</blockquote>
            <p>{language === "hi" ? "यह आज की activity का evidence है—grade, score, या long-term mastery claim नहीं।" : "This is evidence from today's activity—not a grade, score, or long-term mastery claim."}</p>
            <div className={styles.receiptMeta}><span>✓ {handoff.model}</span><span>✓ {handoff.seedId}</span><span>✓ Marble grounded</span></div>
            <div className={styles.receiptActions}>
              <Link className="button button-primary" href="/diagnose" onClick={startAnotherDoubt}>{language === "hi" ? "एक और doubt लाएँ" : "Bring another doubt"}</Link>
              <Link className="button button-secondary" href="/demo">{language === "hi" ? "Curated fallback देखें" : "See the curated fallback"}</Link>
            </div>
          </div>
        </article>
      )}

      <CurriculumClimb language={language} focusTopicId={seed.focusTopicId} goalTopicId={seed.goalTopicId} />
    </main>
  );
}
