"use client";

import { useEffect, useMemo, useState } from "react";
import {
  completedVisualState,
  FRACTION_CONCEPT_STAGES,
  FRACTION_MODEL,
  type FractionVisualState,
} from "../../lib/fraction-concept";

type FractionConceptExplainerProps = {
  onFinish: () => void;
};

const visualLabels: Record<FractionVisualState, string> = {
  blank: "एक खाली fraction पट्टी, जिसमें अभी whole चुना जाना है",
  whole: "पूरी पट्टी एक whole के रूप में चुनी गई",
  quarters: "वही whole चार बराबर quarters में बँटा हुआ",
  unit: "चार बराबर quarters में पहला one-quarter unit चुना हुआ",
  fraction: "चार बराबर quarters में तीन quarters peach रंग में चुने हुए",
  eighths: "वही three-quarters अब eighth-size pieces में विभाजित, मात्रा समान",
  multiply: "one-eighth units का repeated composition, missing count के साथ",
  divide: "three-quarters divided by one-eighth, missing group count के साथ",
};

function FractionGlyph({ numerator, denominator }: { numerator: string; denominator: string }) {
  return (
    <span className="atomic-fraction" aria-label={`${numerator} बटे ${denominator}`}>
      <span>{numerator}</span>
      <span>{denominator}</span>
    </span>
  );
}

function EquationFor({ state }: { state: FractionVisualState }) {
  if (state === "blank") return <span className="atomic-equation-muted">एक whole चुनें</span>;
  if (state === "whole") return <strong>1 whole</strong>;
  if (state === "quarters") {
    return <strong className="atomic-equation-small">1/4 + 1/4 + 1/4 + 1/4 = 1</strong>;
  }
  if (state === "unit") {
    return (
      <div className="atomic-symbol-teaching">
        <FractionGlyph numerator="1" denominator="4" />
        <span className="atomic-term-tag atomic-term-denominator">हर · 4 equal parts</span>
      </div>
    );
  }
  if (state === "fraction") {
    return (
      <div className="atomic-symbol-teaching">
        <FractionGlyph numerator="3" denominator="4" />
        <span className="atomic-term-tag atomic-term-numerator">अंश · 3 units</span>
        <span className="atomic-term-tag atomic-term-denominator">हर · unit का size</span>
      </div>
    );
  }
  if (state === "eighths") {
    return (
      <strong className="atomic-equivalence">
        <FractionGlyph numerator="3" denominator="4" />
        <span>=</span>
        <FractionGlyph numerator="?" denominator="8" />
      </strong>
    );
  }
  if (state === "multiply") {
    return (
      <strong className="atomic-operation">
        <span>?</span><span>×</span><FractionGlyph numerator="1" denominator="8" /><span>=</span><FractionGlyph numerator="3" denominator="4" />
      </strong>
    );
  }
  return (
    <strong className="atomic-operation">
      <FractionGlyph numerator="3" denominator="4" /><span>÷</span><FractionGlyph numerator="1" denominator="8" /><span>=</span><span>?</span>
    </strong>
  );
}

function FractionArtifact({ state }: { state: FractionVisualState }) {
  const showEighthLabels = state === "multiply" || state === "divide";
  const quarters = Array.from({ length: FRACTION_MODEL.quarterCount });

  return (
    <div className={`atomic-artifact atomic-visual-${state}`} role="img" aria-label={visualLabels[state]}>
      <div className="atomic-whole-label" aria-hidden="true">
        <span>वही one whole</span>
        <i />
      </div>
      <div className="atomic-bar" aria-hidden="true">
        {quarters.map((_, quarterIndex) => (
          <span className={`atomic-quarter atomic-quarter-${quarterIndex + 1}`} key={quarterIndex}>
            {Array.from({ length: FRACTION_MODEL.eighthsPerQuarter }).map((__, eighthIndex) => (
              <i className="atomic-eighth" key={eighthIndex}>
                {showEighthLabels && quarterIndex < FRACTION_MODEL.selectedQuarters ? <small>1/8</small> : null}
              </i>
            ))}
          </span>
        ))}
      </div>
      <div className="atomic-amount-brace" aria-hidden="true"><i /><span>peach मात्रा = 3/4</span></div>
      <div className="atomic-equation" key={state} aria-hidden="true">
        <EquationFor state={state} />
      </div>
    </div>
  );
}

export function FractionConceptExplainer({ onFinish }: FractionConceptExplainerProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const [proved, setProved] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const stage = FRACTION_CONCEPT_STAGES[stageIndex];
  const isLastStage = stageIndex === FRACTION_CONCEPT_STAGES.length - 1;
  const visualState = useMemo(() => completedVisualState(stageIndex, proved), [stageIndex, proved]);

  useEffect(() => {
    if (!isPlaying) return;

    const timer = window.setTimeout(() => {
      if (!proved) {
        setProved(true);
        return;
      }
      if (isLastStage) {
        setIsPlaying(false);
        return;
      }
      setStageIndex((current) => current + 1);
      setProved(false);
    }, proved ? 2400 : 700);

    return () => window.clearTimeout(timer);
  }, [isLastStage, isPlaying, proved, stageIndex]);

  const startPlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    setStageIndex(0);
    setProved(false);
    setIsPlaying(true);
  };

  const goBack = () => {
    setIsPlaying(false);
    if (proved) {
      setProved(false);
      return;
    }
    if (stageIndex > 0) {
      setStageIndex((current) => current - 1);
      setProved(true);
    }
  };

  const takePrimaryAction = () => {
    setIsPlaying(false);
    if (!proved) {
      setProved(true);
      return;
    }
    if (isLastStage) {
      onFinish();
      return;
    }
    setStageIndex((current) => current + 1);
    setProved(false);
  };

  return (
    <section className="atomic-explainer" aria-label="Fraction concept explainer">
      <header className="atomic-explainer-header">
        <div className="atomic-motion-note">
          <span aria-hidden="true" />
          <div><strong>एक ही picture, हर step पर</strong><small>तुम्हारी गति से · आवाज़ बाद में</small></div>
        </div>
        <button className="atomic-play" type="button" aria-pressed={isPlaying} onClick={startPlayback}>
          <span aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span>
          {isPlaying ? "रोकें" : "चलाकर देखें"}
        </button>
      </header>

      <ol className="atomic-progress" aria-label={`Concept step ${stageIndex + 1} of ${FRACTION_CONCEPT_STAGES.length}`}>
        {FRACTION_CONCEPT_STAGES.map((conceptStage, index) => {
          const state = index < stageIndex || (index === stageIndex && proved)
            ? "complete"
            : index === stageIndex
              ? "active"
              : "future";
          return <li className={`atomic-progress-${state}`} key={conceptStage.id}><span>{index + 1}</span></li>;
        })}
      </ol>

      <div className="atomic-explainer-grid">
        <div className="atomic-stage-copy" aria-live="polite">
          <span className="atomic-step-count">IDEA {stageIndex + 1} / {FRACTION_CONCEPT_STAGES.length}</span>
          <p className="atomic-eyebrow">{stage.eyebrow}</p>
          <h2>{stage.title}</h2>
          <p className="atomic-mentor-copy">{stage.mentor}</p>
          <div className={`atomic-evidence ${proved ? "atomic-evidence-earned" : ""}`}>
            <span aria-hidden="true">{proved ? "✓" : "○"}</span>
            <div>
              <small>{proved ? "तुमने अभी यह देखा" : "पहले picture पर action करो"}</small>
              <strong>{proved ? stage.evidence : stage.action}</strong>
            </div>
          </div>
        </div>

        <FractionArtifact state={visualState} />
      </div>

      <footer className="atomic-actions">
        <button className="atomic-back" type="button" onClick={goBack} disabled={stageIndex === 0 && !proved || isPlaying}>
          <span aria-hidden="true">←</span> पीछे
        </button>
        {isPlaying ? (
          <span className="atomic-playing-status" role="status">Bodh idea को धीरे-धीरे बना रहा है…</span>
        ) : (
          <button className="button button-primary atomic-primary" type="button" onClick={takePrimaryAction}>
            {!proved
              ? stage.action
              : isLastStage
                ? "अब खुद बनाकर देखें"
                : "अगली idea"}
            <span aria-hidden="true">→</span>
          </button>
        )}
      </footer>
    </section>
  );
}
