import type { LocalizedText } from "./narration-language";

/**
 * The Understanding Climb reads the same bounded Marble slices that ground
 * diagnosis. Slices are passed in (rather than imported as JSON) so the graph
 * logic runs unchanged in the Worker bundle and in Node's test loader.
 */
export const CLIMB_SUBJECTS = ["mathematics", "science"] as const;
export type ClimbSubject = (typeof CLIMB_SUBJECTS)[number];

export const EVIDENCE_STATEMENT_COUNT = 3 as const;
export type EvidenceIndex = 0 | 1 | 2;
export const EVIDENCE_INDICES: readonly EvidenceIndex[] = [0, 1, 2];

export type MarbleTopic = Readonly<{
  id: string;
  name: string;
  description: string;
  ageRangeStart: number;
  ageRangeEnd: number;
  evidence: readonly string[];
  assessmentPrompt: string;
}>;

export type MarbleDependency = Readonly<{
  topicId: string;
  prerequisiteId: string;
  strength: string;
  reason: string;
}>;

export type MarbleSlice = Readonly<{
  selection: Readonly<{ targetTopicId: string }>;
  topics: readonly MarbleTopic[];
  dependencies: readonly MarbleDependency[];
}>;

export type CurriculumEdge = Readonly<{
  from: string;
  to: string;
  strength: "hard" | "soft";
  reason: string;
}>;

export type CurriculumGraph = Readonly<{
  subject: ClimbSubject;
  goalTopicId: string;
  topics: readonly MarbleTopic[];
  topicById: ReadonlyMap<string, MarbleTopic>;
  edges: readonly CurriculumEdge[];
  /** Foundations first; ties keep the slice's authored topic order. */
  order: readonly string[];
  /** Longest prerequisite chain beneath each topic (0 = foundation). */
  tierOf: ReadonlyMap<string, number>;
  /** Tiers from foundations (index 0) up to the summit. */
  tiers: readonly (readonly string[])[];
}>;

export function createCurriculumGraph(subject: ClimbSubject, slice: MarbleSlice): CurriculumGraph {
  const topicById = new Map(slice.topics.map((topic) => [topic.id, topic]));
  if (topicById.size !== slice.topics.length) throw new Error(`${subject}: duplicate Marble topic id`);
  if (!topicById.has(slice.selection.targetTopicId)) throw new Error(`${subject}: goal is outside the slice`);

  const edges: CurriculumEdge[] = slice.dependencies.map((dependency) => {
    if (!topicById.has(dependency.topicId) || !topicById.has(dependency.prerequisiteId)) {
      throw new Error(`${subject}: dependency leaves the slice`);
    }
    if (dependency.strength !== "hard" && dependency.strength !== "soft") {
      throw new Error(`${subject}: unknown dependency strength ${dependency.strength}`);
    }
    return {
      from: dependency.prerequisiteId,
      to: dependency.topicId,
      strength: dependency.strength,
      reason: dependency.reason,
    };
  });

  // Kahn's algorithm with slice order as the stable tie-break.
  const indegree = new Map(slice.topics.map((topic) => [topic.id, 0]));
  for (const edge of edges) indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  const order: string[] = [];
  const ready = slice.topics.filter((topic) => indegree.get(topic.id) === 0).map((topic) => topic.id);
  while (ready.length > 0) {
    const current = ready.shift()!;
    order.push(current);
    for (const edge of edges.filter((candidate) => candidate.from === current)) {
      const remaining = (indegree.get(edge.to) ?? 0) - 1;
      indegree.set(edge.to, remaining);
      if (remaining === 0) {
        ready.push(edge.to);
        ready.sort((left, right) => slice.topics.findIndex((t) => t.id === left) - slice.topics.findIndex((t) => t.id === right));
      }
    }
  }
  if (order.length !== slice.topics.length) throw new Error(`${subject}: Marble slice contains a cycle`);

  const tierOf = new Map<string, number>();
  for (const topicId of order) {
    const below = edges.filter((edge) => edge.to === topicId).map((edge) => (tierOf.get(edge.from) ?? 0) + 1);
    tierOf.set(topicId, Math.max(0, ...below));
  }
  const tierCount = Math.max(...tierOf.values()) + 1;
  const tiers = Array.from({ length: tierCount }, (_, tier) => order.filter((topicId) => tierOf.get(topicId) === tier));

  return {
    subject,
    goalTopicId: slice.selection.targetTopicId,
    topics: slice.topics,
    topicById,
    edges,
    order,
    tierOf,
    tiers,
  };
}

export function prerequisiteEdges(graph: CurriculumGraph, topicId: string, strength?: "hard" | "soft") {
  return graph.edges.filter((edge) => edge.to === topicId && (!strength || edge.strength === strength));
}

export function dependentEdges(graph: CurriculumGraph, topicId: string) {
  return graph.edges.filter((edge) => edge.from === topicId);
}

/** Every topic reachable by walking prerequisite edges downward. */
export function ancestorIds(graph: CurriculumGraph, topicId: string) {
  const found = new Set<string>();
  const pending = [topicId];
  while (pending.length > 0) {
    const current = pending.pop()!;
    for (const edge of prerequisiteEdges(graph, current)) {
      if (found.has(edge.from)) continue;
      found.add(edge.from);
      pending.push(edge.from);
    }
  }
  return found;
}

export function isClimbSubject(value: unknown): value is ClimbSubject {
  return value === "mathematics" || value === "science";
}

const hiEn = (hi: string, en: string): LocalizedText => ({ hi, en });

export type ClimbTopicCopy = Readonly<{
  short: LocalizedText;
  /** Child-facing paraphrases of the three Marble evidence statements, in order. */
  evidence: readonly [LocalizedText, LocalizedText, LocalizedText];
}>;

/**
 * Child-facing names and evidence paraphrases. The canonical Marble English
 * text stays visible beside these in the grown-up view; these never replace it.
 */
export const CLIMB_TOPIC_COPY: Readonly<Record<string, ClimbTopicCopy>> = {
  "mt_ndGqFPWyen": {
    short: hiEn("एक whole के बराबर हिस्से", "Equal parts of one whole"),
    evidence: [
      hiEn("बराबर हिस्सों वाले shape में एक रँगा हिस्सा पहचानना", "Name one shaded part of a shape cut into equal parts"),
      hiEn("समझाना कि 3/4 = 1/4 size के 3 हिस्से", "Explain that 3/4 means 3 parts, each of size 1/4"),
      hiEn("Picture में 2/6 बनाना: 6 में कटे whole के 2 pieces", "Build 2/6 as 2 pieces of a whole cut into 6"),
    ],
  },
  "mt_09sySPqM9Z": {
    short: hiEn("Unit fractions से amount बनाओ", "Build amounts from unit fractions"),
    evidence: [
      hiEn("5/8 को पाँच 1/8 के जोड़ की तरह लिखना", "Write 5/8 as five copies of 1/8 added together"),
      hiEn("Number line पर 1/3 की छलांगों से 4/3 तक पहुँचना", "Hop 1/3 at a time on a number line to reach 4/3"),
      hiEn("समझाना कि 7/4 सात 1/4 का जोड़ है—1 से बड़ा होकर भी", "Explain why 7/4 is seven copies of 1/4—even though it is more than 1"),
    ],
  },
  "mt_TgHxujL81r": {
    short: hiEn("Fraction को बार-बार जोड़ना", "Repeat a fraction"),
    evidence: [
      hiEn("4 × 3/8 को बार-बार जोड़कर निकालना", "Find 4 × 3/8 by repeated addition"),
      hiEn("Mixed number × whole को mixed number में लिखना", "Multiply a mixed number by a whole number"),
      hiEn("Picture से दिखाना कि 5 × 1/4 = 5/4 क्यों", "Show with a picture why 5 × 1/4 = 5/4"),
    ],
  },
  "mt_AabJisinfi": {
    short: hiEn("Fraction को fraction से multiply करना", "Multiply a fraction by a fraction"),
    evidence: [
      hiEn("Area model में fraction × fraction पढ़ना", "Read fraction × fraction from an area model"),
      hiEn("Fraction × whole को mixed number तक ले जाना", "Take fraction × whole to a mixed number"),
      hiEn("Product को सबसे simple form में लिखना", "Write a product in simplest form"),
    ],
  },
  "mt_4Km38F4L-6": {
    short: hiEn("Fraction भी division है", "A fraction is also division"),
    evidence: [
      hiEn("समझाना कि 3/4 = 3 ÷ 4, और 3/4 × 4 = 3 से जाँचना", "Explain 3/4 = 3 ÷ 4 and check it with 3/4 × 4 = 3"),
      hiEn("बराबर बाँटने वाली कहानी का fraction answer निकालना", "Solve a fair-share story with a fraction answer"),
      hiEn("Picture से दिखाना कि 3 wholes को 4 में बाँटने पर हर एक को 3/4 मिलता है", "Show that 3 wholes shared by 4 gives each 3/4"),
    ],
  },
  "mt_ifPDOYvUqm": {
    short: hiEn("एक unit fraction को बाँटना", "Share one unit fraction"),
    evidence: [
      hiEn("1/3 ÷ 4 को picture में 4 बराबर हिस्से करके निकालना", "Find 1/3 ÷ 4 by splitting 1/3 into 4 equal parts"),
      hiEn("Unit fraction ÷ whole वाली कहानी हल करना", "Solve a story about sharing a unit fraction"),
      hiEn("Multiplication से उल्टा जाँचना: 1/12 × 4 = 1/3", "Check backwards: 1/12 × 4 = 1/3"),
    ],
  },
  "mt_1PAWhRhpdg": {
    short: hiEn("Whole में unit fractions गिनना", "Count unit fractions in a whole"),
    evidence: [
      hiEn("गिनना कि 4 wholes में कितने 1/5 fit होते हैं", "Count how many fifths fit in 4 wholes"),
      hiEn("Whole ÷ unit fraction वाली कहानी हल करना", "Solve a story for a whole ÷ unit fraction"),
      hiEn("Multiplication से उल्टा जाँचना: 20 × 1/5 = 4", "Check backwards: 20 × 1/5 = 4"),
    ],
  },
  "mt_9Y96vxG_LH": {
    short: hiEn("Fractions को divide करना", "Divide fractions"),
    evidence: [
      hiEn("Reciprocal method—और उसका meaning", "The reciprocal method—and what it means"),
      hiEn("Picture में divisor-size groups गिनना", "Count divisor-sized groups in a picture"),
      hiEn("Fraction division की कहानी हल करना", "Solve a fraction-division story"),
    ],
  },
  "mt_iNdrM2-oJf": {
    short: hiEn("Division के दो meanings", "Two meanings of division"),
    evidence: [
      hiEn("Division को sharing और grouping—दोनों तरह पढ़ना", "Read division as sharing and as grouping"),
      hiEn("Division expression के लिए सही picture चुनना", "Pick the picture that shows a division"),
      hiEn("कहानी को सही division expression से मिलाना", "Match a story to its division expression"),
    ],
  },
  "mt_GDG9_SZmsO": {
    short: hiEn("Division में छुपा multiplier", "The hidden multiplier in division"),
    evidence: [
      hiEn("32 ÷ 8 = ? को 8 × ? = 32 की तरह लिखना", "Rewrite 32 ÷ 8 = ? as 8 × ? = 32"),
      hiEn("जानी हुई table से division answer निकालना", "Use a known times-table fact to divide"),
      hiEn("समझाना कि multiplication और division एक-दूसरे को उल्टा करते हैं", "Explain how multiplication and division undo each other"),
    ],
  },
  "mt_TlLE4cZgOr": {
    short: hiEn("बारिश और पानी के गड्ढे", "Rain and puddles"),
    evidence: [
      hiEn("बताना कि बारिश बादलों से गिरती है", "Say that rain falls from clouds"),
      hiEn("समझाना कि puddle का पानी हवा में जाता है", "Explain that puddle water goes into the air"),
      hiEn("बताना कि पानी ऊपर जाता है और बार-बार नीचे लौटता है", "Describe water going up and coming back down, again and again"),
    ],
  },
  "mt_PrWc-HZzDl": {
    short: hiEn("तापमान", "Temperature"),
    evidence: [
      hiEn("समझाना कि तापमान बताता है कोई चीज़ कितनी गरम या ठंडी है", "Explain that temperature tells how hot or cold something is"),
      hiEn("पहचानना कि तापमान thermometer से मापते हैं", "Pick the thermometer as the tool that measures temperature"),
      hiEn("गरम, गुनगुना, हल्का ठंडा, ठंडा—सही शब्द चुनना", "Use hot, warm, cool, and cold correctly"),
    ],
  },
  "mt_IhWzO4sQPg": {
    short: hiEn("बादल और उनके प्रकार", "Clouds and their types"),
    evidence: [
      hiEn("तीन बादल पहचानना: cumulus, stratus, cirrus", "Recognise cumulus, stratus, and cirrus clouds"),
      hiEn("समझाना कि जलवाष्प ठंडी होकर बादल की बूँदें बनाती है", "Explain that clouds form when vapour cools and condenses"),
      hiEn("बादल देखकर मौसम का अंदाज़ा लगाना", "Use a cloud type to predict the weather"),
    ],
  },
  "mt_nRF_VRntrW": {
    short: hiEn("पानी कहाँ मिलता है", "Where water is found"),
    evidence: [
      hiEn("धरती पर पानी की जगहें पहचानना—हवा भी", "Name places water is found—air included"),
      hiEn("समझाना कि बर्फ भी पानी है—ठोस रूप में", "Explain that ice is water too—in solid form"),
      hiEn("पहचानना कि धरती का सबसे ज़्यादा पानी समुद्रों में है", "Recognise that most of Earth's water is in the oceans"),
    ],
  },
  "mt_Pl-nsjYGZ3": {
    short: hiEn("गरम और ठंडा होना", "Heating and cooling"),
    evidence: [
      hiEn("पिघलना और जमना रोज़ की चीज़ों में पहचानना", "Spot melting and freezing in everyday things"),
      hiEn("पानी 0°C पर जमता है और 100°C पर उबलता है", "Water freezes at 0°C and boils at 100°C"),
      hiEn("समझाना कि गरमी से कण ज़्यादा हिलते हैं और अवस्था बदल सकती है", "Explain that heating makes particles move more and can change state"),
    ],
  },
  "mt_ahSqW_kK1b": {
    short: hiEn("विज्ञान के सही शब्द", "Precise science words"),
    evidence: [
      hiEn("घुलना (dissolve) और पिघलना (melt) में फर्क करना", "Tell dissolving apart from melting"),
      hiEn("Soluble और insoluble सही जगह इस्तेमाल करना", "Use soluble and insoluble correctly"),
      hiEn("Evaporation और condensation का फर्क समझाना", "Explain evaporation versus condensation"),
    ],
  },
  "mt_fhqVdj4BYr": {
    short: hiEn("जल चक्र", "Water cycle"),
    evidence: [
      hiEn("तीन चरण क्रम में रखना: evaporation, condensation, precipitation", "Put the three stages in order"),
      hiEn("समझाना कि Sun जल चक्र को चलाता है", "Explain how the Sun drives the cycle"),
      hiEn("बताना कि जल चक्र का न शुरू है न अंत", "Describe the cycle as a loop with no start or end"),
    ],
  },
  "mt_Qkewo5M3_c": {
    short: hiEn("वाष्पीकरण और जल चक्र", "Evaporation and the water cycle"),
    evidence: [
      hiEn("Evaporation = तरल → गैस, condensation = गैस → तरल", "Evaporation is liquid → gas; condensation is gas → liquid"),
      hiEn("Puddle से बादल से बारिश तक पानी को track करना", "Track water from puddle to cloud to rain"),
      hiEn("समझाना कि गरमी में puddle जल्दी क्यों सूखता है", "Explain why puddles dry faster on hot days"),
    ],
  },
};

export function climbTopicCopy(topicId: string) {
  return Object.hasOwn(CLIMB_TOPIC_COPY, topicId) ? CLIMB_TOPIC_COPY[topicId] : null;
}
