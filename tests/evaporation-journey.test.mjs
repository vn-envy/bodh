import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import evaporationTaxonomy from "../data/taxonomy/evaporation-water-cycle.slice.json" with { type: "json" };
import {
  EVAPORATION_CONCEPT_STAGES,
  EVAPORATION_NARRATION_VERSION,
  narrationBeatForEvaporation,
} from "../lib/evaporation-concept.ts";
import {
  evaporationJourneyReducer,
  INITIAL_EVAPORATION_JOURNEY,
} from "../lib/evaporation-journey.ts";
import {
  SCIENCE_PROBE_CATALOG,
  reviewedProbeById,
  reviewedProbeSelectionIsValid,
  selectReviewedProbe,
} from "../lib/reviewed-probes.ts";
import {
  curatedFallbackForSeed,
  learningHrefForSeed,
  seededDoubtById,
} from "../lib/seeded-doubts.ts";
import {
  SEEDED_JOURNEY_VERSION,
  parseSeedJourneyHandoff,
  serializeSeedJourneyHandoff,
} from "../lib/seeded-journey.ts";

const MARBLE_COMMIT = "96a7933754af672e1bfdbf7ecb05c325860c6e0d";
const RAIN_AND_PUDDLES = "mt_TlLE4cZgOr";
const HEATING_AND_COOLING = "mt_Pl-nsjYGZ3";
const PROCESS_VOCABULARY = "mt_ahSqW_kK1b";
const WATER_CYCLE = "mt_fhqVdj4BYr";
const EVAPORATION_TARGET = "mt_Qkewo5M3_c";

function dependency(prerequisiteId, topicId, strength) {
  return evaporationTaxonomy.dependencies.find((edge) => (
    edge.prerequisiteId === prerequisiteId
    && edge.topicId === topicId
    && edge.strength === strength
  ));
}

test("pins the evaporation climb to canonical Marble topics and dependencies", () => {
  assert.equal(evaporationTaxonomy.source.repository, "https://github.com/withmarbleapp/os-taxonomy");
  assert.equal(evaporationTaxonomy.source.commit, MARBLE_COMMIT);
  assert.equal(evaporationTaxonomy.selection.suggestedStartTopicId, RAIN_AND_PUDDLES);
  assert.equal(evaporationTaxonomy.selection.targetTopicId, EVAPORATION_TARGET);

  const topicIds = new Set(evaporationTaxonomy.topics.map((topic) => topic.id));
  assert.equal(topicIds.size, evaporationTaxonomy.topics.length, "canonical topic IDs must remain unique");
  for (const edge of evaporationTaxonomy.dependencies) {
    assert.equal(topicIds.has(edge.prerequisiteId), true, `${edge.prerequisiteId} must be in the pinned slice`);
    assert.equal(topicIds.has(edge.topicId), true, `${edge.topicId} must be in the pinned slice`);
  }

  assert.ok(dependency(RAIN_AND_PUDDLES, WATER_CYCLE, "hard"));
  assert.ok(dependency(WATER_CYCLE, EVAPORATION_TARGET, "soft"));
  assert.ok(dependency(HEATING_AND_COOLING, EVAPORATION_TARGET, "hard"));

  const vocabulary = evaporationTaxonomy.topics.find((topic) => topic.id === PROCESS_VOCABULARY);
  assert.equal(vocabulary?.type, "LANGUAGE");
  assert.equal(vocabulary?.name, "Changes & Separation Vocabulary");
  assert.ok(
    dependency(PROCESS_VOCABULARY, EVAPORATION_TARGET, "hard"),
    "precise evaporation and condensation vocabulary is a hard prerequisite",
  );
  assert.equal(
    evaporationTaxonomy.dependencies.some((edge) => edge.topicId === PROCESS_VOCABULARY),
    false,
    "the vocabulary node remains a root in this intentionally bounded slice",
  );
});

test("renders the evaporation Marble graph as a clean, non-crossing dotted route", async () => {
  const [componentSource, cssSource] = await Promise.all([
    readFile(new URL("../app/components/EvaporationCurriculumClimb.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/science/evaporation/EvaporationJourney.module.css", import.meta.url), "utf8"),
  ]);

  const layout = new Map(
    [...componentSource.matchAll(/"(mt_[^"]+)": \{ x: (\d+), y: (\d+) \}/g)]
      .map((match) => [match[1], { x: Number(match[2]), y: Number(match[3]) }]),
  );
  assert.equal(layout.size, evaporationTaxonomy.topics.length);
  for (const topic of evaporationTaxonomy.topics) {
    assert.ok(layout.has(topic.id), `${topic.id} needs a graph coordinate`);
  }

  const orientation = (start, end, point) => (
    (end.x - start.x) * (point.y - start.y)
    - (end.y - start.y) * (point.x - start.x)
  );
  const crosses = (left, right) => {
    const leftStart = layout.get(left.prerequisiteId);
    const leftEnd = layout.get(left.topicId);
    const rightStart = layout.get(right.prerequisiteId);
    const rightEnd = layout.get(right.topicId);
    return orientation(leftStart, leftEnd, rightStart) * orientation(leftStart, leftEnd, rightEnd) < 0
      && orientation(rightStart, rightEnd, leftStart) * orientation(rightStart, rightEnd, leftEnd) < 0;
  };

  for (let leftIndex = 0; leftIndex < evaporationTaxonomy.dependencies.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < evaporationTaxonomy.dependencies.length; rightIndex += 1) {
      const left = evaporationTaxonomy.dependencies[leftIndex];
      const right = evaporationTaxonomy.dependencies[rightIndex];
      const sharedEndpoint = [left.prerequisiteId, left.topicId]
        .some((topicId) => topicId === right.prerequisiteId || topicId === right.topicId);
      if (!sharedEndpoint) {
        assert.equal(crosses(left, right), false, `${left.prerequisiteId}→${left.topicId} crosses ${right.prerequisiteId}→${right.topicId}`);
      }
    }
  }

  assert.match(
    componentSource,
    /const MAIN_ROUTE = \[\s*"mt_TlLE4cZgOr",\s*"mt_fhqVdj4BYr",\s*"mt_Qkewo5M3_c",/,
  );
  assert.match(componentSource, /styles\.climbEdgeRoute/);
  assert.match(componentSource, /data-route-step=\{routeStep \?\? undefined\}/);
  assert.match(cssSource, /\.climbCanvas \{[\s\S]*?aspect-ratio: 1 \/ 1;/);
  assert.match(cssSource, /\.climbEdge \{[\s\S]*?radial-gradient\(circle,/);
  assert.match(cssSource, /\.climbEdgeRoute \{[\s\S]*?radial-gradient\(circle,/);
  assert.doesNotMatch(cssSource, /\.climbEdge::after/);
  assert.match(cssSource, /\.climbSky, \.climbEdges \{ display: none; \}/);
  assert.doesNotMatch(cssSource, /\.climbNode small[^}]*display: none;/);
});

test("authors the evaporation journey as bilingual, pointer-owned narration beats", () => {
  assert.equal(EVAPORATION_NARRATION_VERSION, "evaporation-v2");
  assert.deepEqual(
    EVAPORATION_CONCEPT_STAGES.map((stage) => stage.id),
    ["notice-puddle", "sun-heat", "invisible-vapour", "cooling-cloud", "returning-rain"],
  );

  const allowedTargets = new Set([
    "puddle",
    "water-boundary",
    "sun",
    "surface",
    "vapour-tracker",
    "invisible-note",
    "cool-air",
    "droplets",
    "cloud",
    "rain",
    "cycle",
  ]);
  for (const stage of EVAPORATION_CONCEPT_STAGES) {
    assert.equal(stage.narration.length, 3, `${stage.id} should stay atomic and replayable`);
    assert.equal(new Set(stage.narration.map((beat) => beat.id)).size, stage.narration.length);
    for (const beat of stage.narration) {
      assert.equal(allowedTargets.has(beat.target), true, `${beat.target} needs a rendered pointer target`);
      assert.match(beat.text.hi, /[\u0900-\u097f]/, `${stage.id}/${beat.id} needs Hindi narration`);
      assert.doesNotMatch(beat.text.en, /[\u0900-\u097f]/, `${stage.id}/${beat.id} English must stay English`);
      assert.ok(beat.text.hi.length > 30);
      assert.ok(beat.text.en.length > 30);
      assert.ok(beat.key.hi.length < beat.text.hi.length);
      assert.ok(beat.key.en.length < beat.text.en.length);
    }
  }

  const hindi = narrationBeatForEvaporation("invisible-vapour", "vapour-is-invisible", "hi");
  const english = narrationBeatForEvaporation("invisible-vapour", "vapour-is-invisible", "en");
  assert.ok(hindi);
  assert.ok(english);
  assert.equal(hindi.id, english.id);
  assert.equal(hindi.target, english.target);
  assert.notEqual(hindi.text, english.text);
  assert.equal(narrationBeatForEvaporation("invisible-vapour", "model-injected-beat", "en"), null);
});

test("keeps the invisible-vapour visual scientifically honest", () => {
  const narration = EVAPORATION_CONCEPT_STAGES
    .flatMap((stage) => stage.narration.map((beat) => beat.text.en))
    .join(" ");

  assert.match(narration, /Real water vapour is invisible\./);
  assert.match(narration, /rising dots on screen are only Bodh's tracker/i);
  assert.match(narration, /not visible steam/i);
  assert.match(narration, /Clouds and visible white mist are liquid droplets, not invisible water vapour\./);
  assert.match(narration, /puddle does not need to boil/i);
  assert.match(narration, /matter was not destroyed/i);
});

test("registers one reviewed bilingual science probe and rejects invented selections", () => {
  assert.equal(SCIENCE_PROBE_CATALOG.length, 1);
  const probe = SCIENCE_PROBE_CATALOG[0];
  assert.equal(probe.id, "probe-water-still-exists");
  assert.match(probe.question.hi, /[\u0900-\u097f]/);
  assert.doesNotMatch(probe.question.en, /[\u0900-\u097f]/);
  assert.deepEqual(
    probe.options.map((option) => option.id),
    ["water-invisible-vapour", "water-destroyed-by-sun", "water-only-underground"],
  );
  assert.equal(reviewedProbeById(probe.id), probe);
  assert.equal(selectReviewedProbe(["water-disappears-when-dry"]), probe);
  assert.equal(reviewedProbeSelectionIsValid(probe.id, "water-invisible-vapour"), true);
  assert.equal(reviewedProbeSelectionIsValid(probe.id, "invented-option"), false);
  assert.equal(reviewedProbeSelectionIsValid("invented-probe", "water-invisible-vapour"), false);
});

test("accepts only a real OpenAI science handoff matched to the reviewed seed", () => {
  const seed = seededDoubtById("seed-09");
  assert.ok(seed);
  assert.equal(seed.subject, "science");
  assert.equal(learningHrefForSeed(seed), "/science/evaporation?live=seed-09");
  assert.deepEqual(curatedFallbackForSeed(seed), {
    kind: "curated_science",
    href: "/science/evaporation",
    artifactKey: "science-evaporation",
  });

  const handoff = {
    version: SEEDED_JOURNEY_VERSION,
    seedId: seed.id,
    source: "openai",
    canonicalEquation: seed.problemText,
    conceptIds: [RAIN_AND_PUDDLES, WATER_CYCLE, EVAPORATION_TARGET],
    hypothesisIds: ["water-disappears-when-dry"],
    model: "gpt-5.6",
    promptVersion: "p3.7",
    probeId: "probe-water-still-exists",
    optionId: "water-invisible-vapour",
  };
  const serialised = serializeSeedJourneyHandoff(handoff);
  assert.ok(serialised);
  assert.deepEqual(parseSeedJourneyHandoff(serialised), handoff);

  assert.equal(serializeSeedJourneyHandoff({ ...handoff, source: "reviewed_recovery" }), null);
  assert.equal(serializeSeedJourneyHandoff({ ...handoff, canonicalEquation: "Where did it go?" }), null);
  assert.equal(serializeSeedJourneyHandoff({ ...handoff, optionId: "invented-option" }), null);
  assert.equal(serializeSeedJourneyHandoff({ ...handoff, extra: "not allowed" }), null);
});

test("keeps curated science as the default and unlocks live mode only from a matching handoff", async () => {
  const [pageSource, journeySource, cssSource] = await Promise.all([
    readFile(new URL("../app/science/evaporation/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/science/evaporation/EvaporationJourney.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/science/evaporation/EvaporationJourney.module.css", import.meta.url), "utf8"),
  ]);

  assert.match(pageSource, /<EvaporationJourney\s*\/>/);
  assert.match(journeySource, /query\.get\("live"\) === "seed-09"/);
  assert.match(
    journeySource,
    /parseSeedJourneyHandoff\(window\.sessionStorage\.getItem\(SEEDED_JOURNEY_STORAGE_KEY\)\)/,
  );
  assert.match(journeySource, /handoff\?\.seedId === "seed-09" && handoff\.source === "openai"/);
  assert.match(journeySource, /"water-destroyed-by-sun": "destroyed"/);
  assert.match(journeySource, /"water-only-underground": "underground"/);
  assert.match(journeySource, /return \{ live: false, requestedLive: true, handoff: null \}/);
  assert.match(journeySource, /OpenAI diagnosis complete/);
  assert.match(journeySource, /Reviewed science journey/);
  assert.match(journeySource, /createEvaporationReceiptCardModel/);
  assert.match(journeySource, /<ReceiptImageCard/);
  assert.match(journeySource, /Journey complete · 6\/6/);
  assert.match(journeySource, /Water journey · 5\/5/);
  assert.match(journeySource, /useReducer\(evaporationJourneyReducer, INITIAL_EVAPORATION_JOURNEY\)/);
  assert.match(journeySource, /data-science-screen=/);
  assert.doesNotMatch(journeySource, /EvaporationCurriculumClimb/);
  assert.doesNotMatch(journeySource, /mode\.handoff\?\.canonicalEquation/);
  assert.match(journeySource, /evaporationQuestionFor\(language\)/);
  assert.match(cssSource, /\.shell \{[\s\S]*?height: 100svh;/);
  assert.match(cssSource, /\.frame \{[\s\S]*?overflow: hidden;/);
  assert.doesNotMatch(cssSource, /overflow-y:\s*(?:auto|scroll)/);
  assert.match(cssSource, /\.path::before \{[\s\S]*?radial-gradient\(circle,/);
  assert.match(cssSource, /\.path button \{[\s\S]*?min-height: 46px;/);
  assert.match(cssSource, /pointer-events: none;/);
  assert.match(
    journeySource,
    /\/api\/narration\/\$\{EVAPORATION_NARRATION_VERSION\}\/\$\{language\}\/\$\{stageId\}\/\$\{beatId\}\.mp3/,
  );
  assert.match(journeySource, /for \(const beat of stage\.narration\)/);
  assert.match(journeySource, /audio\.preload = "auto"/);
  assert.match(journeySource, /prepared\.set\(beat\.id, audio\)/);
  assert.match(journeySource, /new Audio\(narrationUrl/);
  assert.doesNotMatch(journeySource, /Promise\.all\(stage\.narration/);
  assert.doesNotMatch(journeySource, /speechSynthesis|SpeechSynthesisUtterance/);
});

test("advances the fixed-window science state machine one screen at a time", () => {
  let state = INITIAL_EVAPORATION_JOURNEY;
  assert.equal(state.screen.kind, "probe");
  assert.equal(
    evaporationJourneyReducer(state, { type: "review-concept", stageIndex: 3 }),
    state,
    "future graph nodes stay locked",
  );

  state = evaporationJourneyReducer(state, { type: "start" });
  assert.deepEqual(state.screen, { kind: "concept", stageIndex: 0 });
  assert.equal(state.furthestConcept, 0);
  assert.equal(
    evaporationJourneyReducer(state, { type: "review-concept", stageIndex: 2 }),
    state,
  );

  for (let index = 1; index < 5; index += 1) {
    state = evaporationJourneyReducer(state, { type: "advance-concept" });
    assert.deepEqual(state.screen, { kind: "concept", stageIndex: index });
  }
  state = evaporationJourneyReducer(state, { type: "advance-concept" });
  assert.equal(state.screen.kind, "bridge");
  state = evaporationJourneyReducer(state, { type: "begin-transfer" });
  assert.equal(state.screen.kind, "transfer-evidence");
  assert.equal(state.transferUnlocked, true);
  assert.equal(state.transferCompleted, false);
  state = evaporationJourneyReducer(state, { type: "place-lid" });
  assert.equal(state.screen.kind, "transfer-choice");
  state = evaporationJourneyReducer(state, { type: "complete-transfer" });
  assert.equal(state.screen.kind, "transfer-success");
  assert.equal(state.transferCompleted, true);
  state = evaporationJourneyReducer(state, { type: "show-receipt" });
  assert.equal(state.screen.kind, "receipt");
  assert.deepEqual(evaporationJourneyReducer(state, { type: "restart" }), INITIAL_EVAPORATION_JOURNEY);
});

test("reviewing an earlier graph node preserves reached concepts and honest transfer status", () => {
  let state = evaporationJourneyReducer(INITIAL_EVAPORATION_JOURNEY, { type: "start" });
  state = evaporationJourneyReducer(state, { type: "advance-concept" });
  state = evaporationJourneyReducer(state, { type: "advance-concept" });
  assert.equal(state.furthestConcept, 2);

  state = evaporationJourneyReducer(state, { type: "review-probe" });
  state = evaporationJourneyReducer(state, { type: "start" });
  assert.equal(state.furthestConcept, 2, "restarting from Think must not relock visited concepts");
  state = evaporationJourneyReducer(state, { type: "review-concept", stageIndex: 2 });
  assert.deepEqual(state.screen, { kind: "concept", stageIndex: 2 });

  state = evaporationJourneyReducer(state, { type: "advance-concept" });
  state = evaporationJourneyReducer(state, { type: "advance-concept" });
  state = evaporationJourneyReducer(state, { type: "advance-concept" });
  state = evaporationJourneyReducer(state, { type: "begin-transfer" });
  assert.equal(state.transferUnlocked, true);
  assert.equal(state.transferCompleted, false);
  state = evaporationJourneyReducer(state, { type: "review-concept", stageIndex: 4 });
  assert.equal(state.transferCompleted, false, "opening Transfer must not mark it complete");
});

async function render(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("evaporation-route-test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders a hydration-stable evaporation route without inventing live evidence", async () => {
  for (const pathname of ["/science/evaporation", "/science/evaporation?live=seed-09"]) {
    const response = await render(pathname);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
    const html = await response.text();
    assert.match(html, /data-science-screen="probe"/);
    assert.match(html, /पानी सच में गायब हुआ\?/);
    assert.doesNotMatch(html, /aria-busy="true"/);
    assert.doesNotMatch(html, /Following one drop of water…/);
    assert.match(html, /Where did the puddle go\?/);
    assert.doesNotMatch(html, /OpenAI diagnosis complete/);
  }
});
