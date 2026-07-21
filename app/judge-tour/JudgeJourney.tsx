"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type Ref } from "react";
import {
  JUDGE_SEEDS,
  JUDGE_TOUR_STEPS,
} from "../../lib/judge-experience";
import { BodhMark } from "../components/BodhMark";
import { setNarrationLanguage } from "../components/NarrationLanguageToggle";
import styles from "../components/JudgeExperience.module.css";

type DiagnosisStatus = "waiting" | "loading" | "live" | "curated";
type ScienceProbeChoice = "water-invisible-vapour" | "water-destroyed-by-sun" | "water-only-underground";
type TransferChoice = "same-matter" | "new-water" | "sun-destroyed";

type LiveScienceEvidence = Readonly<{
  model: string;
  promptVersion: string;
  persisted: boolean;
}>;

const SCIENCE_PROBE_OPTIONS: readonly Readonly<{
  id: ScienceProbeChoice;
  icon: string;
  label: string;
}>[] = [
  { id: "water-invisible-vapour", icon: "↗", label: "It still exists as invisible water vapour in the air" },
  { id: "water-destroyed-by-sun", icon: "☀", label: "The Sun destroyed the water" },
  { id: "water-only-underground", icon: "↓", label: "All of it stayed liquid and went underground" },
];

const TRANSFER_OPTIONS: readonly Readonly<{
  id: TransferChoice;
  icon: string;
  label: string;
}>[] = [
  { id: "same-matter", icon: "● → ○ → ●", label: "The same water moved into the air, then cooled into liquid drops" },
  { id: "new-water", icon: "+ ●", label: "The cold lid made brand-new water" },
  { id: "sun-destroyed", icon: "☀ ×", label: "The Sun destroyed the puddle water; the lid drops are unrelated" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * A live badge is earned only by the exact reviewed science seed completing a
 * real OpenAI diagnosis and selecting its reviewed artifact. Every other
 * response continues through the deterministic curated route without a live
 * claim.
 */
function liveScienceEvidence(value: unknown): LiveScienceEvidence | null {
  if (!isRecord(value) || value.mode !== "live") return null;
  const diagnosis = value.diagnosis;
  const next = value.next;
  const trace = value.trace;
  if (!isRecord(diagnosis) || diagnosis.source !== "openai") return null;
  if (!isRecord(diagnosis.inputFidelity)
    || diagnosis.inputFidelity.canonicalEquation !== JUDGE_SEEDS.science.problem
    || diagnosis.adaptiveProbeId !== "probe-water-still-exists") return null;
  if (!isRecord(next)
    || next.kind !== "seeded_artifact"
    || next.artifactKey !== JUDGE_SEEDS.science.caseId
    || next.href !== "/science/evaporation?live=seed-09") return null;
  if (!isRecord(trace)
    || typeof trace.model !== "string"
    || typeof trace.promptVersion !== "string"
    || typeof trace.persisted !== "boolean") return null;
  return {
    model: trace.model,
    promptVersion: trace.promptVersion,
    persisted: trace.persisted,
  };
}

function SeedCard({ subject }: { subject: keyof typeof JUDGE_SEEDS }) {
  const seed = JUDGE_SEEDS[subject];
  return (
    <article className={`${styles.journeySeed} ${subject === "science" ? styles.journeySeedScience : styles.journeySeedMath}`}>
      <div className={styles.seedTopline}>
        <span className={styles.seedId}>{seed.caseId}</span>
        <span className={styles.seedStatus}>Reviewed fixture · {seed.subject}</span>
      </div>
      <h3>{seed.title}</h3>
      <p className={styles.seedEquation}>{seed.problem}</p>
      <p className={styles.seedWork}><strong>What the learner tried:</strong> {seed.visibleWork}</p>
      <blockquote className={styles.seedQuote} lang="hi">“{seed.learnerWords}”</blockquote>
    </article>
  );
}

function MathsArtifact({
  repartitioned,
  count,
  onRepartition,
  onCount,
}: {
  repartitioned: boolean;
  count: number;
  onRepartition: () => void;
  onCount: (index: number) => void;
}) {
  return (
    <section className={styles.mathArtifact} aria-label="Interactive fraction representation">
      <div className={styles.artifactEquation}>
        <span>3/4</span><b>÷</b><span>1/8</span><b>=</b><strong>{count === 6 ? count : "?"}</strong>
      </div>
      {!repartitioned ? (
        <>
          <div className={styles.mathQuarterRail} role="img" aria-label="Three of four equal quarters are shaded">
            {Array.from({ length: 4 }, (_, index) => <span data-filled={index < 3} key={index}>1/4</span>)}
          </div>
          <button className={styles.artifactAction} type="button" onClick={onRepartition}>
            Repartition the same amount into eighths
          </button>
        </>
      ) : (
        <>
          <div className={styles.mathEighthRail} role="group" aria-label="Count one-eighth groups inside three-quarters">
            {Array.from({ length: 8 }, (_, index) => {
              const filled = index < 6;
              const counted = index < count;
              const next = filled && index === count;
              return (
                <button
                  type="button"
                  data-filled={filled}
                  data-counted={counted}
                  disabled={!next}
                  aria-pressed={counted}
                  aria-label={filled ? `One-eighth group ${index + 1}${next ? ", count this next" : counted ? ", counted" : ""}` : "Outside three-quarters"}
                  onClick={() => next && onCount(index)}
                  key={index}
                >
                  <span>1/8</span>
                  <small>{counted ? index + 1 : next ? "+" : ""}</small>
                </button>
              );
            })}
          </div>
          <p className={styles.artifactPrompt} role="status" aria-live="polite">
            {count === 6
              ? "Six one-eighth-size groups exactly fill three-quarters. The quotient is a group count."
              : `Tap the next peach one-eighth. ${count} counted so far.`}
          </p>
        </>
      )}
    </section>
  );
}

function ScienceDiagnosis({
  status,
  evidence,
  choice,
  onChoose,
}: {
  status: DiagnosisStatus;
  evidence: LiveScienceEvidence | null;
  choice: ScienceProbeChoice | null;
  onChoose: (choice: ScienceProbeChoice) => void;
}) {
  return (
    <section className={styles.scienceDiagnosis} aria-label="Science diagnosis and reviewed probe">
      <div className={styles.diagnosisStatus} data-status={status} role="status" aria-live="polite">
        <span className={styles.liveDot} aria-hidden="true" />
        <div>
          <strong>{status === "loading"
            ? "Calling OpenAI with the exact reviewed seed…"
            : status === "live"
              ? "Live OpenAI diagnosis"
              : "Reviewed deterministic route"}</strong>
          <small>{status === "loading"
            ? "The visual route remains available if the call pauses."
            : status === "live" && evidence
              ? `${evidence.model} · ${evidence.promptVersion}${evidence.persisted ? " · privacy-minimised trace saved" : ""}`
              : "Live diagnosis was not claimed; the committed seed continues safely."}</small>
        </div>
      </div>

      <div className={styles.scienceQuestion}>
        <span>One short probe · no answer shown first</span>
        <h3>The puddle became smaller. What could have happened to its water?</h3>
      </div>
      <div className={styles.scienceProbeOptions} role="group" aria-label="Possible explanations for the shrinking puddle">
        {SCIENCE_PROBE_OPTIONS.map((option) => (
          <button
            type="button"
            className={choice === option.id ? styles.optionSelected : ""}
            aria-pressed={choice === option.id}
            onClick={() => onChoose(option.id)}
            key={option.id}
          >
            <span aria-hidden="true">{option.icon}</span>
            <strong>{option.label}</strong>
          </button>
        ))}
      </div>
      {choice && <p className={styles.neutralProbeNote}>This is not a grade. Bodh uses the choice only to decide where the reviewed explanation should begin.</p>}
    </section>
  );
}

function TransferArtifact({
  lidPlaced,
  choice,
  onPlaceLid,
  onChoose,
}: {
  lidPlaced: boolean;
  choice: TransferChoice | null;
  onPlaceLid: () => void;
  onChoose: (choice: TransferChoice) => void;
}) {
  const correct = choice === "same-matter";
  return (
    <section className={styles.transferArtifact} aria-label="Cold lid transfer experiment">
      <div className={styles.invariantPair}>
        <article>
          <span>MATHEMATICS</span>
          <strong>Same amount</strong>
          <p>Quarter pieces became eighth pieces; the shaded amount stayed fixed.</p>
        </article>
        <BodhMark pose="guide" size="small" motion="guide" />
        <article>
          <span>SCIENCE</span>
          <strong>Same water</strong>
          <p>Now test whether matter can stay present while its state and location change.</p>
        </article>
      </div>

      <div className={styles.lidExperiment} data-placed={lidPlaced}>
        <div className={styles.experimentScene} aria-hidden="true">
          <span className={styles.warmBowl}><i /><i /><i /></span>
          <span className={styles.vapourTrail}><i /><i /><i /></span>
          <span className={styles.coldLid}><i /><i /><i /><i /></span>
        </div>
        <div>
          <span>Transfer beyond the original puddle</span>
          <h3>Where did the drops under a cold lid come from?</h3>
          <p>Use the same tracking idea in a new situation.</p>
        </div>
        {!lidPlaced && <button className={styles.artifactAction} type="button" onClick={onPlaceLid}>Place the cold lid</button>}
      </div>

      {lidPlaced && (
        <>
          <div className={styles.transferOptions} role="group" aria-label="Explanations for the drops under the cold lid">
            {TRANSFER_OPTIONS.map((option) => (
              <button
                type="button"
                className={choice === option.id ? styles.optionSelected : ""}
                aria-pressed={choice === option.id}
                onClick={() => onChoose(option.id)}
                key={option.id}
              >
                <span aria-hidden="true">{option.icon}</span>
                <strong>{option.label}</strong>
              </button>
            ))}
          </div>
          {choice && <p className={correct ? styles.transferSuccess : styles.transferHint} role="status">
            {correct
              ? "Yes. The representation changed, but the tracked thing did not: liquid water became invisible vapour, then liquid drops again."
              : "Track the same water from the warm bowl, through the air, to the cool lid."}
          </p>}
        </>
      )}
    </section>
  );
}

function CompletionReceipt({
  status,
  evidence,
  headingRef,
}: {
  status: DiagnosisStatus;
  evidence: LiveScienceEvidence | null;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  return (
    <article className={styles.judgeReceipt} aria-labelledby="judge-complete-title">
      <div className={styles.receiptConfetti} aria-hidden="true"><i /><i /><i /><i /></div>
      <header className={styles.receiptHeader}>
        <div><strong>BODH</strong><small>That which is truly understood</small></div>
        <span>JOURNEY COMPLETE ✓</span>
      </header>
      <div className={styles.receiptHero}>
        <div>
          <span className={styles.tourEyebrow}>One method · two subjects</span>
          <h1 id="judge-complete-title" ref={headingRef} tabIndex={-1}>You reached the end of the guided journey.</h1>
          <p>The child’s words stayed intact; each claim below is backed by an action in this session.</p>
        </div>
        <div className={styles.receiptMascot}><i aria-hidden="true" /><BodhMark pose="celebrate" size="large" motion="celebrate" /></div>
      </div>
      <ol className={styles.receiptPath} aria-label="Completed Bodh method">
        {["Listened", "Diagnosed", "Rebuilt", "Transferred"].map((label) => <li key={label}><span>✓</span><strong>{label}</strong></li>)}
      </ol>
      <div className={styles.receiptSubjects}>
        <section>
          <span>MATHEMATICS · seed-01</span>
          <h2>3/4 = 6/8</h2>
          <p>Counted six one-eighth-size groups instead of relying on “flip and multiply.”</p>
        </section>
        <section>
          <span>SCIENCE · seed-09</span>
          <h2>Liquid → invisible vapour → liquid drops</h2>
          <p>Tracked the same water into a new cold-lid situation.</p>
        </section>
      </div>
      <div className={styles.receiptProof}>
        <strong>{status === "live" && evidence ? "One real OpenAI diagnosis + two reviewed visual repairs" : "Two reviewed visual repairs · deterministic fallback used"}</strong>
        <p>This records today’s interactions—not a grade or a claim of long-term mastery.</p>
      </div>
      <Link className={styles.receiptHome} href="/">Return to Bodh home</Link>
    </article>
  );
}

export function JudgeJourney() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [mathRepartitioned, setMathRepartitioned] = useState(false);
  const [mathCount, setMathCount] = useState(0);
  const [diagnosisStatus, setDiagnosisStatus] = useState<DiagnosisStatus>("waiting");
  const [liveEvidence, setLiveEvidence] = useState<LiveScienceEvidence | null>(null);
  const [scienceChoice, setScienceChoice] = useState<ScienceProbeChoice | null>(null);
  const [lidPlaced, setLidPlaced] = useState(false);
  const [transferChoice, setTransferChoice] = useState<TransferChoice | null>(null);
  const apiStartedRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mathComplete = mathCount === 6;
  const scienceComplete = Boolean(scienceChoice) && diagnosisStatus !== "loading" && diagnosisStatus !== "waiting";
  const transferComplete = transferChoice === "same-matter";
  const journeyFinished = activeIndex === JUDGE_TOUR_STEPS.length - 1;
  const stageComplete = useMemo(() => {
    if (activeIndex === 0) return true;
    if (activeIndex === 1) return mathComplete;
    if (activeIndex === 2) return scienceComplete;
    if (activeIndex === 3) return transferComplete;
    return true;
  }, [activeIndex, mathComplete, scienceComplete, transferComplete]);

  useEffect(() => {
    setNarrationLanguage("en");
  }, []);

  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    if (activeIndex === 0) return;
    window.requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  }, [activeIndex]);

  const beginScienceDiagnosis = async () => {
    if (apiStartedRef.current) return;
    apiStartedRef.current = true;
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 25_000);
    setDiagnosisStatus("loading");
    try {
      const response = await fetch("/api/diagnose", {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          problemText: JUDGE_SEEDS.science.problem,
          learnerReasoning: JUDGE_SEEDS.science.learnerWords,
          visibleWorkText: JUDGE_SEEDS.science.visibleWork,
          reviewedSeedId: JUDGE_SEEDS.science.caseId,
        }),
      });
      const body: unknown = await response.json();
      const evidence = response.ok ? liveScienceEvidence(body) : null;
      if (evidence) {
        setLiveEvidence(evidence);
        setDiagnosisStatus("live");
      } else {
        setLiveEvidence(null);
        setDiagnosisStatus("curated");
      }
    } catch {
      if (!controller.signal.aborted || requestRef.current === controller) {
        setLiveEvidence(null);
        setDiagnosisStatus("curated");
      }
    } finally {
      window.clearTimeout(timeout);
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  const startJourney = () => {
    void beginScienceDiagnosis();
    setActiveIndex(1);
  };

  const nextStage = () => {
    if (!stageComplete || activeIndex >= JUDGE_TOUR_STEPS.length - 1) return;
    setActiveIndex((index) => index + 1);
  };

  return (
    <main className={styles.tourPage} id="main-content" lang="en">
      <header className={styles.tourHeader}>
        <Link className="back-link" href="/"><span aria-hidden="true">←</span> Back</Link>
        <Link className="brand brand-compact" href="/" aria-label="Bodh home">
          <BodhMark size="mark" motion="still" priority />
          <span className="brand-copy"><strong>BODH</strong></span>
        </Link>
        <span className={styles.tourLabel}>One method · two subjects</span>
      </header>

      <section className={styles.tourIntro} aria-labelledby="judge-tour-title">
        <span className={styles.tourEyebrow}>Guided judge journey · about 3 minutes</span>
        <h1 id="judge-tour-title">See Bodh listen, rebuild, and transfer.</h1>
        <p>Everything worth evaluating is here: two exact reviewed seeds, one real API call, two visual repairs, and one evidence receipt.</p>
      </section>

      <section className={styles.tourFrame} aria-label="Bodh guided judge journey">
        <ol className={styles.tourProgress} aria-label="Journey checkpoints">
          {JUDGE_TOUR_STEPS.map((step, index) => {
            const state = journeyFinished || index < activeIndex ? "done" : index === activeIndex ? "current" : "ahead";
            return (
              <li data-state={state} aria-current={state === "current" ? "step" : undefined} key={step.id}>
                <span>{state === "done" ? "✓" : index + 1}</span>
                <strong>{step.shortLabel}</strong>
              </li>
            );
          })}
        </ol>

        <div className={styles.judgeStage} aria-live="polite">
          {activeIndex === 0 && (
            <article className={styles.promiseStage}>
              <div className={styles.stepHeading}>
                <div><span className={styles.stepTime}>Checkpoint 1 of 5 · Promise</span><h2>One learning method should travel across subjects.</h2></div>
                <BodhMark pose="listen" size="small" motion="listen" />
              </div>
              <p className={styles.stepBody}>Bodh preserves what the learner said, checks one underlying idea, rebuilds it visually, and asks for transfer before making a session-level claim.</p>
              <div className={styles.seedPair}><SeedCard subject="mathematics" /><SeedCard subject="science" /></div>
              <p className={styles.promiseBoundary}>Clicking Start makes exactly one live diagnosis request for seed-09. If it cannot complete, this same journey continues with the reviewed route and says so plainly.</p>
              <button className={styles.tourAction} type="button" onClick={startJourney}>Start guided journey <span aria-hidden="true">→</span></button>
            </article>
          )}

          {activeIndex === 1 && (
            <article className={styles.productStage}>
              <div className={styles.stepHeading}>
                <div><span className={styles.stepTime}>Checkpoint 2 of 5 · Reviewed maths repair</span><h2 ref={headingRef} tabIndex={-1}>Replace a remembered rule with a visible relationship.</h2></div>
                <BodhMark pose={mathComplete ? "celebrate" : "tinker"} size="small" motion={mathComplete ? "celebrate" : "tinker"} />
              </div>
              <div className={styles.stageGrid}><SeedCard subject="mathematics" /><MathsArtifact repartitioned={mathRepartitioned} count={mathCount} onRepartition={() => setMathRepartitioned(true)} onCount={(index) => setMathCount(index + 1)} /></div>
              <p className={styles.stepEvidence}>Reviewed seed-01 · deterministic visual repair · Marble-grounded</p>
              <button className={styles.tourAction} type="button" disabled={!mathComplete} onClick={nextStage}>See the science diagnosis <span aria-hidden="true">→</span></button>
            </article>
          )}

          {activeIndex === 2 && (
            <article className={styles.productStage}>
              <div className={styles.stepHeading}>
                <div><span className={styles.stepTime}>Checkpoint 3 of 5 · Listen + diagnose</span><h2 ref={headingRef} tabIndex={-1}>The same method begins with the child’s science idea.</h2></div>
                <BodhMark pose="guide" size="small" motion="guide" />
              </div>
              <div className={styles.stageGrid}><SeedCard subject="science" /><ScienceDiagnosis status={diagnosisStatus} evidence={liveEvidence} choice={scienceChoice} onChoose={setScienceChoice} /></div>
              <button className={styles.tourAction} type="button" disabled={!scienceComplete} onClick={nextStage}>Test the idea in a new situation <span aria-hidden="true">→</span></button>
            </article>
          )}

          {activeIndex === 3 && (
            <article className={styles.productStage}>
              <div className={styles.stepHeading}>
                <div><span className={styles.stepTime}>Checkpoint 4 of 5 · Cross-subject transfer</span><h2 ref={headingRef} tabIndex={-1}>Track what stays the same while the representation changes.</h2></div>
                <BodhMark pose={transferComplete ? "celebrate" : "tinker"} size="small" motion={transferComplete ? "celebrate" : "tinker"} />
              </div>
              <TransferArtifact lidPlaced={lidPlaced} choice={transferChoice} onPlaceLid={() => setLidPlaced(true)} onChoose={setTransferChoice} />
              <p className={styles.stepEvidence}>Cold-lid transfer · action-backed evidence · no mastery claim</p>
              <button className={styles.tourAction} type="button" disabled={!transferComplete} onClick={nextStage}>Finish the guided journey <span aria-hidden="true">→</span></button>
            </article>
          )}

          {activeIndex === 4 && (
            <CompletionReceipt
              status={diagnosisStatus}
              evidence={liveEvidence}
              headingRef={headingRef}
            />
          )}
        </div>
      </section>

      <p className={styles.tourBoundary}>Curated judge journey. The learner experience remains self-paced, bilingual, probe-first, and evidence-gated.</p>
    </main>
  );
}
