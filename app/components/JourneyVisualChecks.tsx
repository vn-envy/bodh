"use client";

import { useEffect, useRef } from "react";
import type { NarrationLanguage } from "../../lib/narration-language";

type CheckState = "idle" | "try-again" | "correct";

function fractionName(numerator: number, denominator: number) {
  return `${numerator}/${denominator}`;
}

export function QuarterProbeArtifact({
  language,
  answer,
}: {
  language: NarrationLanguage;
  answer: string | null;
}) {
  const selected = answer ? Number(answer) : 0;
  const placed = Math.min(selected, 4);
  const extra = Math.max(selected - 4, 0);
  const gap = Math.max(4 - selected, 0);
  const isExact = selected === 4;
  const accessibleLabel = answer
    ? language === "hi"
      ? `तुमने ${selected} एक-चौथाई टुकड़े चुने। ${placed} टुकड़े whole tray में दिख रहे हैं${gap ? ` और ${gap} जगह खाली है` : ""}${extra ? ` और ${extra} टुकड़े बाहर बचे हैं` : ""}।`
      : `You chose ${selected} one-quarter pieces. ${placed} are shown in the whole tray${gap ? ` with ${gap} empty space${gap === 1 ? "" : "s"}` : ""}${extra ? ` and ${extra} remain outside` : ""}.`
    : language === "hi"
      ? "एक 1/4 टुकड़ा और एक खाली one-whole tray। पहले अपनी गिनती चुनो।"
      : "One 1/4 piece beside an empty one-whole tray. Choose a count first.";

  return (
    <div
      className={`quarter-probe-artifact ${answer ? "quarter-probe-revealed" : "quarter-probe-question"} ${isExact ? "quarter-probe-exact" : ""}`}
      role="img"
      aria-label={accessibleLabel}
    >
      <div className="quarter-probe-caption" aria-hidden="true">
        <span>{language === "hi" ? "एक टुकड़ा" : "one piece"}</span>
        <span>{language === "hi" ? "एक पूरा" : "one whole"}</span>
      </div>

      {!answer ? (
        <div className="quarter-probe-question-row" aria-hidden="true">
          <span className="quarter-probe-piece">1/4</span>
          <span className="quarter-probe-times">× ?</span>
          <span className="quarter-probe-whole-outline">
            <small>{language === "hi" ? "यहाँ पूरा भरो" : "fill the whole"}</small>
          </span>
        </div>
      ) : (
        <div className="quarter-probe-result" aria-hidden="true">
          <div className="quarter-probe-tray">
            {Array.from({ length: 4 }, (_, index) => (
              <span className={index < placed ? "quarter-probe-slot-filled" : ""} key={index}>
                {index < placed ? <small>1/4</small> : <i />}
              </span>
            ))}
          </div>
          <div className="quarter-probe-fit-line">
            <span>{selected} × 1/4</span>
            <strong>{isExact ? "= 1" : selected < 4 ? "< 1" : "> 1"}</strong>
          </div>
          {extra > 0 && (
            <div className="quarter-probe-extra">
              <small>{language === "hi" ? "whole के बाहर बचे" : "left outside the whole"}</small>
              <div>{Array.from({ length: extra }, (_, index) => <span key={index}>1/4</span>)}</div>
            </div>
          )}
        </div>
      )}

      <p aria-hidden="true">
        {answer
          ? isExact
            ? language === "hi" ? "बिल्कुल भर गया" : "an exact fit"
            : language === "hi" ? "चित्र को देखो—कहाँ खाली या extra है?" : "look for a gap or extra pieces"
          : language === "hi" ? "पहले चुनो · फिर Bodh तुम्हारा जवाब बनाएगा" : "choose first · then Bodh will build your answer"}
      </p>
    </div>
  );
}

export function FractionGroupBuilder({
  language,
  variant,
  numerator,
  denominator,
  unitDenominator,
  selectedParts,
  countedUnits,
  state,
  amountLocked = false,
  onTogglePart,
  onToggleUnit,
  onReset,
}: {
  language: NarrationLanguage;
  variant: "ribbon" | "return";
  numerator: number;
  denominator: number;
  unitDenominator: number;
  selectedParts: readonly number[];
  countedUnits: readonly number[];
  state: CheckState;
  amountLocked?: boolean;
  onTogglePart: (part: number) => void;
  onToggleUnit: (unit: number) => void;
  onReset: () => void;
}) {
  const subdivision = unitDenominator / denominator;
  const amount = fractionName(numerator, denominator);
  const unit = fractionName(1, unitDenominator);
  const validParts = [...new Set(selectedParts)].filter((part) => Number.isInteger(part) && part >= 0 && part < denominator);
  const amountBuilt = validParts.length === numerator;
  const validUnitIds = new Set(validParts.flatMap((part) =>
    Array.from({ length: subdivision }, (_, unitIndex) => part * subdivision + unitIndex)));
  const counted = [...new Set(countedUnits)].filter((unitId) => validUnitIds.has(unitId));
  const expectedGroupCount = numerator * subdivision;
  const countComplete = counted.length === expectedGroupCount;
  const equationResult = counted.length === 0 || countComplete
    ? amount
    : `${counted.length}/${unitDenominator}`;
  const sceneLabel = variant === "ribbon"
    ? language === "hi" ? "रिया की ribbon" : "Riya's ribbon"
    : language === "hi" ? "तुम्हारा पहला सवाल" : "Your first question";
  const firstPartRef = useRef<HTMLButtonElement>(null);
  const firstUnitRef = useRef<HTMLButtonElement>(null);
  const previousAmountBuiltRef = useRef(amountBuilt);
  const resetFocusPendingRef = useRef(false);

  useEffect(() => {
    if (amountBuilt && !previousAmountBuiltRef.current && !amountLocked) firstUnitRef.current?.focus();
    previousAmountBuiltRef.current = amountBuilt;
  }, [amountBuilt, amountLocked]);

  useEffect(() => {
    if (!resetFocusPendingRef.current) return;
    resetFocusPendingRef.current = false;
    if (amountLocked) firstUnitRef.current?.focus();
    else firstPartRef.current?.focus();
  }, [amountBuilt, amountLocked, counted.length, validParts.length]);

  const resetBuilder = () => {
    resetFocusPendingRef.current = true;
    onReset();
  };

  return (
    <section
      className={`fraction-group-builder fraction-group-builder-${variant} fraction-group-builder-${state}`}
      aria-label={language === "hi" ? `${amount} को ${unit} groups में बनाओ` : `Build ${amount} from ${unit} groups`}
    >
      <div className={`builder-step-tabs ${amountLocked ? "builder-step-tabs-single" : ""}`} aria-label={language === "hi" ? "छोटे steps" : "Small steps"}>
        {!amountLocked && (
          <span className={!amountBuilt ? "builder-step-active" : "builder-step-done"}>
            <b>1</b> {language === "hi" ? `${amount} दिखाओ` : `Show ${amount}`}
          </span>
        )}
        <span className={amountBuilt ? "builder-step-active" : ""}>
          <b>{amountLocked ? "1" : "2"}</b> {language === "hi" ? `${unit} गिनो` : `Count ${unit}s`}
        </span>
      </div>

      <div className="builder-scene-label">
        <span aria-hidden="true" />
        <strong>{sceneLabel}</strong>
        <small>{language === "hi" ? "एक ही whole" : "the same whole"}</small>
      </div>

      <div
        className={`builder-track ${amountBuilt ? "builder-track-split" : ""}`}
        style={{ gridTemplateColumns: `repeat(${denominator}, minmax(0, 1fr))` }}
        role="group"
        aria-label={amountBuilt
          ? language === "hi" ? `चुने हुए हिस्से अब ${unit} में बँटे हैं` : `The chosen parts are now split into ${unit}s`
          : language === "hi" ? `${denominator} बराबर हिस्सों में से ${numerator} चुनो` : `Choose ${numerator} of ${denominator} equal parts`}
      >
        {Array.from({ length: denominator }, (_, partIndex) => {
          const selected = validParts.includes(partIndex);
          if (!amountBuilt) {
            const waitingForEarlierPart = variant === "ribbon" && !selected && partIndex > validParts.length;
            return (
              <button
                className={`builder-whole-part ${selected ? "builder-whole-part-selected" : ""}`}
                type="button"
                ref={partIndex === 0 ? firstPartRef : undefined}
                aria-pressed={selected}
                disabled={waitingForEarlierPart}
                aria-label={language === "hi"
                  ? `हिस्सा ${partIndex + 1}, एक बटा ${denominator}${selected ? ", चुना हुआ" : ""}`
                  : `Part ${partIndex + 1}, one ${denominator}th${selected ? ", selected" : ""}`}
                onClick={() => onTogglePart(partIndex)}
                key={partIndex}
              >
                <span>1/{denominator}</span>
                <small>{selected ? "✓" : "+"}</small>
              </button>
            );
          }

          return (
            <div className={`builder-split-part ${selected ? "builder-split-part-selected" : ""}`} key={partIndex}>
              {selected
                ? Array.from({ length: subdivision }, (_, unitIndex) => {
                    const unitId = partIndex * subdivision + unitIndex;
                    const isCounted = counted.includes(unitId);
                    return (
                      <button
                        className={isCounted ? "builder-unit-counted" : ""}
                        type="button"
                        ref={unitId === validParts[0] * subdivision ? firstUnitRef : undefined}
                        aria-pressed={isCounted}
                        aria-label={language === "hi"
                          ? `${unit} group ${unitIndex + 1}, बड़े हिस्से ${partIndex + 1} में${isCounted ? ", गिना हुआ" : ", गिनने के लिए tap करें"}`
                          : `${unit} group ${unitIndex + 1} in large part ${partIndex + 1}${isCounted ? ", counted" : ", tap to count"}`}
                        onClick={() => onToggleUnit(unitId)}
                        key={unitId}
                      >
                        <span>{unit}</span>
                        <small>{isCounted ? counted.indexOf(unitId) + 1 : "+"}</small>
                      </button>
                    );
                  })
                : <span className="builder-unused-part" aria-hidden="true" />}
            </div>
          );
        })}
      </div>

      <div className="builder-instruction" role="status" aria-live="polite" aria-atomic="true">
        <span aria-hidden="true">{amountBuilt ? "↳" : "→"}</span>
        <p>{amountBuilt
          ? language === "hi"
            ? `हर 1/${denominator} को ${subdivision} बराबर ${unit} pieces में बाँटा। अब हर coloured piece tap करके गिनो।`
            : `Each 1/${denominator} is split into ${subdivision} equal ${unit} pieces. Tap every coloured piece to count it.`
          : language === "hi"
            ? `${denominator} बराबर हिस्सों में से ${numerator} tap करके ${amount} बनाओ।`
            : `Tap ${numerator} of the ${denominator} equal parts to build ${amount}.`}</p>
      </div>

      <div className="builder-count-panel" aria-live="polite">
        <div className="builder-equation" aria-label={language === "hi"
          ? `${counted.length || "अज्ञात"} गुणा ${unit} बराबर ${equationResult}`
          : `${counted.length || "unknown"} times ${unit} equals ${equationResult}`}>
          <strong>{counted.length || "?"}</strong>
          <span>×</span>
          <b>{unit}</b>
          <span>=</span>
          <b>{equationResult}</b>
        </div>
        <div className="builder-count-beads" aria-hidden="true">
          {counted.length === 0
            ? <span>?</span>
            : counted.map((unitId, index) => (
                <span className="builder-count-bead-filled" key={unitId}>{index + 1}</span>
              ))}
        </div>
      </div>

      {(amountLocked ? counted.length > 0 : validParts.length > 0 || counted.length > 0) && state !== "correct" && (
        <button className="builder-reset" type="button" onClick={resetBuilder}>
          <span aria-hidden="true">↺</span> {amountLocked
            ? language === "hi" ? "फिर से गिनो" : "Count again"
            : language === "hi" ? "चित्र फिर बनाओ" : "Rebuild the picture"}
        </button>
      )}
    </section>
  );
}
