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

test("authors the evaporation journey as bilingual, pointer-owned narration beats", () => {
  assert.equal(EVAPORATION_NARRATION_VERSION, "evaporation-v1");
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
  const [pageSource, journeySource] = await Promise.all([
    readFile(new URL("../app/science/evaporation/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/science/evaporation/EvaporationJourney.tsx", import.meta.url), "utf8"),
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
  assert.match(journeySource, /Live OpenAI diagnosis · reviewed visual evidence/);
  assert.match(journeySource, /Curated Science journey/);
  assert.match(
    journeySource,
    /\/api\/narration\/\$\{EVAPORATION_NARRATION_VERSION\}\/\$\{language\}\/\$\{stageId\}\/\$\{beatId\}\.mp3/,
  );
  assert.match(journeySource, /no device-voice fallback/);
  assert.doesNotMatch(journeySource, /speechSynthesis|SpeechSynthesisUtterance/);
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
    assert.match(html, /Following one drop of water…/);
    assert.match(html, /aria-busy="true"/);
    assert.match(html, /Where did the puddle go\?/);
    assert.doesNotMatch(html, /Live OpenAI diagnosis · reviewed visual evidence/);
  }
});
