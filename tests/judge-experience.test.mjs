import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function json(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
}

test("judge lane opens one five-checkpoint journey anchored to both reviewed seeds", async () => {
  const [seeds, constants, lane, tour] = await Promise.all([
    json("../data/fixtures/seed-cases.json"),
    readFile(new URL("../lib/judge-experience.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/JudgeLaneLink.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/judge-tour/JudgeJourney.tsx", import.meta.url), "utf8"),
  ]);
  const mathSeed = seeds.find(({ caseId }) => caseId === "seed-01");
  const scienceSeed = seeds.find(({ caseId }) => caseId === "seed-09");

  assert.ok(mathSeed);
  assert.ok(scienceSeed);
  for (const seed of [mathSeed, scienceSeed]) {
    assert.match(constants, new RegExp(seed.input.problemText.replaceAll("?", "\\?")));
    assert.match(constants, new RegExp(seed.input.visibleWork.replaceAll("/", "\\/")));
    assert.match(constants, new RegExp(seed.input.reasoning.raw));
  }
  assert.match(lane, /setNarrationLanguage\("en"\)/);
  assert.match(lane, /href=\{JUDGE_TOUR_HREF\}/);
  assert.match(lane, /Maths \+ science · one guided journey/);
  assert.match(constants, /JUDGE_TOUR_HREF = "\/judge-tour"/);
  assert.match(constants, /caseId: "seed-01"/);
  assert.match(constants, /caseId: "seed-09"/);
  assert.equal((constants.match(/\{ id: "(?:promise|mathematics|science|transfer|complete)"/g) ?? []).length, 5);
  assert.match(tour, /Guided judge journey · about 3 minutes/);
  assert.match(tour, /Checkpoint 5 of 5|JOURNEY COMPLETE/);
  assert.match(tour, /setNarrationLanguage\("en"\)/);
});

test("the judge journey starts one exact science call on click and earns live copy conservatively", async () => {
  const tour = await readFile(new URL("../app/judge-tour/JudgeJourney.tsx", import.meta.url), "utf8");

  assert.match(tour, /onClick=\{startJourney\}/);
  assert.match(tour, /const startJourney = \(\) => \{\s*void beginScienceDiagnosis\(\);\s*setActiveIndex\(1\);/s);
  assert.match(tour, /fetch\("\/api\/diagnose"/);
  assert.match(tour, /problemText: JUDGE_SEEDS\.science\.problem/);
  assert.match(tour, /learnerReasoning: JUDGE_SEEDS\.science\.learnerWords/);
  assert.match(tour, /visibleWorkText: JUDGE_SEEDS\.science\.visibleWork/);
  assert.match(tour, /reviewedSeedId: JUDGE_SEEDS\.science\.caseId/);
  assert.match(tour, /value\.mode !== "live"/);
  assert.match(tour, /diagnosis\.source !== "openai"/);
  assert.match(tour, /next\.artifactKey !== JUDGE_SEEDS\.science\.caseId/);
  assert.match(tour, /setDiagnosisStatus\("curated"\)/);
  assert.match(tour, /Live diagnosis was not claimed/);
  assert.doesNotMatch(tour, /sessionStorage/);
});

test("both visual repairs are evidence-gated before the final receipt", async () => {
  const tour = await readFile(new URL("../app/judge-tour/JudgeJourney.tsx", import.meta.url), "utf8");

  assert.match(tour, /const mathComplete = mathCount === 6/);
  assert.match(tour, /const scienceComplete = Boolean\(scienceChoice\)/);
  assert.match(tour, /const transferComplete = transferChoice === "same-matter"/);
  assert.match(tour, /disabled=\{!mathComplete\}/);
  assert.match(tour, /disabled=\{!scienceComplete\}/);
  assert.match(tour, /disabled=\{!transferComplete\}/);
  assert.match(tour, /const journeyFinished = activeIndex === JUDGE_TOUR_STEPS\.length - 1/);
  assert.match(tour, /const state = journeyFinished \|\| index < activeIndex \? "done"/);
  assert.match(tour, /id="judge-complete-title" ref=\{headingRef\} tabIndex=\{-1\}/);
  assert.match(tour, /You reached the end of the guided journey/);
  assert.match(tour, /This records today’s interactions—not a grade or a claim of long-term mastery/);
});

test("the 33-case working corpus does not rewrite the recorded 32-case release", async () => {
  const [seeds, development, holdout, releaseNote, constants] = await Promise.all([
    json("../data/fixtures/seed-cases.json"),
    json("../data/evals/development-gold.json"),
    json("../data/evals/frozen-holdout.json"),
    readFile(new URL("../docs/EVALUATION_RELEASE.md", import.meta.url), "utf8"),
    readFile(new URL("../lib/judge-experience.ts", import.meta.url), "utf8"),
  ]);

  // The evaporation seed belongs to today's working corpus. It was not part of
  // the immutable release run below and must not be counted retroactively.
  assert.deepEqual([seeds.length, development.length, holdout.length], [9, 16, 8]);
  assert.equal(seeds.length + development.length + holdout.length, 33);

  assert.match(
    constants,
    /corpus:\s*{\s*seeds:\s*8,\s*development:\s*16,\s*frozenHoldout:\s*8,\s*total:\s*32,/s,
  );
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
