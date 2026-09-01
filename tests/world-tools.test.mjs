import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import { createGrowthGraph, evidenceFor, reduceGrowthEvents } from "../lib/growth-graph.ts";
import { PLACES, placeStatus } from "../lib/world/places.ts";
import { createWorldSession, dispatchWorld, observeWorld, sessionHash } from "../lib/world/session.ts";
import { STATIONS } from "../lib/world/stations.ts";
import { createPuddle, puddleCounts, puddleHash, stepPuddleTimes, setPuddleControl } from "../lib/world/stations/puddle-sun.ts";
import { balancingCount, createSeesaw, SEESAW_TASKS, seesawBalanced, seesawSignals, setSeesawPieces } from "../lib/world/stations/roti-seesaw.ts";
import { WORLD_TOOLS, invokeWorldTool, worldToolManifest } from "../lib/world-tools.ts";

const ROOT = new URL("../", import.meta.url);

test("every tool has a name, a human description, a strict object schema and a read-only annotation", () => {
  assert.ok(WORLD_TOOLS.length >= 9);
  const names = new Set();
  for (const tool of WORLD_TOOLS) {
    assert.match(tool.name, /^bodh_[a-z_]+$/);
    assert.ok(!names.has(tool.name), `duplicate ${tool.name}`);
    names.add(tool.name);
    assert.ok(tool.description.length > 30, `${tool.name} needs a description written for a person`);
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(tool.inputSchema.additionalProperties, false);
    assert.equal(typeof tool.annotations.readOnlyHint, "boolean");
    for (const key of tool.inputSchema.required ?? []) assert.ok(key in tool.inputSchema.properties);
  }
  const readOnly = WORLD_TOOLS.filter((tool) => tool.annotations.readOnlyHint).map((tool) => tool.name).sort();
  assert.deepEqual(readOnly, ["bodh_export_bodhi_seed", "bodh_observe_world", "bodh_read_growth_graph"]);
});

test("tool schemas are valid JSON Schema and the manifest matches the registry", async () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  for (const tool of WORLD_TOOLS) {
    assert.doesNotThrow(() => ajv.compile(tool.inputSchema), `${tool.name} schema must compile`);
  }
  const manifest = worldToolManifest();
  assert.equal(manifest.version, "bodh-van-tools-v1");
  assert.deepEqual(manifest.tools.map((tool) => tool.name), WORLD_TOOLS.map((tool) => tool.name));
  const worker = await readFile(new URL("worker/index.ts", ROOT), "utf8");
  assert.match(worker, /url\.pathname === "\/api\/tools"/);
});

test("read-only tools never change state and never reveal a success predicate", () => {
  const session = createWorldSession("test-seed", "en");
  for (const name of ["bodh_observe_world", "bodh_read_growth_graph", "bodh_export_bodhi_seed"]) {
    const { session: next, result } = invokeWorldTool(name, {}, session);
    assert.equal(next, session, `${name} must not mutate`);
    assert.equal(result.ok, true);
    const serialised = JSON.stringify(result.structuredContent);
    assert.doesNotMatch(serialised, /expectedCount|balancingCount|correct"?\s*:\s*true/);
  }
  const unknown = invokeWorldTool("bodh_solve_it", {}, session);
  assert.equal(unknown.result.ok, false);
  assert.equal(unknown.result.structuredContent.code, "unknown-tool");
});

test("invalid input is refused before it can touch state", () => {
  const session = createWorldSession("test-seed", "en");
  const bad = invokeWorldTool("bodh_walk_to", { placeId: "narnia" }, session);
  assert.equal(bad.result.ok, false);
  assert.equal(bad.result.structuredContent.code, "invalid-input");
  const extra = invokeWorldTool("bodh_walk_to", { placeId: "puddle-ghat", answer: 6 }, session);
  assert.equal(extra.result.structuredContent.code, "invalid-input");
  const missing = invokeWorldTool("bodh_answer_probe", { probeId: "probe-water-still-exists" }, session);
  assert.equal(missing.result.structuredContent.code, "invalid-input");
  assert.equal(bad.session, session);
});

test("gates: fog, order, probe-before-tinker, attempt-before-explain", () => {
  let session = createWorldSession("gates", "en");
  const view = observeWorld(session);
  assert.equal(view.places.find((p) => p.id === "puddle-ghat").status, "lit");
  assert.equal(view.places.find((p) => p.id === "roti-chowk").status, "lit");

  // Nothing is possible outside a place.
  assert.equal(dispatchWorld(session, { type: "enter-station" }).outcome.code, "not-at-place");
  assert.equal(dispatchWorld(session, { type: "tinker", control: "sun", value: 3 }).outcome.code, "not-inside");

  session = dispatchWorld(session, { type: "walk-to", placeId: "puddle-ghat" }).session;
  assert.equal(evidenceFor(session.graph, "notice-puddle").rung, "noticed");
  const entered = dispatchWorld(session, { type: "enter-station" });
  session = entered.session;
  assert.equal(entered.outcome.code, "probe-shown");
  assert.equal(entered.outcome.probe.id, "probe-water-still-exists");

  // Probe first: tinkering, checking and explaining are all refused.
  assert.equal(dispatchWorld(session, { type: "tinker", control: "sun", value: 3 }).outcome.code, "probe-first");
  assert.equal(dispatchWorld(session, { type: "check" }).outcome.code, "probe-first");
  assert.equal(dispatchWorld(session, { type: "explain" }).outcome.code, "probe-first");
  assert.equal(dispatchWorld(session, { type: "answer-probe", probeId: "transfer-cold-lid", optionId: "lid-droplets-form" }).outcome.code, "wrong-probe");
  assert.equal(dispatchWorld(session, { type: "answer-probe", probeId: "probe-water-still-exists", optionId: "nope" }).outcome.code, "wrong-option");

  const answered = dispatchWorld(session, { type: "answer-probe", probeId: "probe-water-still-exists", optionId: "water-destroyed-by-sun" });
  session = answered.session;
  assert.equal(answered.outcome.code, "probe-answered");
  assert.deepEqual(evidenceFor(session.graph, "notice-puddle").misconceptionSignals, ["water-disappears-when-dry"]);

  // Attempt before explanation.
  assert.equal(dispatchWorld(session, { type: "explain" }).outcome.code, "attempt-first");
  assert.equal(dispatchWorld(session, { type: "check" }).outcome.code, "nothing-yet");
  assert.equal(dispatchWorld(session, { type: "tinker", control: "pieces", value: 3 }).outcome.code, "bad-control");
  assert.equal(dispatchWorld(session, { type: "tinker", control: "sun", value: 9 }).outcome.code, "bad-value");
  assert.equal(dispatchWorld(session, { type: "replay-beat", beatId: "name-liquid-water" }).outcome.code, "beat-unknown");
});

test("the puddle simulation is deterministic and conserves water under every control", () => {
  const a = stepPuddleTimes(setPuddleControl(createPuddle("river"), "sun", 3), 40);
  const b = stepPuddleTimes(setPuddleControl(createPuddle("river"), "sun", 3), 40);
  assert.equal(puddleHash(a), puddleHash(b));
  // Early in the run, different seeds evaporate different units; later every unit is vapour either way.
  assert.notEqual(
    puddleHash(stepPuddleTimes(setPuddleControl(createPuddle("river"), "sun", 3), 3)),
    puddleHash(stepPuddleTimes(setPuddleControl(createPuddle("lake"), "sun", 3), 3)),
  );
  for (const sun of [0, 1, 2, 3]) {
    for (const wind of [0, 1, 2]) {
      for (const lid of [false, true]) {
        let state = createPuddle("conserve");
        state = setPuddleControl(state, "sun", sun);
        state = setPuddleControl(state, "wind", wind);
        state = setPuddleControl(state, "lid", lid);
        for (let index = 0; index < 60; index += 1) {
          state = stepPuddleTimes(state, 1);
          assert.equal(puddleCounts(state).total, 12, `total water at sun ${sun} wind ${wind} lid ${lid}`);
        }
      }
    }
  }
  const hot = stepPuddleTimes(setPuddleControl(createPuddle("hot"), "sun", 3), 30);
  assert.ok(puddleCounts(hot).vapour > 0, "a hot sun evaporates something");
  const lidded = stepPuddleTimes(setPuddleControl(setPuddleControl(createPuddle("hot"), "sun", 3), "lid", true), 60);
  assert.ok(puddleCounts(lidded).droplet + puddleCounts(lidded).liquid > 0);
  assert.equal(puddleCounts(stepPuddleTimes(setPuddleControl(createPuddle("night"), "sun", 0), 60)).liquid, 12, "no sun, no evaporation");
});

test("the seesaw balances at exactly the six-eighths lab predicate and names informative misses", () => {
  assert.equal(balancingCount(SEESAW_TASKS["three-quarters-by-eighths"]), 6);
  assert.equal(balancingCount(SEESAW_TASKS["two-thirds-by-sixths"]), 4);
  let state = createSeesaw("chowk");
  assert.equal(seesawBalanced(state), false);
  state = setSeesawPieces(state, 3);
  assert.deepEqual(seesawSignals(state), ["fraction-as-two-whole-numbers"]);
  state = setSeesawPieces(state, 4);
  assert.deepEqual(seesawSignals(state), ["unit-fraction-size-confusion"]);
  state = setSeesawPieces(state, 6);
  assert.equal(seesawBalanced(state), true);
  assert.deepEqual(seesawSignals(state), []);
  assert.equal(setSeesawPieces(state, 9), state, "capacity is enforced");
});

test("place status follows the frontier and fog lifts as prerequisites are explained", () => {
  const empty = createGrowthGraph();
  for (const place of PLACES) assert.equal(placeStatus(empty, place.id), "lit");
  let graph = reduceGrowthEvents(empty, [
    { type: "atom-completed", nodeId: "notice-puddle" },
    { type: "transfer-attempted", nodeIds: ["notice-puddle"], correct: true },
  ]);
  assert.equal(placeStatus(graph, "puddle-ghat"), "lit", "the next atom is now reachable");
  graph = reduceGrowthEvents(graph, [{ type: "tick", count: 40 }]);
  assert.equal(placeStatus(graph, "puddle-ghat"), "due");
});

test("the same tool sequence gives the same state hash; a different seed gives a different world", () => {
  const script = [
    ["bodh_walk_to", { placeId: "roti-chowk" }],
    ["bodh_enter_station", {}],
    ["bodh_answer_probe", { probeId: "probe-unit-size", optionId: "unit-quarter-smaller" }],
    ["bodh_tinker", { control: "pieces", value: 4 }],
    ["bodh_check", {}],
    ["bodh_tinker", { control: "pieces", value: 6 }],
    ["bodh_check", {}],
    ["bodh_ask_bodh", { intent: "explain" }],
  ];
  const run = (seed) => script.reduce((session, [name, input]) => invokeWorldTool(name, input, session).session, createWorldSession(seed, "hi"));
  const first = run("riya");
  const second = run("riya");
  assert.equal(sessionHash(first), sessionHash(second));
  assert.equal(JSON.stringify(observeWorld(first)), JSON.stringify(observeWorld(second)));
  assert.equal(first.world.station.phase, "explain");
  assert.equal(first.world.station.attempts, 2);
  assert.equal(evidenceFor(first.graph, "division-unknown-factor").attempts, 2);
  assert.deepEqual(evidenceFor(first.graph, "division-unknown-factor").misconceptionSignals, ["unit-fraction-size-confusion"]);
  assert.equal(evidenceFor(first.graph, "unit-and-denominator").rung, "explained", "the probe chose the entry atom and explain completed it");
  assert.notEqual(sessionHash(first), sessionHash(run("arjun")));
  assert.deepEqual(Object.keys(STATIONS).sort(), ["puddle-sun", "roti-seesaw"]);
});
