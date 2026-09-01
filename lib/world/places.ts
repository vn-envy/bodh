import {
  FRACTION_ATOM_NODES,
  MARBLE_FRACTION_NODES,
  MARBLE_WATER_NODES,
  WATER_ATOM_NODES,
} from "../growth-graph-catalog.ts";
import { isFogged, nextFrontier, nodeRung, type FrontierEntry, type GrowthGraph } from "../growth-graph.ts";
import type { LocalizedText } from "../narration-language.ts";

export type PlaceId = "puddle-ghat" | "roti-chowk";
export type StationId = "puddle-sun" | "roti-seesaw";

export type Place = Readonly<{
  id: PlaceId;
  label: LocalizedText;
  blurb: LocalizedText;
  stationId: StationId;
  /** Every growth node this place teaches or depends on. */
  nodeIds: readonly string[];
  /** The node whose fog state decides whether the child can walk here. */
  anchorNodeId: string;
  /** Layout in the god's-eye map, as a fraction of the map width and height. */
  x: number;
  y: number;
}>;

const hiEn = (hi: string, en: string): LocalizedText => ({ hi, en });

export const PLACES: readonly Place[] = [
  {
    id: "puddle-ghat",
    label: hiEn("पानी का घाट", "Puddle Ghat"),
    blurb: hiEn("जहाँ puddle गायब हो जाता है", "Where the puddle disappears"),
    stationId: "puddle-sun",
    nodeIds: [...WATER_ATOM_NODES.map((node) => node.id), ...MARBLE_WATER_NODES.map((node) => node.id)],
    anchorNodeId: "notice-puddle",
    x: 0.26,
    y: 0.62,
  },
  {
    id: "roti-chowk",
    label: hiEn("रोटी चौक", "Roti Chowk"),
    blurb: hiEn("जहाँ रोटियाँ बराबर टुकड़ों में टूटती हैं", "Where rotis are torn into equal pieces"),
    stationId: "roti-seesaw",
    nodeIds: [...FRACTION_ATOM_NODES.map((node) => node.id), ...MARBLE_FRACTION_NODES.map((node) => node.id)],
    anchorNodeId: "chosen-whole",
    x: 0.7,
    y: 0.38,
  },
];

export function placeById(id: unknown): Place | null {
  return PLACES.find((place) => place.id === id) ?? null;
}

export function isPlaceId(id: unknown): id is PlaceId {
  return PLACES.some((place) => place.id === id);
}

export function placeForStation(stationId: StationId) {
  return PLACES.find((place) => place.stationId === stationId)!;
}

export type PlaceStatus = "due" | "lit" | "known" | "fog";

/**
 * Fog is derived only from the growth graph frontier. A place is:
 * - `due`   when any of its nodes is lit for spaced return,
 * - `lit`   when any of its nodes is reachable and still unfinished,
 * - `known` when the child has been here but nothing is currently lit,
 * - `fog`   when its anchor node is still unreachable.
 */
export function placeStatus(graph: GrowthGraph, placeId: PlaceId, frontier: readonly FrontierEntry[] = nextFrontier(graph)): PlaceStatus {
  const place = placeById(placeId)!;
  const inPlace = new Set(place.nodeIds);
  const entries = frontier.filter((entry) => inPlace.has(entry.nodeId));
  if (entries.some((entry) => entry.reason === "due")) return "due";
  if (!isFogged(graph, place.anchorNodeId, frontier)) {
    if (entries.length > 0) return "lit";
    return "known";
  }
  return place.nodeIds.some((nodeId) => nodeRung(graph, nodeId) !== "unseen") ? "known" : "fog";
}

export function canWalkTo(graph: GrowthGraph, placeId: PlaceId, frontier?: readonly FrontierEntry[]) {
  return placeStatus(graph, placeId, frontier) !== "fog";
}
