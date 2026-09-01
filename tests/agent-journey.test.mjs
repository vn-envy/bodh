import assert from "node:assert/strict";
import test from "node:test";
import { evidenceFor, nodeRung } from "../lib/growth-graph.ts";
import { TUTOR_TOOL_ALLOWLIST, nextTutorStep } from "../lib/tutor-policy.ts";
import { createWorldSession, observeWorld, sessionHash } from "../lib/world/session.ts";
import { STATIONS } from "../lib/world/stations.ts";
import { invokeWorldTool } from "../lib/world-tools.ts";

/**
 * Drives a complete Puddle Ghat journey through tools alone. Bodh's tutor
 * policy leads navigation and explanation; a stand-in child answers probes and
 * does the tinkering. Nothing touches the reducers except invokeWorldTool.
 */
function childTurn(session) {
  const view = observeWorld(session);
  const run = session.world.station;
  if (!run || !view.station) return null;
  const station = STATIONS[run.id];
  if (view.station.probe) {
    const probe = run.phase === "probe" ? station.probe : station.transfer.predictionProbe;
    const correct = probe.options.find((option) => option.correct);
    return ["bodh_answer_probe", { probeId: probe.id, optionId: correct.id }];
  }
  if (run.phase === "tinker") {
    if (run.sim.kind === "puddle") {
      if (run.sim.state.controls.sun < 3) return ["bodh_tinker", { control: "sun", value: 3 }];
      if (run.sim.state.transitions === 0) return ["bodh_tinker", { control: "wait", value: 5 }];
      return ["bodh_check", {}];
    }
    if (run.sim.state.pieces !== 6) return ["bodh_tinker", { control: "pieces", value: 6 }];
    return ["bodh_check", {}];
  }
  if (run.phase === "transfer-do") {
    if (run.sim.kind === "puddle") {
      const { droplet } = view.station.view;
      if (!run.sim.state.controls.lid) return ["bodh_tinker", { control: "lid", value: 1 }];
      if (Number(droplet) < 1) return ["bodh_tinker", { control: "wait", value: 5 }];
      return ["bodh_check", {}];
    }
    if (run.sim.state.pieces !== 4) return ["bodh_tinker", { control: "pieces", value: 4 }];
    return ["bodh_check", {}];
  }
  return null;
}

function runJourney(seed, placeId, maxSteps = 120) {
  let session = createWorldSession(seed, "hi");
  const log = [];
  for (let step = 0; step < maxSteps; step += 1) {
    const run = session.world.station;
    if (run?.phase === "done") return { session, log };
    let call = childTurn(session);
    let actor = "child";
    if (!call) {
      const tutor = nextTutorStep(session);
      if (tutor.kind === "wait") throw new Error(`stalled: ${JSON.stringify(observeWorld(session).station?.phase)}`);
      call = [tutor.tool, tutor.input];
      actor = "tutor";
      if (tutor.tool === "bodh_walk_to" && tutor.input.placeId !== placeId) call = ["bodh_walk_to", { placeId }];
    }
    const { session: next, result } = invokeWorldTool(call[0], call[1], session);
    assert.equal(result.ok, true, `${actor} ${call[0]} ${JSON.stringify(call[1])} -> ${result.content[0].text}`);
    log.push(`${actor}:${call[0]}`);
    session = next;
  }
  throw new Error("journey did not finish");
}

test("the tutor allowlist excludes every tool that would do the child's doing", () => {
  assert.ok(!TUTOR_TOOL_ALLOWLIST.includes("bodh_answer_probe"));
  assert.ok(!TUTOR_TOOL_ALLOWLIST.includes("bodh_tinker"));
  assert.ok(!TUTOR_TOOL_ALLOWLIST.includes("bodh_check"));
  assert.ok(TUTOR_TOOL_ALLOWLIST.includes("bodh_ask_bodh"));
});

test("the tutor waits at questions and only ever suggests allowlisted tools", () => {
  let session = createWorldSession("policy", "en");
  const first = nextTutorStep(session);
  assert.equal(first.kind, "call");
  assert.equal(first.tool, "bodh_walk_to");
  session = invokeWorldTool(first.tool, first.input, session).session;
  const second = nextTutorStep(session);
  assert.equal(second.tool, "bodh_enter_station");
  session = invokeWorldTool(second.tool, second.input, session).session;
  const atProbe = nextTutorStep(session);
  assert.equal(atProbe.kind, "wait", "the probe belongs to the child");
});

test("a complete Puddle Ghat journey runs through tools alone and lights the water concept", () => {
  const { session, log } = runJourney("riya", "puddle-ghat");
  assert.equal(session.world.station.phase, "done");
  assert.equal(evidenceFor(session.graph, "cooling-cloud").rung, "transferred");
  assert.equal(evidenceFor(session.graph, "mt_Qkewo5M3_c").rung, "transferred");
  assert.equal(nodeRung(session.graph, "mt_TlLE4cZgOr"), "explained");
  for (const stageId of ["notice-puddle", "sun-heat", "invisible-vapour", "returning-rain"]) {
    assert.equal(evidenceFor(session.graph, stageId).rung, "explained", stageId);
  }
  assert.ok(log.filter((entry) => entry === "tutor:bodh_ask_bodh").length >= 5, "Bodh explained all five ideas");
  assert.ok(log.indexOf("child:bodh_answer_probe") < log.indexOf("child:bodh_tinker"), "probe before tinkering");
  assert.ok(log.indexOf("child:bodh_check") < log.indexOf("tutor:bodh_ask_bodh"), "an attempt before any explanation");
  assert.equal(evidenceFor(session.graph, "sun-heat").attempts >= 1, true);
});

test("a complete Roti Chowk journey balances, explains from the probe's entry atom, and transfers to 2/3 ÷ 1/6", () => {
  const { session } = runJourney("arjun", "roti-chowk");
  assert.equal(session.world.station.phase, "done");
  assert.equal(evidenceFor(session.graph, "division-unknown-factor").rung, "transferred");
  assert.equal(evidenceFor(session.graph, "mt_9Y96vxG_LH").rung, "transferred");
  assert.equal(evidenceFor(session.graph, "numerator-count").rung, "explained", "entry atom from the correct probe answer");
  assert.equal(evidenceFor(session.graph, "chosen-whole").rung, "noticed", "the place anchor was noticed on arrival but never taught");
  assert.equal(evidenceFor(session.graph, "equal-parts").rung, "unseen", "atoms before the entry point were not taught");
  assert.equal(session.world.station.sim.state.taskId, "two-thirds-by-sixths");
});

test("the same agent journey replays to the same state hash", () => {
  const a = runJourney("same", "puddle-ghat");
  const b = runJourney("same", "puddle-ghat");
  assert.equal(sessionHash(a.session), sessionHash(b.session));
  assert.deepEqual(a.log, b.log);
  assert.notEqual(sessionHash(a.session), sessionHash(runJourney("other", "puddle-ghat").session));
});
