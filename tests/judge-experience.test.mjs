import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function json(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
}

test("judge lane is anchored to a real seed without revealing its target answer", async () => {
  const [seeds, constants, lane, tour] = await Promise.all([
    json("../data/fixtures/seed-cases.json"),
    readFile(new URL("../lib/judge-experience.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/JudgeLaneLink.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/judge-tour/seed-01/JudgeTour.tsx", import.meta.url), "utf8"),
  ]);
  const seed = seeds.find(({ caseId }) => caseId === "seed-01");

  assert.ok(seed);
  assert.match(constants, new RegExp(seed.input.problemText.replaceAll("?", "\\?")));
  assert.match(constants, new RegExp(seed.input.visibleWork.replace("/", "\\/")));
  assert.match(constants, new RegExp(seed.input.reasoning.raw));
  assert.match(lane, /setNarrationLanguage\("en"\)/);
  assert.match(tour, /90-second judge tour/);
  assert.match(tour, /Committed fixture/);
  assert.match(constants, /caseId: "seed-01"/);
  assert.match(tour, /setNarrationLanguage\("en"\)/);
  assert.doesNotMatch(`${constants}\n${lane}\n${tour}`, /= 6|answer is 6/i);
});

test("published evaluation numbers stay tied to the versioned corpus and recorded release note", async () => {
  const [seeds, development, holdout, releaseNote, constants] = await Promise.all([
    json("../data/fixtures/seed-cases.json"),
    json("../data/evals/development-gold.json"),
    json("../data/evals/frozen-holdout.json"),
    readFile(new URL("../docs/EVALUATION_RELEASE.md", import.meta.url), "utf8"),
    readFile(new URL("../lib/judge-experience.ts", import.meta.url), "utf8"),
  ]);

  assert.deepEqual([seeds.length, development.length, holdout.length], [8, 16, 8]);
  assert.equal(seeds.length + development.length + holdout.length, 32);
  for (const value of [
    "2026-07-16T20:24:29.745Z",
    "dc75a17f3870d80675315fe45a1b448770fb6127",
    "all-32",
    "gpt-5.6",
    "p3.7",
  ]) {
    assert.match(releaseNote, new RegExp(value.replaceAll(".", "\\.")));
    assert.match(constants, new RegExp(value.replaceAll(".", "\\.")));
  }
  assert.match(releaseNote, /Complete release corpus \| 32 \| 0/);
  assert.match(releaseNote, /Frozen holdout \| 8 \| 0/);
  assert.match(constants, /not evidence of classroom efficacy, long-term mastery, or learner outcomes/i);
});
