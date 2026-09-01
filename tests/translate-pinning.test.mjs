import assert from "node:assert/strict";
import test from "node:test";
import { pinProtectedForms, restoreProtectedForms } from "../lib/translation-pinning.ts";

test("glossary forms and maths tokens survive translation pinning round-trips", () => {
  const source = "The denominator of 3/4 is 4; हर means denominator.";
  const { text, pinned } = pinProtectedForms(source, ["denominator", "हर", "3/4"]);
  assert.doesNotMatch(text, /denominator|हर|3\/4/);
  assert.deepEqual([...pinned].sort(), ["3/4", "denominator", "हर"]);
  assert.equal(restoreProtectedForms(text, pinned), source);
});

test("a translation that drops a pinned placeholder is rejected", () => {
  const { text, pinned } = pinProtectedForms("water vapour rises", ["water vapour"]);
  assert.equal(restoreProtectedForms(text.replace(/⟦0⟧/, ""), pinned), null);
  assert.equal(restoreProtectedForms("⟦0⟧ ⟦7⟧", pinned), null, "stray placeholders are rejected");
});

test("longer forms are pinned before shorter ones so 'unit fraction' is not split", () => {
  const { text, pinned } = pinProtectedForms("a unit fraction is a fraction", ["fraction", "unit fraction"]);
  assert.equal(pinned[0], "unit fraction");
  assert.equal(restoreProtectedForms(text, pinned), "a unit fraction is a fraction");
});
