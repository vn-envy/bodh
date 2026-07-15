export const BRIDGE_TERM_IDS = [
  "unit-fraction",
  "denominator",
  "numerator",
  "equivalent-fraction",
  "equal-groups",
  "unknown-factor",
  "reciprocal",
] as const;

export type BridgeTermId = (typeof BRIDGE_TERM_IDS)[number];
export type LearnerRegister = "hindi" | "hinglish" | "english";

export const HINDI_BRIDGE_TERMS: Record<BridgeTermId, {
  id: BridgeTermId;
  hindi: string;
  english: string;
  childMeaningHi: string;
}> = {
  "unit-fraction": {
    id: "unit-fraction",
    hindi: "इकाई भिन्न",
    english: "unit fraction",
    childMeaningHi: "ऐसा fraction जिसमें ऊपर 1 हो—जैसे 1/8।",
  },
  denominator: {
    id: "denominator",
    hindi: "हर",
    english: "denominator",
    childMeaningHi: "चुना हुआ whole कितने बराबर parts में बँटा है—यही हर unit का size तय करता है।",
  },
  numerator: {
    id: "numerator",
    hindi: "अंश",
    english: "numerator",
    childMeaningHi: "दिए हुए size के कितने बराबर units हम गिन रहे हैं।",
  },
  "equivalent-fraction": {
    id: "equivalent-fraction",
    hindi: "समतुल्य भिन्न",
    english: "equivalent fraction",
    childMeaningHi: "Parts या नाम अलग, लेकिन मात्रा वही—जैसे 1/2 और 2/4।",
  },
  "equal-groups": {
    id: "equal-groups",
    hindi: "बराबर समूह",
    english: "equal groups",
    childMeaningHi: "एक ही size के groups—division पूछती है कि कितने ऐसे groups बनते हैं।",
  },
  "unknown-factor": {
    id: "unknown-factor",
    hindi: "छुपा हुआ गुणक",
    english: "unknown factor",
    childMeaningHi: "वह number जो पता करना है: कितनी बार एक size लेने पर दूसरी quantity बनेगी?",
  },
  reciprocal: {
    id: "reciprocal",
    hindi: "उलटा भिन्न",
    english: "reciprocal",
    childMeaningHi: "ऊपर और नीचे को बदल देने का नाम; Bodh पहले इसका meaning picture से जोड़ेगा।",
  },
};

export function isBridgeTermId(value: string): value is BridgeTermId {
  return (BRIDGE_TERM_IDS as readonly string[]).includes(value);
}

export function resolveBridgeTerms(termIds: string[]) {
  return termIds.filter(isBridgeTermId).map((termId) => HINDI_BRIDGE_TERMS[termId]);
}

export function inferLearnerRegister(value: string): LearnerRegister {
  const hasDevanagari = /[\u0900-\u097F]/.test(value);
  const hasLatinWords = /[A-Za-z]{2,}/.test(value);
  if (hasDevanagari && hasLatinWords) return "hinglish";
  if (hasDevanagari) return "hindi";
  return "english";
}
