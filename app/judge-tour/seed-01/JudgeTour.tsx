"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  JUDGE_TOUR_STEPS,
  SELECTED_JUDGE_SEED,
} from "../../../lib/judge-experience";
import { BodhMark } from "../../components/BodhMark";
import { setNarrationLanguage } from "../../components/NarrationLanguageToggle";
import styles from "../../components/JudgeExperience.module.css";

export function JudgeTour() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeStep = JUDGE_TOUR_STEPS[activeIndex];
  const isLast = activeIndex === JUDGE_TOUR_STEPS.length - 1;

  useEffect(() => {
    setNarrationLanguage("en");
  }, []);

  return (
    <main className={styles.tourPage} id="main-content" lang="en">
      <header className={styles.tourHeader}>
        <Link className="back-link" href="/">
          <span aria-hidden="true">←</span> Back
        </Link>
        <Link className="brand brand-compact" href="/" aria-label="Bodh home">
          <BodhMark size="mark" motion="still" priority />
          <span className="brand-copy"><strong>BODH</strong></span>
        </Link>
        <span className={styles.tourLabel}>90-second judge tour</span>
      </header>

      <section className={styles.tourIntro} aria-labelledby="judge-tour-title">
        <span className={styles.tourEyebrow}>One real seeded doubt · four checkpoints</span>
        <h1 id="judge-tour-title">See the learning logic before the polished demo.</h1>
        <p>
          This guided overview uses the committed <strong>{SELECTED_JUDGE_SEED.caseId}</strong> fixture.
          It takes about 90 seconds and keeps every claim inside what the product actually records.
        </p>
      </section>

      <section className={styles.tourFrame} aria-label="Bodh guided judge tour">
        <ol className={styles.tourProgress} aria-label="Tour checkpoints">
          {JUDGE_TOUR_STEPS.map((step, index) => (
            <li key={step.id}>
              <button
                type="button"
                aria-pressed={index === activeIndex}
                onClick={() => setActiveIndex(index)}
              >
                {index + 1}. {step.shortLabel}
                <span>{step.time}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className={styles.tourBody}>
          <aside className={styles.seedCard} aria-label="Selected seeded doubt">
            <div className={styles.seedTopline}>
              <span className={styles.seedId}>{SELECTED_JUDGE_SEED.caseId}</span>
              <span className={styles.seedStatus}>Committed fixture</span>
            </div>
            <p className={styles.seedEquation} aria-label="three quarters divided by one eighth">
              {SELECTED_JUDGE_SEED.problem}
            </p>
            <div className={styles.quarterStrip} role="img" aria-label="Three of four equal quarters are shaded">
              <span /><span /><span /><span />
            </div>
            <p className={styles.seedWork}>
              <strong>Visible work:</strong> {SELECTED_JUDGE_SEED.visibleWork}
            </p>
            <blockquote className={styles.seedQuote} lang="hi">
              “{SELECTED_JUDGE_SEED.learnerWords}”
            </blockquote>
          </aside>

          <article
            className={styles.stepPanel}
            aria-labelledby={`judge-step-${activeStep.id}`}
            aria-live="polite"
          >
            <div className={styles.stepHeading}>
              <div>
                <span className={styles.stepTime}>{activeStep.time}</span>
                <h2 id={`judge-step-${activeStep.id}`}>{activeStep.title}</h2>
              </div>
              <BodhMark pose={activeStep.pose} size="small" motion={activeStep.pose} />
            </div>
            <p className={styles.stepBody}>{activeStep.body}</p>
            <p className={styles.stepEvidence}>{activeStep.evidence}</p>
            <div className={styles.tourActions}>
              <button
                className={styles.tourActionQuiet}
                type="button"
                disabled={activeIndex === 0}
                onClick={() => setActiveIndex((current) => Math.max(0, current - 1))}
              >
                ← Previous
              </button>
              {isLast ? (
                <Link
                  className={styles.tourAction}
                  href={SELECTED_JUDGE_SEED.journeyHref}
                  onClick={() => setNarrationLanguage("en")}
                >
                  Open this seeded journey <span aria-hidden="true">→</span>
                </Link>
              ) : (
                <button
                  className={styles.tourAction}
                  type="button"
                  onClick={() => setActiveIndex((current) => Math.min(JUDGE_TOUR_STEPS.length - 1, current + 1))}
                >
                  Next checkpoint <span aria-hidden="true">→</span>
                </button>
              )}
            </div>
          </article>
        </div>
      </section>

      <p className={styles.tourBoundary}>
        Guided overview only. The learner journey remains self-paced, probe-first, and evidence-gated.
      </p>
    </main>
  );
}
