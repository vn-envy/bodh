import assert from "node:assert/strict";
import test from "node:test";
import {
  completedVisualState,
  FRACTION_CONCEPT_STAGES,
  FRACTION_MODEL,
  selectedEighthCount,
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
  const authoredCopy = FRACTION_CONCEPT_STAGES
    .flatMap((stage) => [
      stage.title,
      stage.screenKey,
      stage.evidence,
      ...stage.narration.flatMap((beat) => [beat.key, beat.text]),
    ])
    .join(" ");

  assert.doesNotMatch(authoredCopy, /3\/4\s*÷\s*1\/8\s*=\s*6/);
  assert.doesNotMatch(authoredCopy, /3\/4\s*=\s*6\/8/);
  assert.doesNotMatch(authoredCopy, /तीन चौथाई[^।]{0,40}छह/);
  assert.match(authoredCopy, /3\/4 ÷ 1\/8 = \?/);
});

test("authors every spoken idea as a short, pointer-owned beat", () => {
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
    assert.ok(stage.screenKey.length <= 36, `${stage.id} should keep prominent copy concise`);
    assert.ok(stage.narration.length >= 3 && stage.narration.length <= 4);
    assert.equal(new Set(stage.narration.map((beat) => beat.id)).size, stage.narration.length);
    for (const beat of stage.narration) {
      assert.ok(beat.text.length > 20 && beat.text.length < 4096);
      assert.ok(beat.key.length <= 38);
      assert.ok(allowedTargets.has(beat.target), `${beat.target} needs a rendered pointer target`);
    }
  }
});

test("moves the persistent visual only after its evidence action", () => {
  assert.equal(completedVisualState(0, false), "blank");
  assert.equal(completedVisualState(0, true), "whole");
  assert.equal(completedVisualState(4, false), "fraction");
  assert.equal(completedVisualState(4, true), "eighths");
  assert.equal(completedVisualState(6, true), "divide");
});
