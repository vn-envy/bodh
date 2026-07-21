import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import taxonomy from "../data/taxonomy/fractions-division.slice.json" with { type: "json" };
import evaporationTaxonomy from "../data/taxonomy/evaporation-water-cycle.slice.json" with { type: "json" };
import seedCases from "../data/fixtures/seed-cases.json" with { type: "json" };
import { SEEDED_DOUBT_IDS, SEEDED_DOUBTS } from "../lib/seeded-doubts.ts";

function hasPath(slice, start, goal) {
  if (start === goal) return true;
  const pending = [start];
  const visited = new Set(pending);
  while (pending.length > 0) {
    const current = pending.shift();
    for (const edge of slice.dependencies.filter((candidate) => candidate.prerequisiteId === current)) {
      if (edge.topicId === goal) return true;
      if (visited.has(edge.topicId)) continue;
      visited.add(edge.topicId);
      pending.push(edge.topicId);
    }
  }
  return false;
}

test("all nine reviewed seeds have a learner-safe selectable projection", () => {
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
  for (const sample of SEEDED_DOUBTS) {
    const slice = sample.subject === "science" ? evaporationTaxonomy : taxonomy;
    const topicIds = new Set(slice.topics.map((topic) => topic.id));
    assert.equal(topicIds.has(sample.focusTopicId), true, `${sample.id} focus must be canonical`);
    assert.equal(topicIds.has(sample.goalTopicId), true, `${sample.id} goal must be canonical`);
    assert.equal(hasPath(slice, sample.focusTopicId, sample.goalTopicId), true, `${sample.id} needs a canonical climb`);
  }
});

test("the homepage Pathfinder preview is one real, ordered Marble route", async () => {
  const route = [
    "mt_ndGqFPWyen",
    "mt_09sySPqM9Z",
    "mt_TgHxujL81r",
    "mt_AabJisinfi",
    "mt_9Y96vxG_LH",
  ];
  const topicIds = new Set(taxonomy.topics.map((topic) => topic.id));

  for (const topicId of route) {
    assert.equal(topicIds.has(topicId), true, `${topicId} must remain a canonical topic`);
  }
  for (let index = 0; index < route.length - 1; index += 1) {
    assert.equal(
      taxonomy.dependencies.some((edge) => edge.prerequisiteId === route[index] && edge.topicId === route[index + 1]),
      true,
      `${route[index]} → ${route[index + 1]} must remain a canonical dependency`,
    );
  }

  const source = await readFile(new URL("../app/components/HomepagePathfinder.tsx", import.meta.url), "utf8");
  let previousIndex = -1;
  for (const topicId of route) {
    const nextIndex = source.indexOf(`\"${topicId}\"`);
    assert.ok(nextIndex > previousIndex, `${topicId} must render in prerequisite order`);
    previousIndex = nextIndex;
  }
  assert.match(source, /example route—not a grade, mastery score/i);
});

test("the learner pathway renders real graph edges and moves with atomic lesson stages", async () => {
  const [climbSource, climbStyles, intakeSource, explainerSource] = await Promise.all([
    readFile(new URL("../app/components/CurriculumClimb.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/design-refinement.css", import.meta.url), "utf8"),
    readFile(new URL("../app/diagnose/DiagnosticIntake.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/FractionConceptExplainer.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(climbSource, /taxonomy\.dependencies\.map/);
  assert.equal(taxonomy.dependencies.length, 12);
  assert.match(climbSource, /taxonomy\.dependencies\.length/);
  assert.match(climbSource, /className="climb-dependencies"/);
  assert.match(climbSource, /ORDERED_TOPICS\.map/);
  assert.match(climbSource, /return \[start\];/);
  assert.doesNotMatch(climbSource, /return \[start, goal\];/);
  assert.doesNotMatch(climbSource, /You are here|तुम यहाँ हो/);
  assert.match(climbStyles, /aspect-ratio: 1\.6129 \/ 1/);
  assert.doesNotMatch(climbStyles, /order: var\(--node-order\)/);
  assert.match(climbStyles, /\.climb-node:focus-visible \{[^}]*outline: 4px solid var\(--pink\)/s);
  assert.match(climbSource, /STAGE_TO_CLIMB_INDEX = \[0, 0, 1, 1, 2, 3, 4\]/);
  assert.match(climbSource, /not a mastery score/);
  assert.match(intakeSource, /SEEDED_DOUBTS\.map/);
  assert.match(intakeSource, /visibleWorkText/);
  assert.match(intakeSource, /<CurriculumClimb/);
  assert.match(explainerSource, /<LessonClimb stageIndex=\{stageIndex\}/);
});
