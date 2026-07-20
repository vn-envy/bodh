import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { ADAPTIVE_PROBE_CATALOG } from "../lib/adaptive-repair.ts";
import { SEEDED_DOUBT_IDS, SEEDED_DOUBTS, verifiedSeededDoubtForInput } from "../lib/seeded-doubts.ts";
import {
  SEED_LESSONS,
  SEEDED_JOURNEY_VERSION,
  parseSeedJourneyHandoff,
  serializeSeedJourneyHandoff,
} from "../lib/seeded-journey.ts";

function validHandoff(seedId = "seed-02") {
  const seed = SEEDED_DOUBTS.find((candidate) => candidate.id === seedId);
  const probe = ADAPTIVE_PROBE_CATALOG[1];
  return {
    version: SEEDED_JOURNEY_VERSION,
    seedId,
    source: "openai",
    canonicalEquation: seed.problemText,
    conceptIds: [seed.focusTopicId],
    hypothesisIds: ["division-always-makes-smaller"],
    model: "gpt-5.6",
    promptVersion: "p3.7",
    probeId: probe.id,
    optionId: probe.options[0].id,
  };
}

test("all eight reviewed doubts have a matching bilingual visual repair", () => {
  assert.deepEqual(Object.keys(SEED_LESSONS), SEEDED_DOUBT_IDS);
  for (const seed of SEEDED_DOUBTS) {
    const lesson = SEED_LESSONS[seed.id];
    assert.equal(lesson.seedId, seed.id);
    assert.equal(lesson.atomicIdeas.length, 3);
    assert.equal(lesson.check.options.filter((option) => option.correct).length, 1);
    assert.ok(lesson.title.hi && lesson.title.en);
    assert.ok(lesson.completion.hi && lesson.completion.en);
    assert.equal(lesson.visual.kind === "clarify", seed.kind === "safe-retry");
  }
});

test("a reviewed seed id is trusted only while every learner-facing field is exact", () => {
  const seed = SEEDED_DOUBTS[1];
  assert.equal(verifiedSeededDoubtForInput(seed.id, {
    problemText: seed.problemText,
    learnerReasoning: seed.learnerReasoning,
    visibleWorkText: seed.visibleWorkText,
  })?.id, seed.id);
  assert.equal(verifiedSeededDoubtForInput(seed.id, {
    problemText: seed.problemText,
    learnerReasoning: `${seed.learnerReasoning} edited`,
    visibleWorkText: seed.visibleWorkText,
  }), null);
});

test("the live handoff is bounded, seed-matched, and requires a real OpenAI source", () => {
  const handoff = validHandoff();
  const serialized = serializeSeedJourneyHandoff(handoff);
  assert.ok(serialized);
  assert.deepEqual(parseSeedJourneyHandoff(serialized), handoff);
  assert.equal(serializeSeedJourneyHandoff({ ...handoff, source: "reviewed_recovery" }), null);
  assert.equal(serializeSeedJourneyHandoff({ ...handoff, canonicalEquation: "3/4 ÷ 1/8 = ?" }), null);
  assert.equal(serializeSeedJourneyHandoff({ ...handoff, extra: "not allowed" }), null);
});

test("the UI visibly separates live diagnosis, reviewed teaching, and curated fallback", async () => {
  const [intake, journey] = await Promise.all([
    readFile(new URL("../app/diagnose/DiagnosticIntake.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/learn/SeededLearningJourney.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(intake, /reviewedSeedId: selectedSeedId \|\| undefined/);
  assert.match(intake, /result\.diagnosis\.source !== "openai"/);
  assert.match(intake, /parseSeedJourneyHandoff\([\s\S]*?sessionStorage\.getItem\(SEEDED_JOURNEY_STORAGE_KEY\)/);
  assert.match(intake, /window\.location\.assign\(result\.next\.href\)/);
  assert.match(intake, /Live OpenAI response/);
  assert.match(journey, /Live OpenAI diagnosis/);
  assert.match(journey, /reviewed visual evidence/);
  assert.match(journey, /href="\/demo"/);
  assert.match(journey, /Carrying your exact question/);
});
