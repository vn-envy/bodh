import {
  GROWTH_NODE_IDS,
  childAtomIds,
  dependentEdgesFor,
  growthNodeById,
  isGrowthNodeId,
  isMisconceptionSignalId,
  prerequisiteEdgesFor,
  type MisconceptionSignalId,
} from "./growth-graph-catalog.ts";

export const GROWTH_GRAPH_VERSION = "growth-graph-v1" as const;

export const EVIDENCE_RUNGS = [
  "unseen",
  "noticed",
  "tinkered",
  "explained",
  "transferred",
  "taught-back",
] as const;

export type EvidenceRung = (typeof EVIDENCE_RUNGS)[number];

/** Logical ticks until a node lights again for spaced return. */
export const SPACED_RETURN_INTERVAL: Readonly<Record<EvidenceRung, number | null>> = {
  unseen: null,
  noticed: null,
  tinkered: null,
  explained: null,
  transferred: 30,
  "taught-back": 90,
};

export type NodeEvidence = Readonly<{
  rung: EvidenceRung;
  attempts: number;
  misconceptionSignals: readonly MisconceptionSignalId[];
  lastTick: number;
  dueTick: number | null;
}>;

export type GrowthGraph = Readonly<{
  version: typeof GROWTH_GRAPH_VERSION;
  tick: number;
  nodes: Readonly<Record<string, NodeEvidence>>;
}>;

export type GrowthEvent =
  | Readonly<{ type: "tick"; count?: number }>
  | Readonly<{ type: "place-visited"; nodeIds: readonly string[] }>
  | Readonly<{ type: "probe-answered"; nodeId: string; misconceptionSignals?: readonly string[] }>
  | Readonly<{ type: "station-attempt"; nodeId: string; success: boolean; misconceptionSignals?: readonly string[] }>
  | Readonly<{ type: "atom-completed"; nodeId: string }>
  | Readonly<{ type: "transfer-attempted"; nodeIds: readonly string[]; correct: boolean }>
  | Readonly<{ type: "taught-back"; nodeId: string }>;

export const EMPTY_EVIDENCE: NodeEvidence = {
  rung: "unseen",
  attempts: 0,
  misconceptionSignals: [],
  lastTick: 0,
  dueTick: null,
};

export function createGrowthGraph(): GrowthGraph {
  return { version: GROWTH_GRAPH_VERSION, tick: 0, nodes: {} };
}

export function rungIndex(rung: EvidenceRung) {
  return EVIDENCE_RUNGS.indexOf(rung);
}

export function rungAtLeast(rung: EvidenceRung, floor: EvidenceRung) {
  return rungIndex(rung) >= rungIndex(floor);
}

function maxRung(a: EvidenceRung, b: EvidenceRung): EvidenceRung {
  return rungIndex(a) >= rungIndex(b) ? a : b;
}

function minRung(a: EvidenceRung, b: EvidenceRung): EvidenceRung {
  return rungIndex(a) <= rungIndex(b) ? a : b;
}

export function evidenceFor(graph: GrowthGraph, nodeId: string): NodeEvidence {
  return graph.nodes[nodeId] ?? EMPTY_EVIDENCE;
}

/**
 * A Marble node's effective rung is at least the weakest rung among its Bodh
 * atoms, so completing every atom of a place lights the concept itself.
 */
export function nodeRung(graph: GrowthGraph, nodeId: string): EvidenceRung {
  const own = evidenceFor(graph, nodeId).rung;
  const atoms = childAtomIds(nodeId);
  if (atoms.length === 0) return own;
  const derived = atoms.reduce<EvidenceRung>(
    (floor, atomId) => minRung(floor, evidenceFor(graph, atomId).rung),
    "taught-back",
  );
  return maxRung(own, derived);
}

function withNode(graph: GrowthGraph, nodeId: string, update: (evidence: NodeEvidence) => NodeEvidence): GrowthGraph {
  const current = evidenceFor(graph, nodeId);
  const next = update(current);
  if (next === current) return graph;
  return { ...graph, nodes: { ...graph.nodes, [nodeId]: next } };
}

function mergeSignals(
  existing: readonly MisconceptionSignalId[],
  incoming: readonly string[] | undefined,
): readonly MisconceptionSignalId[] {
  if (!incoming) return existing;
  const merged = new Set(existing);
  for (const signal of incoming) if (isMisconceptionSignalId(signal)) merged.add(signal);
  return merged.size === existing.length ? existing : [...merged];
}

function raise(evidence: NodeEvidence, rung: EvidenceRung, tick: number): NodeEvidence {
  const nextRung = maxRung(evidence.rung, rung);
  const interval = SPACED_RETURN_INTERVAL[nextRung];
  return {
    ...evidence,
    rung: nextRung,
    lastTick: tick,
    dueTick: interval === null ? null : tick + interval,
  };
}

function validIds(ids: readonly unknown[] | undefined): string[] {
  return (ids ?? []).filter(isGrowthNodeId);
}

/** Pure, order-independent for unknown IDs: anything outside the catalogue leaves the graph unchanged. */
export function reduceGrowthGraph(graph: GrowthGraph, event: GrowthEvent): GrowthGraph {
  const tick = graph.tick;
  switch (event.type) {
    case "tick": {
      const count = Number.isInteger(event.count) && (event.count ?? 1) > 0 ? (event.count as number) : 1;
      return { ...graph, tick: tick + count };
    }
    case "place-visited":
      return validIds(event.nodeIds).reduce(
        (acc, nodeId) => withNode(acc, nodeId, (evidence) => raise(evidence, "noticed", tick)),
        graph,
      );
    case "probe-answered":
      if (!isGrowthNodeId(event.nodeId)) return graph;
      return withNode(graph, event.nodeId, (evidence) => ({
        ...raise(evidence, "noticed", tick),
        misconceptionSignals: mergeSignals(evidence.misconceptionSignals, event.misconceptionSignals),
      }));
    case "station-attempt":
      if (!isGrowthNodeId(event.nodeId) || typeof event.success !== "boolean") return graph;
      return withNode(graph, event.nodeId, (evidence) => ({
        ...raise(evidence, "tinkered", tick),
        attempts: evidence.attempts + 1,
        misconceptionSignals: mergeSignals(evidence.misconceptionSignals, event.misconceptionSignals),
      }));
    case "atom-completed":
      if (!isGrowthNodeId(event.nodeId)) return graph;
      return withNode(graph, event.nodeId, (evidence) => raise(evidence, "explained", tick));
    case "transfer-attempted": {
      if (typeof event.correct !== "boolean") return graph;
      return validIds(event.nodeIds).reduce(
        (acc, nodeId) => withNode(acc, nodeId, (evidence) => ({
          ...(event.correct ? raise(evidence, "transferred", tick) : { ...evidence, lastTick: tick }),
          attempts: evidence.attempts + 1,
        })),
        graph,
      );
    }
    case "taught-back":
      if (!isGrowthNodeId(event.nodeId)) return graph;
      return withNode(graph, event.nodeId, (evidence) => (
        rungAtLeast(evidence.rung, "transferred") ? raise(evidence, "taught-back", tick) : evidence
      ));
    default:
      return graph;
  }
}

export function reduceGrowthEvents(graph: GrowthGraph, events: readonly GrowthEvent[]) {
  return events.reduce(reduceGrowthGraph, graph);
}

// ---------------------------------------------------------------------------
// Frontier
// ---------------------------------------------------------------------------

export type FrontierReason = "due" | "curious" | "reachable";

export type FrontierEntry = Readonly<{ nodeId: string; reason: FrontierReason }>;

const RECENT_WINDOW = 10;

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** mulberry32: small, fast, and identical on every platform. */
export function seededRandom(seed: string) {
  let state = hashSeed(seed) || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededOrder<T>(items: readonly T[], seed: string, key: (item: T) => string) {
  const random = seededRandom(seed);
  return items
    .map((item) => ({ item, weight: random(), key: key(item) }))
    .sort((a, b) => a.weight - b.weight || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map((entry) => entry.item);
}

export function hardPrerequisitesMet(graph: GrowthGraph, nodeId: string) {
  return prerequisiteEdgesFor(nodeId)
    .filter((edge) => edge.strength === "hard")
    .every((edge) => rungAtLeast(nodeRung(graph, edge.prerequisiteId), "explained"));
}

export function isDue(graph: GrowthGraph, nodeId: string) {
  const evidence = evidenceFor(graph, nodeId);
  return evidence.dueTick !== null && evidence.dueTick <= graph.tick && rungAtLeast(evidence.rung, "transferred");
}

function recentlyTouched(graph: GrowthGraph) {
  return new Set(
    Object.entries(graph.nodes)
      .filter(([, evidence]) => evidence.rung !== "unseen" && graph.tick - evidence.lastTick <= RECENT_WINDOW)
      .map(([nodeId]) => nodeId),
  );
}

function adjacentToRecent(graph: GrowthGraph, nodeId: string, recent: ReadonlySet<string>) {
  const node = growthNodeById(nodeId);
  if (node?.parentId && recent.has(node.parentId)) return true;
  for (const edge of prerequisiteEdgesFor(nodeId)) if (recent.has(edge.prerequisiteId)) return true;
  for (const edge of dependentEdgesFor(nodeId)) if (recent.has(edge.topicId)) return true;
  for (const atomId of childAtomIds(nodeId)) if (recent.has(atomId)) return true;
  return false;
}

/**
 * Ordered list of nodes the world should light: spaced returns first, then
 * reachable nodes near recent activity, then the remaining reachable nodes in a
 * seeded order. Same graph and seed always give the same list.
 */
export function nextFrontier(graph: GrowthGraph, seed = "bodh"): readonly FrontierEntry[] {
  const due: FrontierEntry[] = [];
  const curious: string[] = [];
  const reachable: string[] = [];
  const recent = recentlyTouched(graph);

  for (const nodeId of GROWTH_NODE_IDS) {
    if (isDue(graph, nodeId)) {
      due.push({ nodeId, reason: "due" });
      continue;
    }
    if (rungAtLeast(nodeRung(graph, nodeId), "transferred")) continue;
    if (!hardPrerequisitesMet(graph, nodeId)) continue;
    if (adjacentToRecent(graph, nodeId, recent)) curious.push(nodeId);
    else reachable.push(nodeId);
  }

  return [
    ...due,
    ...seededOrder(curious, `${seed}:curious:${graph.tick}`, (id) => id).map((nodeId) => ({ nodeId, reason: "curious" as const })),
    ...seededOrder(reachable, `${seed}:reachable`, (id) => id).map((nodeId) => ({ nodeId, reason: "reachable" as const })),
  ];
}

export function isFogged(graph: GrowthGraph, nodeId: string, frontier = nextFrontier(graph)) {
  if (!isGrowthNodeId(nodeId)) return true;
  if (nodeRung(graph, nodeId) !== "unseen") return false;
  return !frontier.some((entry) => entry.nodeId === nodeId);
}

// ---------------------------------------------------------------------------
// Serialisation and Bodhi seed
// ---------------------------------------------------------------------------

const MAX_SERIALISED_LENGTH = 32_768;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normaliseEvidence(value: unknown): NodeEvidence | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).sort().join("|") !== "attempts|dueTick|lastTick|misconceptionSignals|rung") return null;
  const rung = value.rung;
  if (!(EVIDENCE_RUNGS as readonly unknown[]).includes(rung)) return null;
  if (!Number.isInteger(value.attempts) || (value.attempts as number) < 0) return null;
  if (!Number.isInteger(value.lastTick) || (value.lastTick as number) < 0) return null;
  if (value.dueTick !== null && (!Number.isInteger(value.dueTick) || (value.dueTick as number) < 0)) return null;
  if (!Array.isArray(value.misconceptionSignals) || !value.misconceptionSignals.every(isMisconceptionSignalId)) return null;
  return {
    rung: rung as EvidenceRung,
    attempts: value.attempts as number,
    misconceptionSignals: [...new Set(value.misconceptionSignals as MisconceptionSignalId[])],
    lastTick: value.lastTick as number,
    dueTick: value.dueTick as number | null,
  };
}

export function normaliseGrowthGraph(value: unknown): GrowthGraph | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).sort().join("|") !== "nodes|tick|version") return null;
  if (value.version !== GROWTH_GRAPH_VERSION) return null;
  if (!Number.isInteger(value.tick) || (value.tick as number) < 0) return null;
  if (!isRecord(value.nodes)) return null;
  const nodes: Record<string, NodeEvidence> = {};
  for (const [nodeId, evidence] of Object.entries(value.nodes)) {
    if (!isGrowthNodeId(nodeId)) return null;
    const normalised = normaliseEvidence(evidence);
    if (!normalised) return null;
    if (normalised.rung === "unseen" && normalised.attempts === 0 && normalised.misconceptionSignals.length === 0) continue;
    nodes[nodeId] = normalised;
  }
  return { version: GROWTH_GRAPH_VERSION, tick: value.tick as number, nodes };
}

export function serializeGrowthGraph(graph: unknown) {
  const normalised = normaliseGrowthGraph(graph);
  if (!normalised) return null;
  const ordered = {
    version: normalised.version,
    tick: normalised.tick,
    nodes: Object.fromEntries(Object.keys(normalised.nodes).sort().map((id) => [id, normalised.nodes[id]])),
  };
  return JSON.stringify(ordered);
}

export function parseGrowthGraph(raw: unknown): GrowthGraph | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_SERIALISED_LENGTH) return null;
  try {
    return normaliseGrowthGraph(JSON.parse(raw));
  } catch {
    return null;
  }
}

const BODHI_PREFIX = "bodhi1.";

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string) {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (text.length % 4)) % 4);
  const binary = typeof atob === "function" ? atob(base64) : Buffer.from(base64, "base64").toString("binary");
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function checksum(text: string) {
  return hashSeed(text).toString(16).padStart(8, "0");
}

/** Compact, copyable, and self-checking. Contains rungs, ticks and signal IDs only. */
export function exportBodhiSeed(graph: unknown) {
  const serialised = serializeGrowthGraph(graph);
  if (!serialised) return null;
  const payload = toBase64Url(new TextEncoder().encode(serialised));
  return `${BODHI_PREFIX}${checksum(serialised)}.${payload}`;
}

export function importBodhiSeed(text: unknown): GrowthGraph | null {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith(BODHI_PREFIX) || trimmed.length > MAX_SERIALISED_LENGTH * 2) return null;
  const [sum, payload, extra] = trimmed.slice(BODHI_PREFIX.length).split(".");
  if (!sum || !payload || extra !== undefined || !/^[A-Za-z0-9_-]+$/.test(payload)) return null;
  let serialised: string;
  try {
    serialised = new TextDecoder().decode(fromBase64Url(payload));
  } catch {
    return null;
  }
  if (checksum(serialised) !== sum) return null;
  return parseGrowthGraph(serialised);
}

// ---------------------------------------------------------------------------
// Summary helpers for receipts and the god's-eye map
// ---------------------------------------------------------------------------

export function rungCounts(graph: GrowthGraph): Readonly<Record<EvidenceRung, number>> {
  const counts: Record<EvidenceRung, number> = {
    unseen: 0, noticed: 0, tinkered: 0, explained: 0, transferred: 0, "taught-back": 0,
  };
  for (const nodeId of GROWTH_NODE_IDS) counts[nodeRung(graph, nodeId)] += 1;
  return counts;
}

export function stateHashForGraph(graph: GrowthGraph) {
  return checksum(serializeGrowthGraph(graph) ?? "");
}
