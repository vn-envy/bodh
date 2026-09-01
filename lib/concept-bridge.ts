import type { NarrationLanguage } from "./narration-language.ts";

/**
 * Committed teaching vocabulary. The model may only select IDs from this list;
 * Bodh renders the term, the English curriculum word, and the child-facing
 * meaning from here so a learner never bridges a concept and a drifting
 * translation at the same time (D-010, D-019).
 */
export const BRIDGE_TERM_IDS = [
  "unit-fraction",
  "denominator",
  "numerator",
  "equivalent-fraction",
  "equal-groups",
  "unknown-factor",
  "reciprocal",
  "evaporation",
  "water-vapour",
  "condensation",
  "precipitation",
] as const;

export type BridgeTermId = (typeof BRIDGE_TERM_IDS)[number];
export type LearnerRegister = "hindi" | "hinglish" | "tamil" | "tanglish" | "english";

export type ConceptBridgeTerm = Readonly<{
  id: BridgeTermId;
  /** Term as it appears in that language's textbooks. */
  term: Readonly<Record<NarrationLanguage, string>>;
  /** Child-facing meaning in the child's register (code-mixed where natural). */
  childMeaning: Readonly<Record<NarrationLanguage, string>>;
  /** Tamil entries were authored for this release but await a native-speaker review pass. */
  tamilReviewed: boolean;
}>;

export const CONCEPT_BRIDGE_TERMS: Readonly<Record<BridgeTermId, ConceptBridgeTerm>> = {
  "unit-fraction": {
    id: "unit-fraction",
    term: { hi: "इकाई भिन्न", en: "unit fraction", ta: "அலகு பின்னம்" },
    childMeaning: {
      hi: "ऐसा fraction जिसमें ऊपर 1 हो—जैसे 1/8।",
      en: "A fraction with 1 on top—like 1/8.",
      ta: "மேலே 1 இருக்கும் fraction—1/8 போல.",
    },
    tamilReviewed: false,
  },
  denominator: {
    id: "denominator",
    term: { hi: "हर", en: "denominator", ta: "பகுதி" },
    childMeaning: {
      hi: "चुना हुआ whole कितने बराबर parts में बँटा है—यही हर unit का size तय करता है।",
      en: "How many equal parts the chosen whole is cut into—this fixes the size of each unit.",
      ta: "தேர்ந்தெடுத்த whole எத்தனை சம பகுதிகளாகப் பிரிந்திருக்கிறது—இதுவே ஒவ்வொரு unit-இன் அளவை முடிவு செய்கிறது.",
    },
    tamilReviewed: false,
  },
  numerator: {
    id: "numerator",
    term: { hi: "अंश", en: "numerator", ta: "தொகுதி" },
    childMeaning: {
      hi: "दिए हुए size के कितने बराबर units हम गिन रहे हैं।",
      en: "How many equal units of that size we are counting.",
      ta: "அந்த அளவுள்ள சம units எத்தனை என்று நாம் எண்ணுகிறோம்.",
    },
    tamilReviewed: false,
  },
  "equivalent-fraction": {
    id: "equivalent-fraction",
    term: { hi: "समतुल्य भिन्न", en: "equivalent fraction", ta: "சமான பின்னம்" },
    childMeaning: {
      hi: "Parts या नाम अलग, लेकिन मात्रा वही—जैसे 1/2 और 2/4।",
      en: "Different parts or names, the same amount—like 1/2 and 2/4.",
      ta: "பகுதிகளும் பெயரும் வேறு, ஆனால் அளவு ஒன்றே—1/2 மற்றும் 2/4 போல.",
    },
    tamilReviewed: false,
  },
  "equal-groups": {
    id: "equal-groups",
    term: { hi: "बराबर समूह", en: "equal groups", ta: "சம குழுக்கள்" },
    childMeaning: {
      hi: "एक ही size के groups—division पूछती है कि कितने ऐसे groups बनते हैं।",
      en: "Groups of one size—division asks how many such groups there are.",
      ta: "ஒரே அளவுள்ள groups—division எத்தனை அப்படிப்பட்ட groups உள்ளன என்று கேட்கிறது.",
    },
    tamilReviewed: false,
  },
  "unknown-factor": {
    id: "unknown-factor",
    term: { hi: "छुपा हुआ गुणक", en: "unknown factor", ta: "தெரியாத காரணி" },
    childMeaning: {
      hi: "वह number जो पता करना है: कितनी बार एक size लेने पर दूसरी quantity बनेगी?",
      en: "The number we are looking for: how many times one size makes the other quantity?",
      ta: "நாம் தேடும் எண்: ஒரு அளவை எத்தனை முறை எடுத்தால் மற்ற quantity கிடைக்கும்?",
    },
    tamilReviewed: false,
  },
  reciprocal: {
    id: "reciprocal",
    term: { hi: "उलटा भिन्न", en: "reciprocal", ta: "தலைகீழி" },
    childMeaning: {
      hi: "ऊपर और नीचे को बदल देने का नाम; Bodh पहले इसका meaning picture से जोड़ेगा।",
      en: "The name for swapping top and bottom; Bodh will connect its meaning to the picture first.",
      ta: "மேலும் கீழும் மாற்றுவதற்குப் பெயர்; போத் முதலில் இதன் பொருளைப் படத்தோடு இணைக்கும்.",
    },
    tamilReviewed: false,
  },
  evaporation: {
    id: "evaporation",
    term: { hi: "वाष्पीकरण", en: "evaporation", ta: "ஆவியாதல்" },
    childMeaning: {
      hi: "Liquid water के surface से कुछ पानी invisible gas बनकर हवा में चला जाता है।",
      en: "Some water at the liquid's surface turns into an invisible gas and moves into the air.",
      ta: "திரவ நீரின் மேற்பரப்பில் இருந்து சிறிது நீர் கண்ணுக்குத் தெரியாத gas ஆகி காற்றில் கலக்கிறது.",
    },
    tamilReviewed: false,
  },
  "water-vapour": {
    id: "water-vapour",
    term: { hi: "जलवाष्प", en: "water vapour", ta: "நீராவி" },
    childMeaning: {
      hi: "हवा में मौजूद water का invisible gas रूप—पानी खत्म नहीं हुआ है।",
      en: "Water's invisible gas form in the air—the water has not ended.",
      ta: "காற்றில் இருக்கும் நீரின் கண்ணுக்குத் தெரியாத gas வடிவம்—நீர் அழிந்துவிடவில்லை.",
    },
    tamilReviewed: false,
  },
  condensation: {
    id: "condensation",
    term: { hi: "संघनन", en: "condensation", ta: "ஒடுக்கம்" },
    childMeaning: {
      hi: "Water vapour ठंडी होकर फिर tiny liquid droplets बनती है।",
      en: "Water vapour cools and becomes tiny liquid droplets again.",
      ta: "நீராவி குளிர்ந்து மீண்டும் சிறிய திரவத் துளிகளாக மாறுகிறது.",
    },
    tamilReviewed: false,
  },
  precipitation: {
    id: "precipitation",
    term: { hi: "वर्षण", en: "precipitation", ta: "மழைப்பொழிவு" },
    childMeaning: {
      hi: "Cloud के droplets बड़े और भारी होकर rain, snow, या hail की तरह नीचे आते हैं।",
      en: "Cloud droplets grow heavy and come down as rain, snow, or hail.",
      ta: "மேகத் துளிகள் பெரிதாகி, கனமாகி மழை, பனி அல்லது ஆலங்கட்டியாகக் கீழே வருகின்றன.",
    },
    tamilReviewed: false,
  },
};

export function isBridgeTermId(value: string): value is BridgeTermId {
  return (BRIDGE_TERM_IDS as readonly string[]).includes(value);
}

export function resolveConceptTerms(termIds: readonly string[]) {
  return termIds.filter(isBridgeTermId).map((termId) => CONCEPT_BRIDGE_TERMS[termId]);
}

/** Every glossary surface form in every language, for translation pinning. */
export function protectedGlossaryForms(): readonly string[] {
  const forms = new Set<string>();
  for (const term of Object.values(CONCEPT_BRIDGE_TERMS)) {
    for (const value of Object.values(term.term)) forms.add(value);
  }
  return [...forms];
}

const DEVANAGARI = /[\u0900-\u097F]/;
const TAMIL = /[\u0B80-\u0BFF]/;
const LATIN_WORDS = /[A-Za-z]{2,}/;

/**
 * Register of a learner's typed or spoken text across all three languages.
 * The diagnostic contract (`schemas/diagnostic-output.schema.json`) still uses
 * the three-way Hindi register from `hindi-bridge.ts`; this wider inference
 * drives interface and speech choices only.
 */
export function inferLearnerRegister(value: string): LearnerRegister {
  const hasDevanagari = DEVANAGARI.test(value);
  const hasTamil = TAMIL.test(value);
  const hasLatinWords = LATIN_WORDS.test(value);
  if (hasTamil && hasLatinWords) return "tanglish";
  if (hasTamil) return "tamil";
  if (hasDevanagari && hasLatinWords) return "hinglish";
  if (hasDevanagari) return "hindi";
  return "english";
}
