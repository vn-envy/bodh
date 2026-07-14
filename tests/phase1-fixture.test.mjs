import assert from "node:assert/strict";
import test from "node:test";
import {
  HERO_FIXTURE,
  isCorrectWholeNumberAnswer,
  isLabComplete,
  normaliseWholeNumberAnswer,
} from "../lib/phase1-fixture.ts";

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
