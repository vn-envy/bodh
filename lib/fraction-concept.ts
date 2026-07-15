export const FRACTION_MODEL = {
  quarterCount: 4,
  selectedQuarters: 3,
  eighthsPerQuarter: 2,
} as const;

export type FractionVisualState =
  | "blank"
  | "whole"
  | "quarters"
  | "unit"
  | "fraction"
  | "eighths"
  | "multiply"
  | "divide";

export const FRACTION_CONCEPT_STAGES = [
  {
    id: "chosen-whole",
    eyebrow: "WHOLE तय करो",
    title: "Fraction किस पूरे की बात कर रहा है?",
    mentor: "Fraction की कहानी से पहले तय करें कि हमारा एक पूरा क्या है।",
    action: "पूरी पट्टी चुनो",
    evidence: "यह पूरी पट्टी = 1 whole",
    visualState: "whole",
  },
  {
    id: "equal-parts",
    eyebrow: "बराबर हिस्से",
    title: "अब उसी whole को बराबर बाँटो।",
    mentor: "Fraction के हिस्से बराबर होते हैं—चारों हिस्से मिलकर फिर वही whole बनाते हैं।",
    action: "4 बराबर हिस्से बनाओ",
    evidence: "1/4 + 1/4 + 1/4 + 1/4 = 1 whole",
    visualState: "quarters",
  },
  {
    id: "unit-and-denominator",
    eyebrow: "SIZE पहले",
    title: "एक हिस्सा हमारी unit है।",
    mentor: "नीचे का 4 बताता है कि इसी whole के 4 बराबर हिस्से हैं। इसलिए हर unit का size 1/4 है।",
    action: "एक 1/4 पहचानो",
    evidence: "हर (denominator) = 4 बराबर हिस्से",
    visualState: "unit",
  },
  {
    id: "numerator-count",
    eyebrow: "COUNT बाद में",
    title: "अब उसी size के हिस्से गिनो।",
    mentor: "ऊपर का 3 बताता है कि हम 1/4 size के तीन हिस्से ले रहे हैं।",
    action: "3 हिस्से रंगो",
    evidence: "अंश (numerator) = 3 units → 3/4",
    visualState: "fraction",
  },
  {
    id: "equivalent-repartition",
    eyebrow: "रूप बदला, मात्रा नहीं",
    title: "हर quarter को फिर दो बराबर pieces में बाँटो।",
    mentor: "Pieces छोटी हुईं और उनका नाम बदला—लेकिन peach वाली मात्रा बिल्कुल वही रही।",
    action: "हर 1/4 को दो में बाँटो",
    evidence: "3/4 का नाम eighths में भी लिखा जा सकता है",
    visualState: "eighths",
  },
  {
    id: "repeated-composition",
    eyebrow: "MULTIPLICATION बनाती है",
    title: "एक ही 1/8 को बार-बार जोड़ो।",
    mentor: "Repeated addition को multiplication छोटा करके लिखती है। Missing number अभी तुम खोजोगे।",
    action: "बार-बार जोड़ना छोटा लिखो",
    evidence: "? × 1/8 = 3/4",
    visualState: "multiply",
  },
  {
    id: "division-unknown-factor",
    eyebrow: "DIVISION पूछती है",
    title: "अब उसी missing count को उल्टा पूछो।",
    mentor: "3/4 के अंदर 1/8 size के कितने groups fit होते हैं? यही division का meaning है।",
    action: "Equation को division में पलटो",
    evidence: "3/4 ÷ 1/8 = ? — जवाब तुम अगले lab में बनाओगे",
    visualState: "divide",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  eyebrow: string;
  title: string;
  mentor: string;
  action: string;
  evidence: string;
  visualState: Exclude<FractionVisualState, "blank">;
}>;

export type FractionConceptStage = (typeof FRACTION_CONCEPT_STAGES)[number];

export function completedVisualState(stageIndex: number, proved: boolean): FractionVisualState {
  if (proved) return FRACTION_CONCEPT_STAGES[stageIndex]?.visualState ?? "blank";
  if (stageIndex <= 0) return "blank";
  return FRACTION_CONCEPT_STAGES[stageIndex - 1]?.visualState ?? "blank";
}

export function selectedEighthCount() {
  return FRACTION_MODEL.selectedQuarters * FRACTION_MODEL.eighthsPerQuarter;
}
