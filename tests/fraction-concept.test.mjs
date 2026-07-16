import assert from "node:assert/strict";
import test from "node:test";
import {
  completedVisualState,
  FRACTION_CONCEPT_STAGES,
  FRACTION_MODEL,
  selectedEighthCount,
  narrationBeatFor,
} from "../lib/fraction-concept.ts";

test("orders the fraction ideas from whole and unit size to an unknown-factor question", () => {
  assert.deepEqual(
    FRACTION_CONCEPT_STAGES.map((stage) => stage.id),
    [
      "chosen-whole",
      "equal-parts",
      "unit-and-denominator",
      "numerator-count",
      "equivalent-repartition",
      "repeated-composition",
      "division-unknown-factor",
    ],
  );

  const denominatorIndex = FRACTION_CONCEPT_STAGES.findIndex((stage) => stage.id === "unit-and-denominator");
  const numeratorIndex = FRACTION_CONCEPT_STAGES.findIndex((stage) => stage.id === "numerator-count");
  assert.ok(denominatorIndex < numeratorIndex, "unit size must be established before unit count");
});

test("keeps the amount invariant when quarters split into eighths", () => {
  assert.equal(FRACTION_MODEL.quarterCount * FRACTION_MODEL.eighthsPerQuarter, 8);
  assert.equal(selectedEighthCount(), 6);
  assert.equal(
    FRACTION_MODEL.selectedQuarters / FRACTION_MODEL.quarterCount,
    selectedEighthCount() / (FRACTION_MODEL.quarterCount * FRACTION_MODEL.eighthsPerQuarter),
  );
});

test("does not reveal the hero answer before the learner-controlled lab", () => {
  for (const language of ["hi", "en"]) {
    const authoredCopy = FRACTION_CONCEPT_STAGES
      .flatMap((stage) => [
        stage.title[language],
        stage.screenKey[language],
        stage.evidence[language],
        ...stage.narration.flatMap((beat) => [beat.key[language], beat.text[language]]),
      ])
      .join(" ");

    assert.doesNotMatch(authoredCopy, /3\/4\s*÷\s*1\/8\s*=\s*(?:6|६)/i);
    assert.doesNotMatch(authoredCopy, /3\/4\s*=\s*(?:6|६)\/8/i);
    assert.doesNotMatch(authoredCopy, /six eighths|छह आठ|छह हिस्स/i);
    assert.match(authoredCopy, /3\/4 ÷ 1\/8 = \?/);
  }
});

test("authors every spoken idea in both languages as an atomic, pointer-owned beat", () => {
  const allowedTargets = new Set([
    "whole",
    "equal-parts",
    "unit-quarter",
    "denominator",
    "selected-three",
    "numerator",
    "amount",
    "eighth-seams",
    "eighth-unit",
    "eighth-units",
    "equivalence",
    "times",
    "divide",
    "unknown",
  ]);

  for (const stage of FRACTION_CONCEPT_STAGES) {
    assert.ok(stage.narration.length >= 4 && stage.narration.length <= 6);
    assert.equal(new Set(stage.narration.map((beat) => beat.id)).size, stage.narration.length);
    for (const language of ["hi", "en"]) {
      assert.ok(stage.screenKey[language].length <= 52, `${stage.id}/${language} should keep prominent copy concise`);
    }
    for (const beat of stage.narration) {
      assert.ok(allowedTargets.has(beat.target), `${beat.target} needs a rendered pointer target`);
      assert.ok(beat.text.hi.length > 20 && beat.text.hi.length < 4096);
      assert.ok(beat.text.en.length > 20 && beat.text.en.length < 4096);
      assert.ok(beat.key.hi.length <= 42);
      assert.ok(beat.key.en.length <= 42);
      assert.match(beat.text.hi, /[\u0900-\u097f]/, `${stage.id}/${beat.id} needs Hindi narration`);
      assert.doesNotMatch(beat.text.en, /[\u0900-\u097f]/, `${stage.id}/${beat.id} English should not contain Devanagari`);
    }
  }
});

test("resolves the same authored beat and cue target in Hindi and English", () => {
  const hindi = narrationBeatFor("chosen-whole", "name-the-whole", "hi");
  const english = narrationBeatFor("chosen-whole", "name-the-whole", "en");
  assert.ok(hindi);
  assert.ok(english);
  assert.equal(hindi.id, english.id);
  assert.equal(hindi.target, english.target);
  assert.notEqual(hindi.text, english.text);
});

test("moves the persistent visual only after its evidence action", () => {
  assert.equal(completedVisualState(0, false), "blank");
  assert.equal(completedVisualState(0, true), "whole");
  assert.equal(completedVisualState(4, false), "fraction");
  assert.equal(completedVisualState(4, true), "eighths");
  assert.equal(completedVisualState(6, true), "divide");
});
