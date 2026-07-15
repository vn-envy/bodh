export const FRACTION_MODEL = {
  quarterCount: 4,
  selectedQuarters: 3,
  eighthsPerQuarter: 2,
} as const;

export const FRACTION_NARRATION_VERSION = "fractions-v1";

export type FractionVisualState =
  | "blank"
  | "whole"
  | "quarters"
  | "unit"
  | "fraction"
  | "eighths"
  | "multiply"
  | "divide";

export type FractionCueTarget =
  | "whole"
  | "equal-parts"
  | "unit-quarter"
  | "denominator"
  | "selected-three"
  | "numerator"
  | "amount"
  | "eighth-seams"
  | "eighth-unit"
  | "eighth-units"
  | "equivalence"
  | "times"
  | "divide"
  | "unknown";

export type FractionNarrationBeat = {
  id: string;
  text: string;
  key: string;
  target: FractionCueTarget;
};

export const FRACTION_CONCEPT_STAGES = [
  {
    id: "chosen-whole",
    eyebrow: "पहली IDEA",
    title: "पहले, पूरा चुनो",
    screenKey: "पूरी पट्टी = एक पूरा",
    action: "पूरी पट्टी चुनो",
    evidence: "यही पट्टी हमारा 1 पूरा है",
    visualState: "whole",
    narration: [
      {
        id: "name-the-whole",
        text: "देखो, फ्रैक्शन शुरू करने से पहले एक बात तय करनी है—हमारा पूरा क्या है?",
        key: "हमारा पूरा क्या है?",
        target: "whole",
      },
      {
        id: "whole-outline",
        text: "यहाँ, किनारे से किनारे तक यह पूरी पट्टी हमारा एक पूरा है।",
        key: "पूरी पट्टी = एक पूरा",
        target: "whole",
      },
      {
        id: "parts-belong-to-whole",
        text: "आगे जितने भी हिस्से बनेंगे, वे इसी एक पूरे के हिस्से होंगे।",
        key: "हर हिस्सा इसी पूरे का",
        target: "whole",
      },
    ],
  },
  {
    id: "equal-parts",
    eyebrow: "बराबर हिस्से",
    title: "पूरे को बराबर बाँटो",
    screenKey: "4 बराबर हिस्से = 1 पूरा",
    action: "4 बराबर हिस्से बनाओ",
    evidence: "चार बराबर चौथाई मिलकर वही पूरा बनाते हैं",
    visualState: "quarters",
    narration: [
      {
        id: "make-four-parts",
        text: "अब इसी पूरे को चार हिस्सों में बाँटते हैं।",
        key: "चार हिस्से बनाएँ",
        target: "equal-parts",
      },
      {
        id: "parts-must-be-equal",
        text: "लेकिन सिर्फ चार टुकड़े होना काफी नहीं है। फ्रैक्शन में चारों हिस्से बराबर होने चाहिए।",
        key: "हर हिस्सा बराबर हो",
        target: "equal-parts",
      },
      {
        id: "quarters-rebuild-whole",
        text: "हर बराबर हिस्सा एक चौथाई है। चारों चौथाई मिलकर वही पूरा वापस बनाते हैं।",
        key: "चार चौथाई = एक पूरा",
        target: "whole",
      },
    ],
  },
  {
    id: "unit-and-denominator",
    eyebrow: "आकार पहले",
    title: "एक हिस्से का आकार देखो",
    screenKey: "एक बराबर हिस्सा = 1/4",
    action: "एक 1/4 पहचानो",
    evidence: "नीचे का 4 → पूरे के 4 बराबर हिस्से",
    visualState: "unit",
    narration: [
      {
        id: "see-one-quarter",
        text: "अब इनमें से सिर्फ एक बराबर हिस्सा देखो। यह एक चौथाई है।",
        key: "एक हिस्सा = एक चौथाई",
        target: "unit-quarter",
      },
      {
        id: "denominator-means-parts",
        text: "फ्रैक्शन में नीचे का 4 बताता है कि पूरे को चार बराबर हिस्सों में बाँटा गया था।",
        key: "नीचे का 4",
        target: "denominator",
      },
      {
        id: "name-denominator",
        text: "इसलिए उनमें से एक हिस्सा पूरे का एक चौथाई है। नीचे वाली संख्या को फ्रैक्शन का हर, यानी डिनॉमिनेटर, कहते हैं।",
        key: "हिस्सा कितना बड़ा?",
        target: "unit-quarter",
      },
    ],
  },
  {
    id: "numerator-count",
    eyebrow: "गिनती बाद में",
    title: "अब हिस्से गिनो",
    screenKey: "ऐसे 3 हिस्से = 3/4",
    action: "3 हिस्से रंगो",
    evidence: "ऊपर का 3, चुने हुए हिस्से गिनता है",
    visualState: "fraction",
    narration: [
      {
        id: "choose-like-units",
        text: "अब इसी आकार के हिस्से चुनते हैं—एक… फिर एक… फिर एक।",
        key: "एक-जैसे हिस्से चुनो",
        target: "selected-three",
      },
      {
        id: "name-numerator",
        text: "फ्रैक्शन में ऊपर का 3 बताता है कि हमने ऐसे कितने हिस्से लिए हैं। इसे अंश, यानी न्यूमरेटर, कहते हैं।",
        key: "ऊपर का 3: कितने हिस्से?",
        target: "numerator",
      },
      {
        id: "three-quarters-amount",
        text: "रँगे हुए तीनों हिस्से एक-एक चौथाई के हैं। साथ मिलकर वे तीन चौथाई बनाते हैं।",
        key: "तीन हिस्से = तीन चौथाई",
        target: "amount",
      },
    ],
  },
  {
    id: "equivalent-repartition",
    eyebrow: "रूप बदला",
    title: "हिस्से छोटे, मात्रा वही",
    screenKey: "अलग नाम · वही मात्रा",
    action: "हर 1/4 को दो में बाँटो",
    evidence: "हिस्सों का आकार बदला, रँगी हुई मात्रा नहीं",
    visualState: "eighths",
    narration: [
      {
        id: "split-each-quarter",
        text: "अब हर चौथाई के बीच एक नई रेखा बनती देखो।",
        key: "हर चौथाई को फिर बाँटो",
        target: "eighth-seams",
      },
      {
        id: "name-one-eighth",
        text: "हर चौथाई अब दो छोटे, बराबर हिस्सों में बँट गई। अब हर छोटा हिस्सा एक बटा आठ है।",
        key: "हर छोटा हिस्सा = 1/8",
        target: "eighth-unit",
      },
      {
        id: "amount-does-not-change",
        text: "फिर भी रँगी हुई मात्रा न बढ़ी, न घटी।",
        key: "रँगी मात्रा नहीं बदली",
        target: "amount",
      },
      {
        id: "equivalent-name",
        text: "हिस्से छोटे हुए और फ्रैक्शन का नाम बदला, लेकिन मात्रा बिल्कुल वही रही।",
        key: "अलग नाम, वही मात्रा",
        target: "equivalence",
      },
    ],
  },
  {
    id: "repeated-composition",
    eyebrow: "गुणा बनाती है",
    title: "एक ही हिस्सा, बार-बार",
    screenKey: "बार-बार जोड़ना = ×",
    action: "बार-बार जोड़ना छोटा लिखो",
    evidence: "? × 1/8 = 3/4",
    visualState: "multiply",
    narration: [
      {
        id: "see-one-eighth-unit",
        text: "इन छोटे हिस्सों में से एक को देखो—यह एक बटा आठ है।",
        key: "एक हिस्सा = 1/8",
        target: "eighth-unit",
      },
      {
        id: "repeat-same-unit",
        text: "इसी बराबर हिस्से को बार-बार रखने से वही रँगी हुई मात्रा बनती है।",
        key: "उसी हिस्से को दोहराओ",
        target: "eighth-units",
      },
      {
        id: "name-multiplication",
        text: "एक जैसे हिस्सों को बार-बार जोड़ने का छोटा तरीका गुणा है। इसे मल्टिप्लिकेशन भी कहते हैं।",
        key: "बार-बार जोड़ना = गुणा",
        target: "times",
      },
      {
        id: "keep-count-unknown",
        text: "ऐसे कितने हिस्से चाहिए? अभी जवाब छुपा रहने दो; अगले अभ्यास में खुद पता करेंगे।",
        key: "कितने हिस्से चाहिए?",
        target: "unknown",
      },
    ],
  },
  {
    id: "division-unknown-factor",
    eyebrow: "भाग पूछती है",
    title: "भाग क्या पूछ रहा है?",
    screenKey: "3/4 में कितने 1/8?",
    action: "सवाल को भाग में लिखो",
    evidence: "3/4 ÷ 1/8 = ? — गिनती अगले अभ्यास में बनाओगे",
    visualState: "divide",
    narration: [
      {
        id: "same-question-as-division",
        text: "अब उसी सवाल को भाग की भाषा में पूछते हैं। इसे डिविज़न भी कहते हैं।",
        key: "वही सवाल, अब भाग",
        target: "divide",
      },
      {
        id: "amount-is-given",
        text: "गुणा में हम बराबर हिस्से जोड़कर मात्रा बना रहे थे। यहाँ तीन चौथाई मात्रा पहले से दी हुई है।",
        key: "मात्रा दी हुई है",
        target: "amount",
      },
      {
        id: "group-size-is-given",
        text: "हर छोटे हिस्से का आकार एक बटा आठ है।",
        key: "एक हिस्से का आकार",
        target: "eighth-unit",
      },
      {
        id: "ask-missing-count",
        text: "सवाल है—तीन चौथाई के अंदर ऐसे कितने बराबर हिस्से समाते हैं? जवाब अभी नहीं बताएँगे; अगले अभ्यास में खुद बनाकर पक्का करेंगे।",
        key: "कितने हिस्से समाते हैं?",
        target: "unknown",
      },
    ],
  },
] as const satisfies ReadonlyArray<{
  id: string;
  eyebrow: string;
  title: string;
  screenKey: string;
  action: string;
  evidence: string;
  visualState: Exclude<FractionVisualState, "blank">;
  narration: ReadonlyArray<FractionNarrationBeat>;
}>;

export type FractionConceptStage = (typeof FRACTION_CONCEPT_STAGES)[number];

export function narrationBeatFor(stageId: string, beatId: string) {
  const stage = FRACTION_CONCEPT_STAGES.find((candidate) => candidate.id === stageId);
  return stage?.narration.find((candidate) => candidate.id === beatId) ?? null;
}

export function completedVisualState(stageIndex: number, proved: boolean): FractionVisualState {
  if (proved) return FRACTION_CONCEPT_STAGES[stageIndex]?.visualState ?? "blank";
  if (stageIndex <= 0) return "blank";
  return FRACTION_CONCEPT_STAGES[stageIndex - 1]?.visualState ?? "blank";
}

export function selectedEighthCount() {
  return FRACTION_MODEL.selectedQuarters * FRACTION_MODEL.eighthsPerQuarter;
}
