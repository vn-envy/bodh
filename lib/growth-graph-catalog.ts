import type { LocalizedText } from "./narration-language.ts";

/**
 * Fixed topology of the growth graph. A learner's saved graph holds only
 * per-node evidence and never its own topology, so this catalogue can grow
 * without corrupting saved state (docs/GROWTH_GRAPH.md).
 *
 * Marble node IDs and dependencies mirror `data/taxonomy/*.slice.json`
 * exactly; `tests/growth-graph.test.mjs` asserts the mirror.
 */
export type GrowthNodeKind = "marble" | "atom";
export type GrowthEdgeStrength = "hard" | "soft";

export type GrowthNode = Readonly<{
  id: string;
  kind: GrowthNodeKind;
  label: LocalizedText;
  /** Bodh atoms hang off one Marble parent so the world can group them into places. */
  parentId?: string;
}>;

export type GrowthEdge = Readonly<{
  prerequisiteId: string;
  topicId: string;
  strength: GrowthEdgeStrength;
}>;

const hiEn = (hi: string, en: string): LocalizedText => ({ hi, en });

export const MARBLE_FRACTION_NODES: readonly GrowthNode[] = [
  { id: "mt_ndGqFPWyen", kind: "marble", label: hiEn("एक whole के बराबर हिस्से", "Fractions of a whole") },
  { id: "mt_09sySPqM9Z", kind: "marble", label: hiEn("Fractions को समझना", "Understanding fractions") },
  { id: "mt_TgHxujL81r", kind: "marble", label: hiEn("Fractions को दोहराना", "Multiplying fractions") },
  { id: "mt_4Km38F4L-6", kind: "marble", label: hiEn("किसी मात्रा का fraction", "Fractions of a whole (age 10+)") },
  { id: "mt_AabJisinfi", kind: "marble", label: hiEn("Fractions को multiply करना", "Multiplying fractions (age 10+)") },
  { id: "mt_ifPDOYvUqm", kind: "marble", label: hiEn("Unit fractions से भाग", "Dividing fractions (unit fractions)") },
  { id: "mt_1PAWhRhpdg", kind: "marble", label: hiEn("Fractions से भाग देना", "Dividing by fractions") },
  { id: "mt_9Y96vxG_LH", kind: "marble", label: hiEn("Fractions को divide करना", "Dividing fractions") },
  { id: "mt_iNdrM2-oJf", kind: "marble", label: hiEn("Division का मतलब", "What division means") },
  { id: "mt_GDG9_SZmsO", kind: "marble", label: hiEn("छुपा हुआ गुणक", "Division as unknown factor") },
];

export const MARBLE_FRACTION_EDGES: readonly GrowthEdge[] = [
  { prerequisiteId: "mt_AabJisinfi", topicId: "mt_9Y96vxG_LH", strength: "hard" },
  { prerequisiteId: "mt_ifPDOYvUqm", topicId: "mt_9Y96vxG_LH", strength: "hard" },
  { prerequisiteId: "mt_4Km38F4L-6", topicId: "mt_1PAWhRhpdg", strength: "soft" },
  { prerequisiteId: "mt_AabJisinfi", topicId: "mt_1PAWhRhpdg", strength: "hard" },
  { prerequisiteId: "mt_ifPDOYvUqm", topicId: "mt_1PAWhRhpdg", strength: "soft" },
  { prerequisiteId: "mt_4Km38F4L-6", topicId: "mt_ifPDOYvUqm", strength: "hard" },
  { prerequisiteId: "mt_AabJisinfi", topicId: "mt_ifPDOYvUqm", strength: "hard" },
  { prerequisiteId: "mt_TgHxujL81r", topicId: "mt_AabJisinfi", strength: "hard" },
  { prerequisiteId: "mt_TgHxujL81r", topicId: "mt_4Km38F4L-6", strength: "hard" },
  { prerequisiteId: "mt_09sySPqM9Z", topicId: "mt_TgHxujL81r", strength: "hard" },
  { prerequisiteId: "mt_ndGqFPWyen", topicId: "mt_09sySPqM9Z", strength: "hard" },
  { prerequisiteId: "mt_iNdrM2-oJf", topicId: "mt_GDG9_SZmsO", strength: "hard" },
];

export const MARBLE_WATER_NODES: readonly GrowthNode[] = [
  { id: "mt_TlLE4cZgOr", kind: "marble", label: hiEn("बारिश और puddles", "Rain & puddles") },
  { id: "mt_PrWc-HZzDl", kind: "marble", label: hiEn("तापमान", "Temperature & thermometers") },
  { id: "mt_IhWzO4sQPg", kind: "marble", label: hiEn("बादलों के प्रकार", "Cloud types") },
  { id: "mt_nRF_VRntrW", kind: "marble", label: hiEn("पृथ्वी पर पानी कहाँ है", "Where water is found on Earth") },
  { id: "mt_Pl-nsjYGZ3", kind: "marble", label: hiEn("गर्म और ठंडा होने पर बदलाव", "Heating & cooling changes") },
  { id: "mt_ahSqW_kK1b", kind: "marble", label: hiEn("बदलाव के शब्द", "Changes & separation vocabulary") },
  { id: "mt_fhqVdj4BYr", kind: "marble", label: hiEn("जल चक्र", "The water cycle") },
  { id: "mt_Qkewo5M3_c", kind: "marble", label: hiEn("वाष्पीकरण और जल चक्र", "Evaporation & the water cycle") },
];

export const MARBLE_WATER_EDGES: readonly GrowthEdge[] = [
  { prerequisiteId: "mt_TlLE4cZgOr", topicId: "mt_IhWzO4sQPg", strength: "hard" },
  { prerequisiteId: "mt_IhWzO4sQPg", topicId: "mt_fhqVdj4BYr", strength: "hard" },
  { prerequisiteId: "mt_nRF_VRntrW", topicId: "mt_fhqVdj4BYr", strength: "soft" },
  { prerequisiteId: "mt_Pl-nsjYGZ3", topicId: "mt_fhqVdj4BYr", strength: "soft" },
  { prerequisiteId: "mt_PrWc-HZzDl", topicId: "mt_fhqVdj4BYr", strength: "soft" },
  { prerequisiteId: "mt_TlLE4cZgOr", topicId: "mt_fhqVdj4BYr", strength: "hard" },
  { prerequisiteId: "mt_fhqVdj4BYr", topicId: "mt_Qkewo5M3_c", strength: "soft" },
  { prerequisiteId: "mt_Pl-nsjYGZ3", topicId: "mt_Qkewo5M3_c", strength: "hard" },
  { prerequisiteId: "mt_ahSqW_kK1b", topicId: "mt_Qkewo5M3_c", strength: "hard" },
];

/** The seven fraction repair atoms from `lib/adaptive-repair.ts`, in authored order. */
export const FRACTION_ATOM_NODES: readonly GrowthNode[] = [
  { id: "chosen-whole", kind: "atom", parentId: "mt_ndGqFPWyen", label: hiEn("चुना हुआ पूरा", "The chosen whole") },
  { id: "equal-parts", kind: "atom", parentId: "mt_ndGqFPWyen", label: hiEn("बराबर हिस्से", "Equal parts") },
  { id: "unit-and-denominator", kind: "atom", parentId: "mt_09sySPqM9Z", label: hiEn("Unit और हर", "Unit and denominator") },
  { id: "numerator-count", kind: "atom", parentId: "mt_09sySPqM9Z", label: hiEn("अंश की गिनती", "Numerator as a count") },
  { id: "equivalent-repartition", kind: "atom", parentId: "mt_4Km38F4L-6", label: hiEn("वही मात्रा, नए हिस्से", "Equivalent repartition") },
  { id: "repeated-composition", kind: "atom", parentId: "mt_TgHxujL81r", label: hiEn("बार-बार जोड़ना", "Repeated composition") },
  { id: "division-unknown-factor", kind: "atom", parentId: "mt_GDG9_SZmsO", label: hiEn("Division: कितने fit होते हैं?", "Division as unknown factor") },
];

/** The five evaporation stages from `lib/evaporation-concept.ts`, in authored order. */
export const WATER_ATOM_NODES: readonly GrowthNode[] = [
  { id: "notice-puddle", kind: "atom", parentId: "mt_TlLE4cZgOr", label: hiEn("पानी को पहचानो", "Notice the puddle") },
  { id: "sun-heat", kind: "atom", parentId: "mt_PrWc-HZzDl", label: hiEn("सूरज की गर्मी", "Sunlight warms the water") },
  { id: "invisible-vapour", kind: "atom", parentId: "mt_Pl-nsjYGZ3", label: hiEn("अदृश्य जलवाष्प", "Invisible vapour") },
  { id: "cooling-cloud", kind: "atom", parentId: "mt_IhWzO4sQPg", label: hiEn("ठंडा होकर बादल", "Cooling into cloud") },
  { id: "returning-rain", kind: "atom", parentId: "mt_fhqVdj4BYr", label: hiEn("लौटती बारिश", "Returning rain") },
];

function chain(nodes: readonly GrowthNode[]): GrowthEdge[] {
  return nodes.slice(1).map((node, index) => ({
    prerequisiteId: nodes[index].id,
    topicId: node.id,
    strength: "hard" as const,
  }));
}

export const GROWTH_NODES: readonly GrowthNode[] = [
  ...MARBLE_FRACTION_NODES,
  ...MARBLE_WATER_NODES,
  ...FRACTION_ATOM_NODES,
  ...WATER_ATOM_NODES,
];

export const GROWTH_EDGES: readonly GrowthEdge[] = [
  ...MARBLE_FRACTION_EDGES,
  ...MARBLE_WATER_EDGES,
  ...chain(FRACTION_ATOM_NODES),
  ...chain(WATER_ATOM_NODES),
];

export const GROWTH_NODE_IDS: readonly string[] = GROWTH_NODES.map((node) => node.id);

const NODE_BY_ID: ReadonlyMap<string, GrowthNode> = new Map(GROWTH_NODES.map((node) => [node.id, node]));

export function growthNodeById(id: unknown): GrowthNode | null {
  return typeof id === "string" ? NODE_BY_ID.get(id) ?? null : null;
}

export function isGrowthNodeId(id: unknown): id is string {
  return typeof id === "string" && NODE_BY_ID.has(id);
}

export function childAtomIds(marbleId: string): readonly string[] {
  return GROWTH_NODES.filter((node) => node.kind === "atom" && node.parentId === marbleId).map((node) => node.id);
}

export function prerequisiteEdgesFor(nodeId: string): readonly GrowthEdge[] {
  return GROWTH_EDGES.filter((edge) => edge.topicId === nodeId);
}

export function dependentEdgesFor(nodeId: string): readonly GrowthEdge[] {
  return GROWTH_EDGES.filter((edge) => edge.prerequisiteId === nodeId);
}

/**
 * Misconception hypothesis IDs the diagnosis may attach as evidence. Mirrors
 * the allowlist in `lib/diagnostic-guardrails.ts`; a test keeps them in sync.
 */
export const MISCONCEPTION_SIGNAL_IDS = [
  "division-always-makes-smaller",
  "reciprocal-rule-without-meaning",
  "dividend-divisor-role-confusion",
  "unit-fraction-size-confusion",
  "fraction-as-two-whole-numbers",
  "unknown-factor-not-connected",
  "arithmetic-slip",
  "insufficient-evidence",
  "answer-only-intent",
  "water-disappears-when-dry",
  "evaporation-requires-boiling",
  "vapour-is-visible-steam",
  "condensation-link-missing",
] as const;

export type MisconceptionSignalId = (typeof MISCONCEPTION_SIGNAL_IDS)[number];

export function isMisconceptionSignalId(value: unknown): value is MisconceptionSignalId {
  return typeof value === "string" && (MISCONCEPTION_SIGNAL_IDS as readonly string[]).includes(value);
}
