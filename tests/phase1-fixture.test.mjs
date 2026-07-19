import assert from "node:assert/strict";
import test from "node:test";
import {
  CURATED_JOURNEY_ORDER,
  HERO_FIXTURE,
  curatedProbeEntryAtomId,
  isCorrectWholeNumberAnswer,
  isFractionGroupBuildComplete,
  isLabComplete,
  nextCuratedJourneyStep,
  normaliseWholeNumberAnswer,
  toggleContiguousPart,
  toggleLabTile,
} from "../lib/phase1-fixture.ts";

test("runs the diagnostic probe before the atomic explanation and lab", () => {
  assert.deepEqual(CURATED_JOURNEY_ORDER, ["confirm", "probe", "path", "lab", "transfer", "return", "receipt"]);
  assert.equal(nextCuratedJourneyStep("confirm"), "probe");
  assert.equal(nextCuratedJourneyStep("probe"), "path");
  assert.equal(nextCuratedJourneyStep("path"), "lab");
  assert.equal(nextCuratedJourneyStep("receipt"), "receipt");
});

test("accepts English and Devanagari whole-number answers", () => {
  assert.equal(normaliseWholeNumberAnswer(" ६/१ "), "6");
  assert.equal(isCorrectWholeNumberAnswer("४", HERO_FIXTURE.transferAnswer), true);
  assert.equal(isCorrectWholeNumberAnswer("5", HERO_FIXTURE.transferAnswer), false);
});

test("fraction-fit completion requires exactly the six target eighths", () => {
  assert.equal(isLabComplete([0, 1, 2, 3, 4, 5]), true);
  assert.equal(isLabComplete([0, 1, 2, 3, 4]), false);
  assert.equal(isLabComplete([0, 1, 2, 3, 4, 6]), false);
  assert.equal(isLabComplete([0, 1, 2, 3, 4, 4]), false);
});

test("every curated probe answer maps to a conservative repair entry", () => {
  assert.equal(curatedProbeEntryAtomId("2"), "chosen-whole");
  assert.equal(curatedProbeEntryAtomId("3"), "chosen-whole");
  assert.equal(curatedProbeEntryAtomId("8"), "chosen-whole");
  assert.equal(curatedProbeEntryAtomId("4"), "unit-and-denominator");
  assert.equal(curatedProbeEntryAtomId(null), "chosen-whole");
});

test("lab tile transitions add and remove valid slots without mutating input", () => {
  const original = [0, 2];
  assert.deepEqual(toggleLabTile(original, 1), [0, 2, 1]);
  assert.deepEqual(toggleLabTile(original, 2), [0]);
  assert.deepEqual(toggleLabTile(original, 6), [0, 2]);
  assert.deepEqual(toggleLabTile(original, -1), [0, 2]);
  assert.deepEqual(original, [0, 2]);
});

test("visual transfer and return builds count only units inside learner-chosen parts", () => {
  assert.equal(isFractionGroupBuildComplete([0, 1], [0, 1, 2, 3], 2, 3, 6), true);
  assert.equal(isFractionGroupBuildComplete([0, 2], [0, 1, 4, 5], 2, 3, 6), true);
  assert.equal(isFractionGroupBuildComplete([0, 1], [0, 1, 2], 2, 3, 6), false);
  assert.equal(isFractionGroupBuildComplete([0, 1], [0, 1, 2, 4], 2, 3, 6), false);
  assert.equal(isFractionGroupBuildComplete([0, 0], [0, 1, 0, 1], 2, 3, 6), false);

  assert.equal(isFractionGroupBuildComplete([0, 1, 2], [0, 1, 2, 3, 4, 5], 3, 4, 8), true);
  assert.equal(isFractionGroupBuildComplete([0, 1, 3], [0, 1, 2, 3, 6, 7], 3, 4, 8), true);
  assert.equal(isFractionGroupBuildComplete([0, 1, 2], [0, 1, 2, 3, 4, 6], 3, 4, 8), false);
  assert.equal(isFractionGroupBuildComplete([0], [], 1, 1, 0), false);
});

test("measured ribbon parts grow and shrink as one contiguous length", () => {
  assert.deepEqual(toggleContiguousPart([], 0, 3), [0]);
  assert.deepEqual(toggleContiguousPart([0], 1, 3), [0, 1]);
  assert.deepEqual(toggleContiguousPart([0], 2, 3), [0]);
  assert.deepEqual(toggleContiguousPart([0, 1], 1, 3), [0]);
  assert.deepEqual(toggleContiguousPart([0, 1], 0, 3), []);
  assert.deepEqual(toggleContiguousPart([0], 3, 3), [0]);
});
