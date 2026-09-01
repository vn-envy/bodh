import { exportBodhiSeed, nextFrontier, nodeRung, rungCounts } from "./growth-graph.ts";
import { GROWTH_NODES } from "./growth-graph-catalog.ts";
import { validateLite, type LiteObjectSchema } from "./json-schema-lite.ts";
import { localized } from "./narration-language.ts";
import { PLACES } from "./world/places.ts";
import {
  dispatchWorld,
  observeWorld,
  type ActionOutcome,
  type WorldAction,
  type WorldSession,
} from "./world/session.ts";

/**
 * The only way anything in Bodh Van moves (D-016). Each tool follows the
 * WebMCP `ModelContextTool` dictionary so the same object can be handed to
 * `document.modelContext.registerTool` unchanged; `execute` here is pure and
 * returns the next session so React, agents and tests share one code path.
 */
export type ToolContent = Readonly<{ type: "text"; text: string }>;

export type ToolResult = Readonly<{
  ok: boolean;
  content: readonly ToolContent[];
  structuredContent: Record<string, unknown>;
}>;

export type WorldTool = Readonly<{
  name: string;
  description: string;
  inputSchema: LiteObjectSchema;
  annotations: Readonly<{ readOnlyHint: boolean }>;
  execute(input: Record<string, string | number | boolean>, session: WorldSession): Readonly<{ session: WorldSession; result: ToolResult }>;
}>;

export const TOOL_NAME_PREFIX = "bodh_" as const;

function text(value: string): ToolContent {
  return { type: "text", text: value };
}

function fromOutcome(session: WorldSession, outcome: ActionOutcome) {
  const structured: Record<string, unknown> = { ok: outcome.ok, code: outcome.code };
  if (outcome.beats) {
    structured.beats = outcome.beats.map((beat) => ({
      id: beat.id,
      atomId: beat.atomId,
      text: localized(beat.text, session.world.language),
      key: localized(beat.key, session.world.language),
      target: beat.target,
    }));
  }
  if (outcome.probe) {
    structured.probe = {
      id: outcome.probe.id,
      question: localized(outcome.probe.question, session.world.language),
      options: outcome.probe.options.map((option) => ({ id: option.id, label: localized(option.label, session.world.language) })),
    };
  }
  const beatText = outcome.beats?.map((beat) => localized(beat.text, session.world.language)).join(" ") ?? "";
  return {
    session,
    result: {
      ok: outcome.ok,
      content: [text(beatText ? `${outcome.message} ${beatText}` : outcome.message)],
      structuredContent: structured,
    },
  };
}

function act(session: WorldSession, action: WorldAction) {
  const { session: next, outcome } = dispatchWorld(session, action);
  return fromOutcome(next, outcome);
}

function readOnly(session: WorldSession, structured: Record<string, unknown>, summary: string) {
  return { session, result: { ok: true, content: [text(summary)], structuredContent: structured } };
}

const placeEnum = PLACES.map((place) => place.id);

export const WORLD_TOOLS: readonly WorldTool[] = [
  {
    name: "bodh_observe_world",
    description: "Look around Bodh Van: where the child is standing, which places are lit or in mist, and what the current station shows on screen. Read this before acting.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: (_input, session) => {
      const view = observeWorld(session);
      const here = view.places.find((place) => place.here);
      const summary = here
        ? `${view.language}: at ${here.label}${view.station ? `, inside ${view.station.title} (${view.station.phase})` : ""}.`
        : `${view.language}: standing at the edge of Bodh Van. Lit places: ${view.places.filter((place) => place.status !== "fog").map((place) => place.label).join(", ") || "none"}.`;
      return readOnly(session, { ...view }, summary);
    },
  },
  {
    name: "bodh_read_growth_graph",
    description: "Read the child's growth graph: the evidence rung for every concept, what is lit next, and why. Contains no learner text.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: (_input, session) => {
      const frontier = nextFrontier(session.graph, session.world.seed);
      const nodes = GROWTH_NODES.map((node) => ({
        id: node.id,
        kind: node.kind,
        label: localized(node.label, session.world.language),
        rung: nodeRung(session.graph, node.id),
        attempts: session.graph.nodes[node.id]?.attempts ?? 0,
        signals: session.graph.nodes[node.id]?.misconceptionSignals ?? [],
      }));
      const counts = rungCounts(session.graph);
      return readOnly(
        session,
        { tick: session.graph.tick, counts, frontier, nodes },
        `Tick ${session.graph.tick}. ${counts.explained + counts.transferred + counts["taught-back"]} concepts explained or better; ${frontier.length} lit next.`,
      );
    },
  },
  {
    name: "bodh_export_bodhi_seed",
    description: "Export the growth graph as a compact Bodhi seed string the family can copy and restore on another device. Contains rungs and ticks only.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: (_input, session) => {
      const seed = exportBodhiSeed(session.graph) ?? "";
      return readOnly(session, { seed }, seed ? `Bodhi seed ready (${seed.length} characters).` : "The graph could not be exported.");
    },
  },
  {
    name: "bodh_walk_to",
    description: "Walk to a lit place in Bodh Van. Places in the mist cannot be entered until their prerequisites are understood.",
    inputSchema: {
      type: "object",
      properties: { placeId: { type: "string", enum: placeEnum, description: "The place to walk to" } },
      required: ["placeId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
    execute: (input, session) => act(session, { type: "walk-to", placeId: String(input.placeId) }),
  },
  {
    name: "bodh_enter_station",
    description: "Enter the station at the place where the child is standing. Bodh asks one small question before anything else.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: false },
    execute: (_input, session) => act(session, { type: "enter-station" }),
  },
  {
    name: "bodh_leave_station",
    description: "Step out of the current station back to the place. Evidence already recorded stays recorded.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: false },
    execute: (_input, session) => act(session, { type: "leave-station" }),
  },
  {
    name: "bodh_answer_probe",
    description: "Answer the question currently on screen by choosing one of its option IDs. Only the probe shown right now can be answered.",
    inputSchema: {
      type: "object",
      properties: {
        probeId: { type: "string", minLength: 1, maxLength: 64, pattern: "^[a-z0-9-]+$", description: "The probe currently shown" },
        optionId: { type: "string", minLength: 1, maxLength: 64, pattern: "^[a-z0-9-]+$", description: "One of that probe's option IDs" },
      },
      required: ["probeId", "optionId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
    execute: (input, session) => act(session, { type: "answer-probe", probeId: String(input.probeId), optionId: String(input.optionId) }),
  },
  {
    name: "bodh_tinker",
    description: "Change one control inside the current station: puddle controls are sun (0-3), lid (true/false), wind (0-2), wait (1-20 moments); seesaw control is pieces (0-8). The world moves forward a few moments after each change.",
    inputSchema: {
      type: "object",
      properties: {
        control: { type: "string", enum: ["sun", "lid", "wind", "wait", "pieces"], description: "Which control to change" },
        value: { type: "number", minimum: 0, maximum: 20, description: "New value; for lid use 1 (on) or 0 (off)" },
      },
      required: ["control", "value"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
    execute: (input, session) => {
      const control = String(input.control);
      const raw = Number(input.value);
      const value = control === "lid" ? raw !== 0 : raw;
      return act(session, { type: "tinker", control, value });
    },
  },
  {
    name: "bodh_check",
    description: "Ask the station to check what the child has set up: whether the water count still adds up, or whether the seesaw is level. Records an attempt either way.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: false },
    execute: (_input, session) => act(session, { type: "check" }),
  },
  {
    name: "bodh_ask_bodh",
    description: "Ask Bodh for one of a fixed set of things: a hint for this moment, the next explanation (only after the child has tried), or where the child is. Free text is never accepted.",
    inputSchema: {
      type: "object",
      properties: { intent: { type: "string", enum: ["hint", "explain", "where-am-i"], description: "What to ask Bodh for" } },
      required: ["intent"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
    execute: (input, session) => {
      if (input.intent === "hint") return act(session, { type: "hint" });
      if (input.intent === "explain") return act(session, { type: "explain" });
      const view = observeWorld(session);
      const here = view.places.find((place) => place.here);
      return readOnly(session, { position: view.position, station: view.station?.id ?? null, phase: view.station?.phase ?? null }, here
        ? `${here.label}${view.station ? ` · ${view.station.title} · ${view.station.phase}` : ""}`
        : "At the edge of Bodh Van.");
    },
  },
  {
    name: "bodh_replay_narration",
    description: "Replay one narration beat Bodh has already spoken in this station, by beat ID.",
    inputSchema: {
      type: "object",
      properties: { beatId: { type: "string", minLength: 1, maxLength: 64, pattern: "^[a-z0-9-]+$", description: "A beat ID from a previous explanation" } },
      required: ["beatId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
    execute: (input, session) => act(session, { type: "replay-beat", beatId: String(input.beatId) }),
  },
];

const TOOLS_BY_NAME: ReadonlyMap<string, WorldTool> = new Map(WORLD_TOOLS.map((tool) => [tool.name, tool]));

export function worldToolByName(name: unknown): WorldTool | null {
  return typeof name === "string" ? TOOLS_BY_NAME.get(name) ?? null : null;
}

export type ToolInvocation = Readonly<{ session: WorldSession; result: ToolResult }>;

/** Validates input against the tool's schema before executing; unknown tools and bad input never touch state. */
export function invokeWorldTool(name: string, input: unknown, session: WorldSession): ToolInvocation {
  const tool = worldToolByName(name);
  if (!tool) {
    return { session, result: { ok: false, content: [text(`Unknown tool: ${name}`)], structuredContent: { ok: false, code: "unknown-tool" } } };
  }
  const validation = validateLite(tool.inputSchema, input);
  if (!validation.ok) {
    return { session, result: { ok: false, content: [text(validation.reason)], structuredContent: { ok: false, code: "invalid-input", reason: validation.reason } } };
  }
  return tool.execute(validation.value, session);
}

/** Serialisable description of every tool, identical for the browser, `GET /api/tools`, and the docs. */
export function worldToolManifest() {
  return {
    version: "bodh-van-tools-v1",
    tools: WORLD_TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations,
    })),
  };
}
