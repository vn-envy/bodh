import {
  createGrowthGraph,
  nextFrontier,
  reduceGrowthEvents,
  stateHashForGraph,
  type GrowthEvent,
  type GrowthGraph,
} from "../growth-graph.ts";
import { growthNodeById } from "../growth-graph-catalog.ts";
import { localized, type LocalizedText, type NarrationLanguage } from "../narration-language.ts";
import { canWalkTo, placeById, placeStatus, PLACES, type PlaceId, type StationId } from "./places.ts";
import { STATIONS, stationById, type StationBeat, type StationDefinition, type StationProbe } from "./stations.ts";
import {
  createPuddle,
  puddleCounts,
  puddleHash,
  setPuddleControl,
  stepPuddleTimes,
  type PuddleState,
} from "./stations/puddle-sun.ts";
import {
  balancingCount,
  createSeesaw,
  recordSeesawCheck,
  seesawBalanced,
  seesawHash,
  seesawSignals,
  seesawTask,
  seesawTiltDegrees,
  setSeesawPieces,
  type SeesawState,
} from "./stations/roti-seesaw.ts";

export const WORLD_SESSION_VERSION = "bodh-van-session-v1" as const;

export type StationPhase = "probe" | "tinker" | "explain" | "transfer-predict" | "transfer-do" | "done";

export type StationSim =
  | Readonly<{ kind: "puddle"; state: PuddleState }>
  | Readonly<{ kind: "seesaw"; state: SeesawState }>;

export type StationRun = Readonly<{
  id: StationId;
  phase: StationPhase;
  probeOptionId: string | null;
  attempts: number;
  /** Attempts whose check succeeded; the station's own success predicate decides. */
  successes: number;
  atomIds: readonly string[];
  explainedCount: number;
  heardBeatIds: readonly string[];
  transferPredictionId: string | null;
  transferAttempts: number;
  sim: StationSim;
}>;

export type WorldState = Readonly<{
  version: typeof WORLD_SESSION_VERSION;
  seed: string;
  language: NarrationLanguage;
  position: PlaceId | null;
  station: StationRun | null;
  /** Bounded, ID-only trail for the god's-eye map and the receipt. */
  trail: readonly string[];
}>;

export type WorldSession = Readonly<{ world: WorldState; graph: GrowthGraph }>;

export type WorldAction =
  | Readonly<{ type: "walk-to"; placeId: string }>
  | Readonly<{ type: "enter-station" }>
  | Readonly<{ type: "leave-station" }>
  | Readonly<{ type: "answer-probe"; probeId: string; optionId: string }>
  | Readonly<{ type: "tinker"; control: string; value: number | boolean }>
  | Readonly<{ type: "check" }>
  | Readonly<{ type: "explain" }>
  | Readonly<{ type: "replay-beat"; beatId: string }>
  | Readonly<{ type: "hint" }>
  | Readonly<{ type: "set-language"; language: NarrationLanguage }>;

export type ActionOutcome = Readonly<{
  ok: boolean;
  /** Stable machine reason; UI copy is derived from it. */
  code: string;
  message: string;
  beats?: readonly StationBeat[];
  probe?: StationProbe;
}>;

export type DispatchResult = Readonly<{ session: WorldSession; outcome: ActionOutcome }>;

const MAX_TRAIL = 200;

export function createWorldSession(seed: string, language: NarrationLanguage = "hi", graph: GrowthGraph = createGrowthGraph()): WorldSession {
  return {
    world: { version: WORLD_SESSION_VERSION, seed, language, position: null, station: null, trail: [] },
    graph,
  };
}

function say(world: WorldState, text: LocalizedText) {
  return localized(text, world.language);
}

function refuse(session: WorldSession, code: string, text: LocalizedText): DispatchResult {
  return { session, outcome: { ok: false, code, message: say(session.world, text) } };
}

function trail(world: WorldState, entry: string): WorldState {
  const next = [...world.trail, entry];
  return { ...world, trail: next.length > MAX_TRAIL ? next.slice(next.length - MAX_TRAIL) : next };
}

function commit(
  session: WorldSession,
  world: WorldState,
  events: readonly GrowthEvent[],
  outcome: Omit<ActionOutcome, "message"> & { text: LocalizedText },
): DispatchResult {
  const graph = reduceGrowthEvents(session.graph, [...events, { type: "tick" }]);
  const { text, ...rest } = outcome;
  return { session: { world, graph }, outcome: { ...rest, message: localized(text, world.language) } };
}

function createSim(station: StationDefinition, seed: string): StationSim {
  return station.id === "puddle-sun"
    ? { kind: "puddle", state: createPuddle(seed) }
    : { kind: "seesaw", state: createSeesaw(seed) };
}

const COPY = {
  fogged: { hi: "वह जगह अभी धुंध में है। पहले पास की रोशनी वाली जगह देखो।", en: "That place is still in the mist. Try a lit place nearby first." },
  unknownPlace: { hi: "ऐसी कोई जगह नहीं है।", en: "There is no such place." },
  arrived: { hi: "तुम पहुँच गए।", en: "You have arrived." },
  notAtPlace: { hi: "पहले किसी जगह चलो।", en: "Walk to a place first." },
  alreadyInside: { hi: "तुम पहले से अंदर हो।", en: "You are already inside." },
  notInside: { hi: "तुम किसी station के अंदर नहीं हो।", en: "You are not inside a station." },
  left: { hi: "तुम बाहर आ गए। जो सीखा वह Bodh को याद रहेगा।", en: "You stepped out. Bodh remembers what you did." },
  probeFirst: { hi: "पहले Bodh का छोटा सवाल है।", en: "Bodh has one small question first." },
  probeDone: { hi: "यह सवाल पहले ही पूछा जा चुका है।", en: "That question has already been answered." },
  wrongProbe: { hi: "यह सवाल अभी सामने नहीं है।", en: "That question is not the one on screen." },
  wrongOption: { hi: "यह विकल्प इस सवाल का नहीं है।", en: "That option does not belong to this question." },
  probeAnswered: { hi: "धन्यवाद। अब चीज़ों को छूकर देखो।", en: "Thank you. Now go ahead and tinker." },
  transferPredicted: { hi: "ठीक—अब इसे सच में करके देखो।", en: "Good—now make it happen for real." },
  notTinkerPhase: { hi: "अभी हाथ लगाने का समय नहीं है।", en: "This is not the moment for tinkering." },
  badControl: { hi: "यह control यहाँ नहीं है।", en: "That control is not here." },
  badValue: { hi: "यह मान काम नहीं करेगा।", en: "That value will not work here." },
  tinkered: { hi: "बदलाव हो गया। देखो क्या हुआ।", en: "Changed. Look at what happened." },
  checkNothingYet: { hi: "अभी कुछ बदला ही नहीं। पहले कुछ करके देखो।", en: "Nothing has changed yet. Try something first." },
  checkPuddleSuccess: { hi: "गिनती अब भी 12 है—पानी ने बस रूप बदला। अब Bodh समझा सकता है।", en: "The count is still 12—the water only changed form. Bodh can explain now." },
  checkPuddleAgain: { hi: "पानी अभी सब तरल ही है। सूरज या हवा बदलो और फिर देखो।", en: "The water is all still liquid. Change the sun or wind and look again." },
  checkBalanced: { hi: "बराबर! अब Bodh समझा सकता है कि ऐसा क्यों हुआ।", en: "Balanced! Bodh can explain why now." },
  checkTiltLeft: { hi: "बायाँ पैन अभी भारी है। और टुकड़े चाहिए।", en: "The left pan is still heavier. It needs more pieces." },
  checkTiltRight: { hi: "दायाँ पैन भारी हो गया। कुछ टुकड़े हटाओ।", en: "The right pan is heavier now. Take some pieces off." },
  explainNeedsAttempt: { hi: "पहले खुद एक बार करके देखो, फिर Bodh बताएगा।", en: "Try it yourself once first; then Bodh will explain." },
  explained: { hi: "Bodh ने एक बात समझाई।", en: "Bodh explained one idea." },
  explainDone: { hi: "सब बातें हो गईं। अब एक नई स्थिति।", en: "All the ideas are done. Now a new situation." },
  notExplainPhase: { hi: "अभी समझाने का समय नहीं है।", en: "This is not the moment for an explanation." },
  transferSuccess: { hi: "वही idea नई जगह भी चली। यह जगह अब तुम्हारी है।", en: "The same idea worked somewhere new. This place is yours now." },
  transferPuddleAgain: { hi: "बूँदें अभी नहीं बनीं। ढक्कन रखकर कुछ पल इंतज़ार करो।", en: "No droplets yet. Keep the lid on and wait a few moments." },
  beatUnknown: { hi: "यह बात अभी सुनी नहीं गई।", en: "That idea has not been heard yet." },
  replay: { hi: "फिर से सुनो।", en: "Listen again." },
  languageSet: { hi: "भाषा बदल गई।", en: "Language changed." },
  done: { hi: "यह station पूरा हो चुका है।", en: "This station is complete." },
} as const;

export function dispatchWorld(session: WorldSession, action: WorldAction): DispatchResult {
  const { world } = session;
  const frontier = nextFrontier(session.graph, world.seed);

  switch (action.type) {
    case "set-language": {
      const next = { ...world, language: action.language };
      return { session: { ...session, world: next }, outcome: { ok: true, code: "language-set", message: localized(COPY.languageSet, action.language) } };
    }

    case "walk-to": {
      const place = placeById(action.placeId);
      if (!place) return refuse(session, "unknown-place", COPY.unknownPlace);
      if (!canWalkTo(session.graph, place.id, frontier)) return refuse(session, "fogged", COPY.fogged);
      const next = trail({ ...world, position: place.id, station: null }, `walk:${place.id}`);
      return commit(session, next, [{ type: "place-visited", nodeIds: [place.anchorNodeId] }], { ok: true, code: "arrived", text: COPY.arrived });
    }

    case "enter-station": {
      if (!world.position) return refuse(session, "not-at-place", COPY.notAtPlace);
      if (world.station) return refuse(session, "already-inside", COPY.alreadyInside);
      const place = placeById(world.position)!;
      const station = STATIONS[place.stationId];
      const run: StationRun = {
        id: station.id,
        phase: "probe",
        probeOptionId: null,
        attempts: 0,
        successes: 0,
        atomIds: [],
        explainedCount: 0,
        heardBeatIds: [],
        transferPredictionId: null,
        transferAttempts: 0,
        sim: createSim(station, `${world.seed}:${station.id}`),
      };
      const next = trail({ ...world, station: run }, `enter:${station.id}`);
      return commit(session, next, [{ type: "place-visited", nodeIds: [station.probeNodeId] }], {
        ok: true,
        code: "probe-shown",
        text: COPY.probeFirst,
        probe: station.probe,
      });
    }

    case "leave-station": {
      if (!world.station) return refuse(session, "not-inside", COPY.notInside);
      const next = trail({ ...world, station: null }, `leave:${world.station.id}`);
      return commit(session, next, [], { ok: true, code: "left", text: COPY.left });
    }

    case "answer-probe": {
      const run = world.station;
      if (!run) return refuse(session, "not-inside", COPY.notInside);
      const station = STATIONS[run.id];
      if (run.phase === "probe") {
        if (action.probeId !== station.probe.id) return refuse(session, "wrong-probe", COPY.wrongProbe);
        const option = station.probe.options.find((candidate) => candidate.id === action.optionId);
        if (!option) return refuse(session, "wrong-option", COPY.wrongOption);
        const nextRun: StationRun = { ...run, phase: "tinker", probeOptionId: option.id, atomIds: station.atomsFor(option.id) };
        const next = trail({ ...world, station: nextRun }, `probe:${option.id}`);
        return commit(session, next, [{ type: "probe-answered", nodeId: station.probeNodeId, misconceptionSignals: option.signals }], {
          ok: true,
          code: "probe-answered",
          text: COPY.probeAnswered,
        });
      }
      if (run.phase === "transfer-predict") {
        if (action.probeId !== station.transfer.predictionProbe.id) return refuse(session, "wrong-probe", COPY.wrongProbe);
        const option = station.transfer.predictionProbe.options.find((candidate) => candidate.id === action.optionId);
        if (!option) return refuse(session, "wrong-option", COPY.wrongOption);
        const sim: StationSim = run.sim.kind === "seesaw"
          ? { kind: "seesaw", state: createSeesaw(run.sim.state.seed, "two-thirds-by-sixths") }
          : run.sim;
        const nextRun: StationRun = { ...run, phase: "transfer-do", transferPredictionId: option.id, sim };
        const next = trail({ ...world, station: nextRun }, `predict:${option.id}`);
        return commit(session, next, [{ type: "probe-answered", nodeId: station.transfer.nodeIds[0], misconceptionSignals: option.signals }], {
          ok: true,
          code: "transfer-predicted",
          text: option.correct ? COPY.transferPredicted : station.transfer.instruction,
        });
      }
      return refuse(session, "probe-done", COPY.probeDone);
    }

    case "tinker": {
      const run = world.station;
      if (!run) return refuse(session, "not-inside", COPY.notInside);
      if (run.phase === "probe") return refuse(session, "probe-first", COPY.probeFirst);
      if (run.phase !== "tinker" && run.phase !== "transfer-do") return refuse(session, "not-tinker-phase", COPY.notTinkerPhase);
      const station = STATIONS[run.id];
      if (!(action.control in station.controls)) return refuse(session, "bad-control", COPY.badControl);
      let sim: StationSim;
      if (run.sim.kind === "puddle") {
        if (action.control === "wait") {
          if (typeof action.value !== "number" || !Number.isInteger(action.value) || action.value < 1 || action.value > 20) return refuse(session, "bad-value", COPY.badValue);
          sim = { kind: "puddle", state: stepPuddleTimes(run.sim.state, action.value) };
        } else {
          const updated = setPuddleControl(run.sim.state, action.control as "sun" | "lid" | "wind", action.value);
          if (updated === run.sim.state) return refuse(session, "bad-value", COPY.badValue);
          sim = { kind: "puddle", state: stepPuddleTimes(updated, 4) };
        }
      } else {
        if (typeof action.value !== "number") return refuse(session, "bad-value", COPY.badValue);
        const updated = setSeesawPieces(run.sim.state, action.value);
        if (updated === run.sim.state && action.value !== run.sim.state.pieces) return refuse(session, "bad-value", COPY.badValue);
        sim = { kind: "seesaw", state: updated };
      }
      const next = trail({ ...world, station: { ...run, sim } }, `tinker:${action.control}`);
      return commit(session, next, [], { ok: true, code: "tinkered", text: COPY.tinkered });
    }

    case "check": {
      const run = world.station;
      if (!run) return refuse(session, "not-inside", COPY.notInside);
      if (run.phase === "probe") return refuse(session, "probe-first", COPY.probeFirst);
      if (run.phase !== "tinker" && run.phase !== "transfer-do") return refuse(session, "not-tinker-phase", COPY.notTinkerPhase);
      const station = STATIONS[run.id];
      let success: boolean;
      let signals: readonly string[] = [];
      let text: LocalizedText;
      let sim = run.sim;
      if (run.sim.kind === "puddle") {
        // A check reads the scene as it is; only tinkering moves time forward.
        const current = run.sim.state;
        const counts = puddleCounts(current);
        if (run.phase === "transfer-do") {
          success = current.controls.lid && counts.droplet >= 1 && counts.total === 12;
          text = success ? COPY.transferSuccess : COPY.transferPuddleAgain;
        } else {
          if (current.transitions === 0) return refuse(session, "nothing-yet", COPY.checkNothingYet);
          success = counts.total === 12 && counts.liquid < 12;
          text = success ? COPY.checkPuddleSuccess : COPY.checkPuddleAgain;
        }
      } else {
        const checked = recordSeesawCheck(run.sim.state);
        sim = { kind: "seesaw", state: checked };
        success = seesawBalanced(checked);
        signals = seesawSignals(checked);
        const tilt = seesawTiltDegrees(checked);
        text = success
          ? (run.phase === "transfer-do" ? COPY.transferSuccess : COPY.checkBalanced)
          : tilt < 0 ? COPY.checkTiltLeft : COPY.checkTiltRight;
      }

      if (run.phase === "transfer-do") {
        const nextRun: StationRun = { ...run, sim, transferAttempts: run.transferAttempts + 1, phase: success ? "done" : "transfer-do" };
        const next = trail({ ...world, station: nextRun }, `transfer:${success ? "ok" : "retry"}`);
        return commit(session, next, [{ type: "transfer-attempted", nodeIds: station.transfer.nodeIds, correct: success }], {
          ok: true,
          code: success ? "transfer-success" : "transfer-retry",
          text,
        });
      }

      const nextRun: StationRun = {
        ...run,
        sim,
        attempts: run.attempts + 1,
        successes: run.successes + (success ? 1 : 0),
        phase: success ? "explain" : "tinker",
      };
      const next = trail({ ...world, station: nextRun }, `check:${success ? "ok" : "retry"}`);
      const events: GrowthEvent[] = station.tinkerNodeIds.map((nodeId) => ({
        type: "station-attempt" as const,
        nodeId,
        success,
        misconceptionSignals: signals,
      }));
      return commit(session, next, events, { ok: true, code: success ? "check-success" : "check-retry", text });
    }

    case "explain": {
      const run = world.station;
      if (!run) return refuse(session, "not-inside", COPY.notInside);
      if (run.phase === "probe") return refuse(session, "probe-first", COPY.probeFirst);
      if (run.phase === "tinker") return refuse(session, "attempt-first", COPY.explainNeedsAttempt);
      if (run.phase !== "explain") return refuse(session, "not-explain-phase", COPY.notExplainPhase);
      const station = STATIONS[run.id];
      const atomId = run.atomIds[run.explainedCount];
      if (!atomId) return refuse(session, "not-explain-phase", COPY.notExplainPhase);
      const beats = station.beatsFor(atomId);
      const explainedCount = run.explainedCount + 1;
      const finished = explainedCount >= run.atomIds.length;
      const nextRun: StationRun = {
        ...run,
        explainedCount,
        heardBeatIds: [...run.heardBeatIds, ...beats.map((beat) => beat.id)],
        phase: finished ? "transfer-predict" : "explain",
      };
      const next = trail({ ...world, station: nextRun }, `explain:${atomId}`);
      return commit(session, next, [{ type: "atom-completed", nodeId: atomId }], {
        ok: true,
        code: finished ? "explain-complete" : "explained",
        text: finished ? COPY.explainDone : COPY.explained,
        beats,
        probe: finished ? station.transfer.predictionProbe : undefined,
      });
    }

    case "replay-beat": {
      const run = world.station;
      if (!run) return refuse(session, "not-inside", COPY.notInside);
      if (!run.heardBeatIds.includes(action.beatId)) return refuse(session, "beat-unknown", COPY.beatUnknown);
      const station = STATIONS[run.id];
      const beat = run.atomIds.flatMap((atomId) => station.beatsFor(atomId)).find((candidate) => candidate.id === action.beatId);
      if (!beat) return refuse(session, "beat-unknown", COPY.beatUnknown);
      return { session, outcome: { ok: true, code: "replay", message: say(world, COPY.replay), beats: [beat] } };
    }

    case "hint": {
      const run = world.station;
      if (!run) return refuse(session, "not-inside", COPY.notInside);
      const station = STATIONS[run.id];
      return { session, outcome: { ok: true, code: `hint:${run.phase}`, message: say(world, station.hints[run.phase]) } };
    }

    default:
      return refuse(session, "unknown-action", COPY.badControl);
  }
}

// ---------------------------------------------------------------------------
// Observation (what an agent or the screen can see; never the answer)
// ---------------------------------------------------------------------------

export type PlaceObservation = Readonly<{ id: PlaceId; label: string; blurb: string; status: string; here: boolean }>;

export type StationObservation = Readonly<{
  id: StationId;
  title: string;
  phase: StationPhase;
  attempts: number;
  probe: Readonly<{ id: string; question: string; options: readonly Readonly<{ id: string; label: string }>[] }> | null;
  controls: readonly string[];
  view: Readonly<Record<string, string | number | boolean>>;
  explained: number;
  toExplain: number;
  heardBeatIds: readonly string[];
}>;

export type WorldObservation = Readonly<{
  seed: string;
  language: NarrationLanguage;
  position: PlaceId | null;
  places: readonly PlaceObservation[];
  station: StationObservation | null;
  tick: number;
  stateHash: string;
}>;

function simView(sim: StationSim): Record<string, string | number | boolean> {
  if (sim.kind === "puddle") {
    const counts = puddleCounts(sim.state);
    return {
      sun: sim.state.controls.sun,
      lid: sim.state.controls.lid,
      wind: sim.state.controls.wind,
      liquid: counts.liquid,
      vapour: counts.vapour,
      droplet: counts.droplet,
      total: counts.total,
      moment: sim.state.step,
    };
  }
  const task = seesawTask(sim.state);
  return {
    leftPan: `${task.target.numerator}/${task.target.denominator}`,
    pieceSize: `${task.unit.numerator}/${task.unit.denominator}`,
    pieces: sim.state.pieces,
    capacity: task.capacity,
    tiltDegrees: seesawTiltDegrees(sim.state),
    level: seesawBalanced(sim.state),
  };
}

export function observeWorld(session: WorldSession): WorldObservation {
  const { world, graph } = session;
  const frontier = nextFrontier(graph, world.seed);
  const run = world.station;
  const station = run ? STATIONS[run.id] : null;
  const activeProbe = run && station
    ? run.phase === "probe" ? station.probe : run.phase === "transfer-predict" ? station.transfer.predictionProbe : null
    : null;
  return {
    seed: world.seed,
    language: world.language,
    position: world.position,
    places: PLACES.map((place) => ({
      id: place.id,
      label: localized(place.label, world.language),
      blurb: localized(place.blurb, world.language),
      status: placeStatus(graph, place.id, frontier),
      here: world.position === place.id,
    })),
    station: run && station
      ? {
        id: run.id,
        title: localized(station.title, world.language),
        phase: run.phase,
        attempts: run.attempts,
        probe: activeProbe
          ? {
            id: activeProbe.id,
            question: localized(activeProbe.question, world.language),
            options: activeProbe.options.map((option) => ({ id: option.id, label: localized(option.label, world.language) })),
          }
          : null,
        controls: Object.keys(station.controls),
        view: simView(run.sim),
        explained: run.explainedCount,
        toExplain: run.atomIds.length,
        heardBeatIds: run.heardBeatIds,
      }
      : null,
    tick: graph.tick,
    stateHash: sessionHash(session),
  };
}

export function sessionHash(session: WorldSession) {
  const run = session.world.station;
  const simHash = run ? (run.sim.kind === "puddle" ? puddleHash(run.sim.state) : seesawHash(run.sim.state)) : "none";
  const text = `${session.world.seed}|${stateHashForGraph(session.graph)}|${session.world.position ?? "-"}|${run ? `${run.id}:${run.phase}:${run.attempts}:${run.explainedCount}:${run.transferAttempts}` : "-"}|${simHash}|${session.world.trail.length}`;
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function nodeLabel(nodeId: string, language: NarrationLanguage) {
  const node = growthNodeById(nodeId);
  return node ? localized(node.label, language) : nodeId;
}

export { balancingCount, stationById };
