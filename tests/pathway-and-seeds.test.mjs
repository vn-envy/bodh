import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import taxonomy from "../data/taxonomy/fractions-division.slice.json" with { type: "json" };
import seedCases from "../data/fixtures/seed-cases.json" with { type: "json" };
import { SEEDED_DOUBT_IDS, SEEDED_DOUBTS } from "../lib/seeded-doubts.ts";

function hasPath(start, goal) {
  if (start === goal) return true;
  const pending = [start];
  const visited = new Set(pending);
  while (pending.length > 0) {
    const current = pending.shift();
    for (const edge of taxonomy.dependencies.filter((candidate) => candidate.prerequisiteId === current)) {
      if (edge.topicId === goal) return true;
      if (visited.has(edge.topicId)) continue;
      visited.add(edge.topicId);
      pending.push(edge.topicId);
    }
  }
  return false;
}

test("all eight reviewed seeds have a learner-safe selectable projection", () => {
  assert.deepEqual(SEEDED_DOUBTS.map((sample) => sample.id), SEEDED_DOUBT_IDS);
  assert.equal(SEEDED_DOUBTS.length, seedCases.length);

  for (const sample of SEEDED_DOUBTS) {
    const source = seedCases.find((candidate) => candidate.caseId === sample.id);
    assert.ok(source, `${sample.id} must match a reviewed source seed`);
    assert.equal(sample.problemText, source.input.problemText);
    assert.equal(sample.learnerReasoning, source.input.reasoning.raw);
    assert.equal(sample.visibleWorkText, source.input.visibleWork ?? "");
    assert.equal(Object.hasOwn(sample, "expected"), false);
    assert.equal(Object.hasOwn(sample, "expectedAnswer"), false);
  }
});

test("every sample foothold and goal is a real Marble topic with a canonical path", () => {
  const topicIds = new Set(taxonomy.topics.map((topic) => topic.id));
  for (const sample of SEEDED_DOUBTS) {
    assert.equal(topicIds.has(sample.focusTopicId), true, `${sample.id} focus must be canonical`);
    assert.equal(topicIds.has(sample.goalTopicId), true, `${sample.id} goal must be canonical`);
    assert.equal(hasPath(sample.focusTopicId, sample.goalTopicId), true, `${sample.id} needs a canonical climb`);
  }
});

test("the learner pathway renders real graph edges and moves with atomic lesson stages", async () => {
  const [climbSource, intakeSource, explainerSource] = await Promise.all([
    readFile(new URL("../app/components/CurriculumClimb.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/diagnose/DiagnosticIntake.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/FractionConceptExplainer.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(climbSource, /taxonomy\.dependencies\.map/);
  assert.match(climbSource, /12 canonical dependencies/);
  assert.match(climbSource, /STAGE_TO_CLIMB_INDEX = \[0, 0, 1, 1, 2, 3, 4\]/);
  assert.match(climbSource, /not a mastery score/);
  assert.match(intakeSource, /SEEDED_DOUBTS\.map/);
  assert.match(intakeSource, /visibleWorkText/);
  assert.match(intakeSource, /<CurriculumClimb/);
  assert.match(explainerSource, /<LessonClimb stageIndex=\{stageIndex\}/);
});
