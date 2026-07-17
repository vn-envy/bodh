import { DIAGNOSTIC_RELEASE_EVIDENCE } from "../../lib/judge-experience";
import type { NarrationLanguage } from "../../lib/narration-language";
import styles from "./JudgeExperience.module.css";

const localized = {
  hi: {
    eyebrow: "मापा गया, वादा नहीं",
    title: "32 synthetic cases में diagnosis safety को जाँचा गया।",
    intro:
      "Corpus पहले से versioned था: आठ original seeds, 16 reviewed development cases, और आठ frozen holdouts। Recorded release run में सभी 32 cases पर एक ही model और prompt pair इस्तेमाल हुआ।",
    seeds: "original seed cases",
    development: "reviewed development cases",
    holdout: "frozen holdout cases",
    total: "कुल synthetic cases",
    checksTitle: "हर case में क्या check हुआ",
    checks: [
      "Equation और दिखे हुए tokens बिल्कुल सुरक्षित रहे",
      "Concept IDs committed Marble curriculum slice के अंदर रहे",
      "Misconception plausible रही, probe teaching से पहले आया, और Hindi bridge मौजूद रहा",
      "Trace fields bounded, privacy-minimised, और model/prompt metadata से मेल खाते रहे",
    ],
    resultTitle: "Recorded live diagnostic run",
    resultDate: "16 July 2026 UTC को recorded",
    resultLabel: "cases पास · frozen holdout 8/8",
    boundary:
      "यह एक recorded model, prompt, corpus, और source commit पर synthetic diagnostic-safety result है। यह classroom efficacy, long-term mastery, या learner outcomes का evidence नहीं है।",
  },
  en: {
    eyebrow: "Measured, not promised",
    title: "Diagnostic safety was checked across 32 synthetic cases.",
    intro:
      "The corpus was versioned first: eight original seeds, 16 reviewed development cases, and eight frozen holdouts. The recorded release run used one model and prompt pair across all 32 cases.",
    seeds: "original seed cases",
    development: "reviewed development cases",
    holdout: "frozen holdout cases",
    total: "synthetic cases total",
    checksTitle: "What every case checked",
    checks: DIAGNOSTIC_RELEASE_EVIDENCE.checks,
    resultTitle: "Recorded live diagnostic run",
    resultDate: "Recorded 16 July 2026 UTC",
    resultLabel: "cases passed · frozen holdout 8/8",
    boundary: DIAGNOSTIC_RELEASE_EVIDENCE.boundary,
  },
} as const;

export function MeasuredEvaluation({ language }: { language: NarrationLanguage }) {
  const text = localized[language];
  const { corpus, recordedLiveResult } = DIAGNOSTIC_RELEASE_EVIDENCE;

  return (
    <section className={styles.evaluation} aria-labelledby="measured-evaluation-title" lang={language}>
      <div className={styles.evaluationHeader}>
        <span className={styles.evaluationEyebrow}>{text.eyebrow}</span>
        <h2 id="measured-evaluation-title">{text.title}</h2>
        <p>{text.intro}</p>
      </div>

      <div
        className={styles.corpusFormula}
        role="group"
        aria-label={`${corpus.seeds} + ${corpus.development} + ${corpus.frozenHoldout} = ${corpus.total}`}
      >
        <div className={styles.corpusCard}>
          <strong>{corpus.seeds}</strong>
          <span>{text.seeds}</span>
        </div>
        <span className={styles.corpusOperator} aria-hidden="true">+</span>
        <div className={styles.corpusCard}>
          <strong>{corpus.development}</strong>
          <span>{text.development}</span>
        </div>
        <span className={styles.corpusOperator} aria-hidden="true">+</span>
        <div className={styles.corpusCard}>
          <strong>{corpus.frozenHoldout}</strong>
          <span>{text.holdout}</span>
        </div>
        <span className={styles.corpusOperator} aria-hidden="true">=</span>
        <div className={`${styles.corpusCard} ${styles.corpusTotal}`}>
          <strong>{corpus.total}</strong>
          <span>{text.total}</span>
        </div>
      </div>

      <div className={styles.evaluationGrid}>
        <div className={styles.checks}>
          <h3>{text.checksTitle}</h3>
          <ul>
            {text.checks.map((check) => <li key={check}>{check}</li>)}
          </ul>
        </div>

        {recordedLiveResult ? (
          <aside className={styles.recordedResult} aria-label={text.resultTitle}>
            <h3>{text.resultTitle}</h3>
            <span className={styles.resultDate}>{text.resultDate}</span>
            <strong className={styles.resultNumber}>
              {recordedLiveResult.passed}/{corpus.total}
            </strong>
            <span className={styles.resultLabel}>{text.resultLabel}</span>
            <p className={styles.resultMeta} lang="en">
              {recordedLiveResult.model} · prompt {recordedLiveResult.promptVersion}<br />
              source {recordedLiveResult.sourceCommit.slice(0, 8)} · suite {recordedLiveResult.suite}
            </p>
          </aside>
        ) : null}
      </div>

      <p className={styles.evaluationBoundary}>{text.boundary}</p>
    </section>
  );
}
