import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../app/components/FractionLabRepresentation.tsx", import.meta.url),
  "utf8",
);

test("the lab offers two synchronized deterministic representations", () => {
  assert.match(source, /type Representation = "bar" \| "line"/);
  assert.match(source, /const TICK_LABELS = \["0", "1\/8", "1\/4", "3\/8", "1\/2", "5\/8", "3\/4", "7\/8", "1"\]/);
  assert.equal((source.match(/onClick=\{\(\) => onToggle\(slot\)\}/g) ?? []).length, 2);
  assert.equal((source.match(/disabled=\{!inTarget \|\| \(!placed && !tileSelected\)\}/g) ?? []).length, 2);
});

test("number-line copy remains bilingual and does not prefill the answer", () => {
  assert.match(source, /हर curve एक 1\/8 jump है/);
  assert.match(source, /Each curve is one 1\/8 jump/);
  assert.doesNotMatch(source, /6 jumps × 1\/8 = 3\/4/);
  assert.match(source, /text\.summary\(placedSlots\.length\)/);
});
