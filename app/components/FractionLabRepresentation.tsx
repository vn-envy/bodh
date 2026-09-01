"use client";

import { useState } from "react";
import { authoredLanguageFor, type NarrationLanguage } from "../../lib/narration-language";
import styles from "./FractionLabRepresentation.module.css";

type Representation = "bar" | "line";

const TICK_LABELS = ["0", "1/8", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8", "1"] as const;

const copy = {
  hi: {
    title: "एक ही मात्रा, दो pictures",
    legend: "Representation चुनें",
    bar: "Fraction bar",
    line: "Number line",
    target: "3/4 target",
    whole: "1 whole",
    barAria: "आठ बराबर हिस्सों वाली fraction bar",
    lineAria: "शून्य से एक तक eighths की number line",
    lineIntro: "हर curve एक 1/8 jump है। उन्हीं pieces को line पर देखो।",
    summary: (count: number) => `${count} jumps × 1/8 अभी दिख रहे हैं।`,
    slot: "जगह",
    jump: "jump",
    placed: "रखा हुआ",
    empty: "खाली",
    outside: "target के बाहर",
  },
  en: {
    title: "One amount, two pictures",
    legend: "Choose a representation",
    bar: "Fraction bar",
    line: "Number line",
    target: "3/4 target",
    whole: "1 whole",
    barAria: "Fraction bar divided into eight equal parts",
    lineAria: "Number line from zero to one in eighths",
    lineIntro: "Each curve is one 1/8 jump. See the same pieces along a line.",
    summary: (count: number) => `${count} jumps × 1/8 are visible now.`,
    slot: "Slot",
    jump: "Jump",
    placed: "placed",
    empty: "empty",
    outside: "outside the target",
  },
} as const;

export function FractionLabRepresentation({
  language,
  placedSlots,
  targetSlots,
  totalSlots,
  tileSelected,
  onToggle,
}: {
  language: NarrationLanguage;
  placedSlots: readonly number[];
  targetSlots: number;
  totalSlots: number;
  tileSelected: boolean;
  onToggle: (slot: number) => void;
}) {
  const [representation, setRepresentation] = useState<Representation>("bar");
  const text = copy[authoredLanguageFor(language)];
  const tickLabels = TICK_LABELS.slice(0, totalSlots + 1);

  return (
    <section className={styles.representation} aria-label={text.title}>
      <fieldset className={styles.switcher}>
        <legend>{text.legend}</legend>
        <span>{text.title}</span>
        <div>
          <button type="button" aria-pressed={representation === "bar"} onClick={() => setRepresentation("bar")}>
            {text.bar}
          </button>
          <button type="button" aria-pressed={representation === "line"} onClick={() => setRepresentation("line")}>
            {text.line}
          </button>
        </div>
      </fieldset>

      {representation === "bar" ? (
        <div className={styles.barWrap}>
          <div className={styles.barLabels} aria-hidden="true">
            <span>{text.target}</span>
            <span>{text.whole}</span>
          </div>
          <div className={styles.barScroll}>
            <div className={styles.bar} aria-label={text.barAria}>
              {Array.from({ length: totalSlots }, (_, slot) => {
                const inTarget = slot < targetSlots;
                const placed = placedSlots.includes(slot);
                return (
                  <button
                    className={`${styles.slot} ${!inTarget ? styles.slotOutside : ""} ${placed ? styles.slotPlaced : ""}`}
                    type="button"
                    key={slot}
                    disabled={!inTarget || (!placed && !tileSelected)}
                    aria-label={`${text.slot} ${slot + 1}: ${placed ? text.placed : inTarget ? text.empty : text.outside}`}
                    onClick={() => onToggle(slot)}
                  >
                    {placed && <span>1/8</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.lineCard}>
          <p className={styles.lineIntro}>{text.lineIntro}</p>
          <div className={styles.lineViewport}>
            <div className={styles.lineCanvas} role="group" aria-label={text.lineAria}>
              <div className={styles.track} aria-hidden="true" />
              <div className={styles.targetTrack} aria-hidden="true" />
              {tickLabels.map((label, index) => (
                <span
                  className={`${styles.tick} ${index === targetSlots ? styles.tickTarget : ""}`}
                  style={{ left: `${7 + index * (86 / totalSlots)}%` }}
                  aria-hidden="true"
                  key={`${label}-${index}`}
                >
                  {label}
                </span>
              ))}
              {Array.from({ length: totalSlots }, (_, slot) => {
                const inTarget = slot < targetSlots;
                const placed = placedSlots.includes(slot);
                return (
                  <button
                    className={`${styles.jump} ${placed ? styles.jumpPlaced : ""}`}
                    style={{ left: `${7 + slot * (86 / totalSlots)}%`, width: `${86 / totalSlots}%` }}
                    type="button"
                    key={slot}
                    disabled={!inTarget || (!placed && !tileSelected)}
                    aria-label={`${text.jump} ${slot + 1}: ${placed ? text.placed : inTarget ? text.empty : text.outside}`}
                    onClick={() => onToggle(slot)}
                  >
                    <span className={styles.jumpArc}>{placed ? "1/8" : ""}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <p className={styles.lineSummary} aria-live="polite">{text.summary(placedSlots.length)}</p>
        </div>
      )}
    </section>
  );
}
