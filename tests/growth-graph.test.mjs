import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import {
  EVIDENCE_RUNGS,
  createGrowthGraph,
  evidenceFor,
  exportBodhiSeed,
  importBodhiSeed,
  isFogged,
  nextFrontier,
  nodeRung,
  parseGrowthGraph,
  reduceGrowthEvents,
  reduceGrowthGraph,
  rungCounts,
  seededRandom,
  serializeGrowthGraph,
  stateHashForGraph,
} from "../lib/growth-graph.ts";
import {
  FRACTION_ATOM_NODES,
  GROWTH_EDGES,
  GROWTH_NODES,
  MARBLE_FRACTION_EDGES,
  MARBLE_FRACTION_NODES,
  MARBLE_WATER_EDGES,
  MARBLE_WATER_NODES,
  MISCONCEPTION_SIGNAL_IDS,
  WATER_ATOM_NODES,
} from "../lib/growth-graph-catalog.ts";
import {
  adaptiveEvidenceEventToGrowth,
  evaporationActionToGrowth,
} from "../lib/growth-graph-adapters.ts";
import {
  REPAIR_ENTRY_ATOM_IDS,
  createAdaptiveEvidenceState,
  reduceAdaptiveEvidence,
  requiredRepairAtomIds,
} from "../lib/adaptive-repair.ts";
import { EVAPORATION_CONCEPT_STAGES } from "../lib/evaporation-concept.ts";
import { INITIAL_EVAPORATION_JOURNEY, evaporationJourneyReducer } from "../lib/evaporation-journey.ts";

const ROOT = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, ROOT), "utf8"));

test("the catalogue mirrors the committed Marble slices exactly", async () => {
  const fractions = await readJson("data/taxonomy/fractions-division.slice.json");
  const water = await readJson("data/taxonomy/evaporation-water-cycle.slice.json");
  const edgeKey = (edge) => `${edge.prerequisiteId}>${edge.topicId}:${edge.strength}`;

  assert.deepEqual(MARBLE_FRACTION_NODES.map((n) => n.id).sort(), fractions.topics.map((t) => t.id).sort());
  assert.deepEqual(MARBLE_WATER_NODES.map((n) => n.id).sort(), water.topics.map((t) => t.id).sort());
  assert.deepEqual(MARBLE_FRACTION_EDGES.map(edgeKey).sort(), fractions.dependencies.map(edgeKey).sort());
  assert.deepEqual(MARBLE_WATER_EDGES.map(edgeKey).sort(), water.dependencies.map(edgeKey).sort());

  assert.deepEqual(FRACTION_ATOM_NODES.map((n) => n.id), [...REPAIR_ENTRY_ATOM_IDS]);
  assert.deepEqual(WATER_ATOM_NODES.map((n) => n.id), EVAPORATION_CONCEPT_STAGES.map((s) => s.id));

  const ids = GROWTH_NODES.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length, "node IDs are unique");
  for (const edge of GROWTH_EDGES) {
    assert.ok(ids.includes(edge.prerequisiteId) && ids.includes(edge.topicId), `edge inside catalogue: ${edgeKey(edge)}`);
    assert.notEqual(edge.prerequisiteId, edge.topicId);
  }
  for (const node of GROWTH_NODES) {
    if (node.parentId) assert.ok(ids.includes(node.parentId), `parent exists for ${node.id}`);
    assert.ok(node.label.hi && node.label.en);
  }
});

test("misconception signals mirror the diagnostic guardrail allowlist", async () => {
  const guardrails = await readFile(new URL("lib/diagnostic-guardrails.ts", ROOT), "utf8");
  const block = guardrails.match(/const HYPOTHESIS_IDS = new Set\(\[([\s\S]*?)\]\)/)[1];
  const ids = [...block.matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
  assert.deepEqual([...MISCONCEPTION_SIGNAL_IDS], ids);
});

test("the ladder only moves up and failed attempts are still evidence", () => {
  let graph = createGrowthGraph();
  graph = reduceGrowthGraph(graph, { type: "place-visited", nodeIds: ["notice-puddle"] });
  assert.equal(evidenceFor(graph, "notice-puddle").rung, "noticed");

  graph = reduceGrowthGraph(graph, { type: "station-attempt", nodeId: "notice-puddle", success: false, misconceptionSignals: ["water-disappears-when-dry", "not-a-signal"] });
  assert.equal(evidenceFor(graph, "notice-puddle").rung, "tinkered");
  assert.equal(evidenceFor(graph, "notice-puddle").attempts, 1);
  assert.deepEqual(evidenceFor(graph, "notice-puddle").misconceptionSignals, ["water-disappears-when-dry"]);

  graph = reduceGrowthGraph(graph, { type: "place-visited", nodeIds: ["notice-puddle"] });
  assert.equal(evidenceFor(graph, "notice-puddle").rung, "tinkered", "revisiting never lowers a rung");

  graph = reduceGrowthGraph(graph, { type: "taught-back", nodeId: "notice-puddle" });
  assert.equal(evidenceFor(graph, "notice-puddle").rung, "tinkered", "teach-back needs transfer first");

  graph = reduceGrowthGraph(graph, { type: "atom-completed", nodeId: "notice-puddle" });
  graph = reduceGrowthGraph(graph, { type: "transfer-attempted", nodeIds: ["notice-puddle"], correct: false });
  assert.equal(evidenceFor(graph, "notice-puddle").rung, "explained");
  assert.equal(evidenceFor(graph, "notice-puddle").attempts, 2);
  graph = reduceGrowthGraph(graph, { type: "transfer-attempted", nodeIds: ["notice-puddle"], correct: true });
  assert.equal(evidenceFor(graph, "notice-puddle").rung, "transferred");
  assert.equal(evidenceFor(graph, "notice-puddle").dueTick, 30);
  graph = reduceGrowthGraph(graph, { type: "taught-back", nodeId: "notice-puddle" });
  assert.equal(evidenceFor(graph, "notice-puddle").rung, "taught-back");

  const untouched = reduceGrowthGraph(graph, { type: "atom-completed", nodeId: "not-a-node" });
  assert.equal(untouched, graph);
  assert.deepEqual([...EVIDENCE_RUNGS], ["unseen", "noticed", "tinkered", "explained", "transferred", "taught-back"]);
});

test("a Marble concept lights once all of its atoms do", () => {
  let graph = createGrowthGraph();
  assert.equal(nodeRung(graph, "mt_ndGqFPWyen"), "unseen");
  graph = reduceGrowthGraph(graph, { type: "atom-completed", nodeId: "chosen-whole" });
  assert.equal(nodeRung(graph, "mt_ndGqFPWyen"), "unseen", "one of two atoms is not enough");
  graph = reduceGrowthGraph(graph, { type: "atom-completed", nodeId: "equal-parts" });
  assert.equal(nodeRung(graph, "mt_ndGqFPWyen"), "explained");
});

test("the frontier is deterministic, respects hard prerequisites, and lights due nodes first", () => {
  const empty = createGrowthGraph();
  const a = nextFrontier(empty, "riya");
  const b = nextFrontier(empty, "riya");
  assert.deepEqual(a, b);
  const roots = a.map((entry) => entry.nodeId);
  assert.ok(roots.includes("chosen-whole") && roots.includes("notice-puddle") && roots.includes("mt_ndGqFPWyen"));
  assert.ok(!roots.includes("equal-parts"), "hard prerequisite unmet");
  assert.ok(!roots.includes("mt_9Y96vxG_LH"));
  assert.equal(isFogged(empty, "equal-parts"), true);
  assert.equal(isFogged(empty, "chosen-whole"), false);

  const other = nextFrontier(empty, "arjun").map((entry) => entry.nodeId);
  assert.deepEqual([...other].sort(), [...roots].sort(), "same reachable set, seed only reorders");

  let graph = reduceGrowthGraph(empty, { type: "atom-completed", nodeId: "chosen-whole" });
  const after = nextFrontier(graph, "riya");
  assert.ok(after.some((entry) => entry.nodeId === "equal-parts" && entry.reason === "curious"));

  graph = reduceGrowthEvents(graph, [
    { type: "atom-completed", nodeId: "equal-parts" },
    { type: "transfer-attempted", nodeIds: ["equal-parts"], correct: true },
  ]);
  assert.ok(!nextFrontier(graph).some((entry) => entry.nodeId === "equal-parts"), "transferred nodes rest");
  graph = reduceGrowthGraph(graph, { type: "tick", count: 30 });
  assert.equal(nextFrontier(graph)[0].nodeId, "equal-parts");
  assert.equal(nextFrontier(graph)[0].reason, "due");
});

test("seeded random is stable across runs", () => {
  const first = seededRandom("bodh");
  const second = seededRandom("bodh");
  const values = Array.from({ length: 5 }, () => first());
  assert.deepEqual(values, Array.from({ length: 5 }, () => second()));
  assert.ok(values.every((value) => value >= 0 && value < 1));
});

test("serialisation is strict, canonical, and validates against the schema", async () => {
  const graph = reduceGrowthEvents(createGrowthGraph(), [
    { type: "place-visited", nodeIds: ["notice-puddle", "sun-heat"] },
    { type: "station-attempt", nodeId: "sun-heat", success: true, misconceptionSignals: ["evaporation-requires-boiling"] },
    { type: "tick" },
  ]);
  const serialised = serializeGrowthGraph(graph);
  assert.ok(serialised);
  assert.deepEqual(parseGrowthGraph(serialised), graph);
  assert.equal(serializeGrowthGraph(parseGrowthGraph(serialised)), serialised);

  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validate = ajv.compile(await readJson("schemas/growth-graph.schema.json"));
  assert.ok(validate(JSON.parse(serialised)), ajv.errorsText(validate.errors));

  assert.equal(parseGrowthGraph(JSON.stringify({ ...graph, extra: 1 })), null);
  assert.equal(parseGrowthGraph(JSON.stringify({ ...graph, version: "growth-graph-v0" })), null);
  assert.equal(parseGrowthGraph(JSON.stringify({ ...graph, nodes: { ...graph.nodes, "not-a-node": graph.nodes["sun-heat"] } })), null);
  assert.equal(parseGrowthGraph(JSON.stringify({ ...graph, nodes: { "sun-heat": { ...graph.nodes["sun-heat"], learnerText: "hi" } } })), null);
  assert.equal(parseGrowthGraph("x".repeat(40_000)), null);
  assert.equal(serializeGrowthGraph({ version: "growth-graph-v1", tick: -1, nodes: {} }), null);
});

test("the Bodhi seed round-trips and rejects tampering", () => {
  const graph = reduceGrowthEvents(createGrowthGraph(), [
    { type: "atom-completed", nodeId: "chosen-whole" },
    { type: "station-attempt", nodeId: "division-unknown-factor", success: true },
  ]);
  const seed = exportBodhiSeed(graph);
  assert.match(seed, /^bodhi1\.[0-9a-f]{8}\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(importBodhiSeed(`  ${seed}\n`), graph);
  assert.equal(importBodhiSeed(seed.slice(0, -2) + "zz"), null);
  assert.equal(importBodhiSeed("bodhi1.deadbeef." + seed.split(".")[2]), null);
  assert.equal(importBodhiSeed("not a seed"), null);
  assert.equal(stateHashForGraph(graph), stateHashForGraph(importBodhiSeed(seed)));
});

test("the existing fraction journey feeds the graph through the adapter", () => {
  let adaptive = createAdaptiveEvidenceState();
  let graph = createGrowthGraph();
  const apply = (event) => {
    const entryAtomId = adaptive.session?.entryAtomId ?? null;
    adaptive = reduceAdaptiveEvidence(adaptive, event);
    graph = reduceGrowthEvents(graph, adaptiveEvidenceEventToGrowth(event, adaptive.session?.entryAtomId ?? entryAtomId));
  };
  apply({ type: "probe-answered", probeId: "probe-unit-size", optionId: "unit-quarter-smaller" });
  assert.equal(evidenceFor(graph, "unit-and-denominator").rung, "noticed");
  apply({ type: "journey-started", entryAtomId: "unit-and-denominator" });
  for (const atomId of requiredRepairAtomIds("unit-and-denominator")) apply({ type: "atom-completed", atomId });
  apply({ type: "lab-completed" });
  apply({ type: "transfer-attempted", correct: false });
  apply({ type: "transfer-hint-shown" });
  apply({ type: "transfer-attempted", correct: true });
  apply({ type: "meaning-chosen", choiceId: "meaning-groups-fit" });
  apply({ type: "return-attempted", correct: true });

  assert.equal(evidenceFor(graph, "division-unknown-factor").rung, "transferred");
  assert.equal(evidenceFor(graph, "division-unknown-factor").attempts, 3);
  assert.equal(evidenceFor(graph, "mt_9Y96vxG_LH").rung, "transferred");
  assert.equal(evidenceFor(graph, "mt_9Y96vxG_LH").attempts, 3);
  assert.equal(evidenceFor(graph, "repeated-composition").rung, "explained");
  assert.equal(evidenceFor(graph, "chosen-whole").rung, "unseen", "atoms before the entry point were not taught");
  // Five atoms from the entry point onward, plus their four Marble parents and the target topic.
  assert.equal(rungCounts(graph).explained + rungCounts(graph).transferred, 10);
  assert.equal(nodeRung(graph, "mt_09sySPqM9Z"), "explained");
  assert.equal(nodeRung(graph, "mt_GDG9_SZmsO"), "transferred");
});

test("the evaporation journey feeds the graph through the adapter", () => {
  let state = INITIAL_EVAPORATION_JOURNEY;
  let graph = createGrowthGraph();
  const apply = (action) => {
    graph = reduceGrowthEvents(graph, evaporationActionToGrowth(action, state));
    state = evaporationJourneyReducer(state, action);
  };
  apply({ type: "start" });
  for (let index = 0; index < EVAPORATION_CONCEPT_STAGES.length; index += 1) apply({ type: "advance-concept" });
  apply({ type: "begin-transfer" });
  apply({ type: "place-lid" });
  apply({ type: "complete-transfer" });

  assert.equal(state.screen.kind, "transfer-success");
  for (const stage of EVAPORATION_CONCEPT_STAGES) {
    assert.ok(["explained", "transferred"].includes(evidenceFor(graph, stage.id).rung), stage.id);
  }
  assert.equal(evidenceFor(graph, "cooling-cloud").rung, "transferred");
  assert.equal(evidenceFor(graph, "mt_Qkewo5M3_c").rung, "transferred");
  assert.equal(nodeRung(graph, "mt_TlLE4cZgOr"), "explained");
});
