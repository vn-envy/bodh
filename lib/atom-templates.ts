import { BRIDGE_TERM_IDS, type BridgeTermId } from "./concept-bridge.ts";
import type { LocalizedText } from "./narration-language.ts";
import type { StationId } from "./world/places.ts";

/**
 * Authored atom templates (D-018). A template owns the mechanics, the success
 * predicate, the cue targets and the growth nodes. A model may only fill the
 * listed slots — story wrapper, everyday object, probe distractors, narration
 * beats — and every fill is validated by `lib/atom-fill-guardrails.ts` before a
 * child sees it. Reviewed fills in `data/fixtures/atom-fills/` are the fallback.
 */
export const ATOM_TEMPLATE_IDS = ["fit-count", "balance-equivalence", "conserve-and-track"] as const;
export type AtomTemplateId = (typeof ATOM_TEMPLATE_IDS)[number];

export type EverydayObject = Readonly<{ id: string; label: LocalizedText }>;

export type AtomTemplate = Readonly<{
  id: AtomTemplateId;
  stationId: StationId;
  /** Growth nodes this atom is evidence about. */
  nodeIds: readonly string[];
  /** What the shipped code checks; never sent to a model, never shown before the probe. */
  predicate: string;
  /** Pointer targets the renderer understands for this template. */
  cueTargets: readonly string[];
  /** Bounded Indian-context objects the story may be wrapped around. */
  objects: readonly EverydayObject[];
  /** Glossary terms a fill may reference. */
  termIds: readonly BridgeTermId[];
  /** Words or numerals that would give the answer away; fills containing them are rejected. */
  forbiddenAnswerTokens: readonly string[];
  /** Beat count bounds. */
  beats: Readonly<{ min: number; max: number }>;
}>;

const hiEn = (hi: string, en: string): LocalizedText => ({ hi, en });

const FOOD_OBJECTS: readonly EverydayObject[] = [
  { id: "roti", label: hiEn("रोटी", "roti") },
  { id: "dosa", label: hiEn("डोसा", "dosa") },
  { id: "paratha", label: hiEn("पराठा", "paratha") },
  { id: "chikki", label: hiEn("चिक्की", "chikki bar") },
  { id: "chocolate", label: hiEn("चॉकलेट बार", "chocolate bar") },
  { id: "ribbon", label: hiEn("रिबन", "ribbon") },
];

const WATER_OBJECTS: readonly EverydayObject[] = [
  { id: "puddle", label: hiEn("बारिश का puddle", "rain puddle") },
  { id: "wet-clothes", label: hiEn("छत पर सूखते कपड़े", "clothes drying on the roof") },
  { id: "steel-glass", label: hiEn("ठंडे पानी का स्टील गिलास", "a steel glass of cold water") },
  { id: "matka", label: hiEn("मटका", "clay matka") },
  { id: "bathroom-mirror", label: hiEn("बाथरूम का शीशा", "bathroom mirror") },
  { id: "chai-cup", label: hiEn("गरम चाय का कप", "a cup of hot chai") },
];

export const ATOM_TEMPLATES: Readonly<Record<AtomTemplateId, AtomTemplate>> = {
  "fit-count": {
    id: "fit-count",
    stationId: "roti-seesaw",
    nodeIds: ["equivalent-repartition", "division-unknown-factor", "mt_ifPDOYvUqm"],
    predicate: "placed unit pieces equal the target amount exactly (3/4 = 6 × 1/8)",
    cueTargets: ["whole", "equal-parts", "eighth-units", "equivalence", "divide", "unknown"],
    objects: FOOD_OBJECTS,
    termIds: ["unit-fraction", "denominator", "numerator", "equivalent-fraction", "equal-groups", "unknown-factor"],
    forbiddenAnswerTokens: ["6", "छह", "six", "ஆறு", "6/8", "invert", "flip", "पलट", "reciprocal"],
    beats: { min: 2, max: 3 },
  },
  "balance-equivalence": {
    id: "balance-equivalence",
    stationId: "roti-seesaw",
    nodeIds: ["equivalent-repartition", "numerator-count", "mt_4Km38F4L-6"],
    predicate: "left-pan fraction and right-pan unit pieces produce zero net torque",
    cueTargets: ["whole", "equal-parts", "selected-three", "eighth-seams", "equivalence", "amount"],
    objects: FOOD_OBJECTS,
    termIds: ["denominator", "numerator", "equivalent-fraction", "unit-fraction"],
    forbiddenAnswerTokens: ["6", "छह", "six", "ஆறு", "6/8", "4", "चार", "four", "நான்கு"],
    beats: { min: 2, max: 3 },
  },
  "conserve-and-track": {
    id: "conserve-and-track",
    stationId: "puddle-sun",
    nodeIds: ["sun-heat", "invisible-vapour", "cooling-cloud", "mt_Qkewo5M3_c"],
    predicate: "liquid + vapour + droplet counts remain constant while state changes are observed",
    cueTargets: ["puddle", "sun", "surface", "vapour-tracker", "invisible-note", "cool-air", "droplets", "cycle"],
    objects: WATER_OBJECTS,
    termIds: ["evaporation", "water-vapour", "condensation", "precipitation"],
    forbiddenAnswerTokens: ["12", "बारह", "twelve", "பன்னிரண்டு", "destroyed", "नष्ट"],
    beats: { min: 2, max: 3 },
  },
};

export function isAtomTemplateId(value: unknown): value is AtomTemplateId {
  return typeof value === "string" && (ATOM_TEMPLATE_IDS as readonly string[]).includes(value);
}

export function atomTemplateById(id: unknown): AtomTemplate | null {
  return isAtomTemplateId(id) ? ATOM_TEMPLATES[id] : null;
}

export function isBridgeTermIdForTemplate(template: AtomTemplate, termId: unknown): termId is BridgeTermId {
  return typeof termId === "string" && (BRIDGE_TERM_IDS as readonly string[]).includes(termId) && template.termIds.includes(termId as BridgeTermId);
}
