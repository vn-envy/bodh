import {
  DEFAULT_NARRATION_LANGUAGE,
  localized,
  type LocalizedText,
  type NarrationLanguage,
} from "./narration-language.ts";

export const FRACTION_MODEL = {
  quarterCount: 4,
  selectedQuarters: 3,
  eighthsPerQuarter: 2,
} as const;

export const FRACTION_NARRATION_VERSION = "fractions-v2";

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
  text: LocalizedText;
  key: LocalizedText;
  target: FractionCueTarget;
};

export type ResolvedFractionNarrationBeat = Omit<FractionNarrationBeat, "text" | "key"> & {
  text: string;
  key: string;
};

const hiEn = (hi: string, en: string): LocalizedText => ({ hi, en });

export const FRACTION_CONCEPT_STAGES = [
  {
    id: "chosen-whole",
    eyebrow: hiEn("पहली बात", "First idea"),
    title: hiEn("पहले, पूरा चुनो", "First, choose the whole"),
    screenKey: hiEn("पूरी पट्टी = एक पूरा", "The full strip = one whole"),
    action: hiEn("पूरी पट्टी चुनो", "Choose the full strip"),
    evidence: hiEn("यही पट्टी हमारा 1 पूरा है", "This strip is our one whole"),
    visualState: "whole",
    narration: [
      {
        id: "name-the-whole",
        text: hiEn(
          "फ्रैक्शन किसी पूरी चीज़ का हिस्सा बताता है। इसलिए पहले यह तय करते हैं कि हमारी पूरी चीज़ कौन-सी है।",
          "A fraction describes part of one complete thing. So first, we decide exactly what counts as our whole.",
        ),
        key: hiEn("पूरा कौन-सा है?", "What counts as the whole?"),
        target: "whole",
      },
      {
        id: "trace-the-whole",
        text: hiEn(
          "इस पट्टी के बाएँ किनारे से दाएँ किनारे तक अपनी नज़र ले जाओ। पूरी लंबाई को हम एक पूरा, यानी 1, मान रहे हैं।",
          "Trace the strip from its left edge to its right edge. We are calling that entire length one whole, or 1.",
        ),
        key: hiEn("किनारे से किनारे = 1", "Edge to edge = 1"),
        target: "whole",
      },
      {
        id: "whole-is-reference",
        text: hiEn(
          "यही पूरा हमारा मापने का आधार है। आगे हर छोटे हिस्से की तुलना इसी पूरी पट्टी से होगी।",
          "This whole is our measuring reference. Every smaller part we see next will be compared with this same strip.",
        ),
        key: hiEn("यही मापने का आधार", "Our measuring reference"),
        target: "whole",
      },
      {
        id: "hold-whole-steady",
        text: hiEn(
          "अगर पूरा बदल जाए, तो उसी आकार का टुकड़ा अलग फ्रैक्शन हो सकता है। इसलिए इस सवाल में पूरा यही पट्टी रहेगी।",
          "If the whole changes, the same-sized piece can mean a different fraction. So for this question, this strip will stay our whole.",
        ),
        key: hiEn("पूरा स्थिर रखो", "Keep the whole fixed"),
        target: "whole",
      },
    ],
  },
  {
    id: "equal-parts",
    eyebrow: hiEn("बराबर हिस्से", "Equal parts"),
    title: hiEn("पूरे को बराबर बाँटो", "Divide the whole equally"),
    screenKey: hiEn("4 बराबर हिस्से = 1 पूरा", "4 equal parts = 1 whole"),
    action: hiEn("4 बराबर हिस्से बनाओ", "Make 4 equal parts"),
    evidence: hiEn("चार बराबर चौथाई मिलकर वही पूरा बनाते हैं", "Four equal quarters rebuild the same whole"),
    visualState: "quarters",
    narration: [
      {
        id: "make-four-parts",
        text: hiEn(
          "अब इस पूरे पर बनी बँटवारे की रेखाएँ देखो। वे पट्टी को चार हिस्सों में बाँटती हैं।",
          "Now look at the dividing lines across the whole. They separate the strip into four parts.",
        ),
        key: hiEn("चार हिस्से बनाओ", "Make four parts"),
        target: "equal-parts",
      },
      {
        id: "check-equal-size",
        text: hiEn(
          "हर हिस्से की चौड़ाई ध्यान से मिलाओ। चारों हिस्से बिल्कुल एक ही आकार के हैं।",
          "Compare the width of each part carefully. All four parts are exactly the same size.",
        ),
        key: hiEn("हर हिस्सा बराबर", "Every part is equal"),
        target: "equal-parts",
      },
      {
        id: "why-equal-matters",
        text: hiEn(
          "सिर्फ चार टुकड़े होना काफी नहीं है। अगर कोई टुकड़ा बड़ा या छोटा होता, तो ये चौथाई नहीं होते।",
          "Having four pieces is not enough. If one piece were larger or smaller, the pieces would not be quarters.",
        ),
        key: hiEn("बराबरी ज़रूरी है", "Equal size matters"),
        target: "equal-parts",
      },
      {
        id: "name-one-quarter",
        text: hiEn(
          "इन चार बराबर हिस्सों में से कोई एक हिस्सा पूरे का एक चौथाई, यानी एक बटा चार, है।",
          "Any one of these four equal parts is one quarter of the whole, written as one-fourth.",
        ),
        key: hiEn("एक हिस्सा = 1/4", "One part = 1/4"),
        target: "unit-quarter",
      },
      {
        id: "quarters-rebuild-whole",
        text: hiEn(
          "चारों चौथाइयों को बिना खाली जगह और बिना चढ़ाए जोड़ो। वे फिर से वही एक पूरा भर देते हैं।",
          "Put all four quarters together with no gaps and no overlaps. They fill exactly the same whole again.",
        ),
        key: hiEn("चार चौथाई = एक पूरा", "Four quarters = one whole"),
        target: "whole",
      },
    ],
  },
  {
    id: "unit-and-denominator",
    eyebrow: hiEn("आकार पहले", "Size first"),
    title: hiEn("एक हिस्से का आकार देखो", "Notice the size of one part"),
    screenKey: hiEn("एक बराबर हिस्सा = 1/4", "One equal part = 1/4"),
    action: hiEn("एक 1/4 पहचानो", "Find one 1/4"),
    evidence: hiEn("नीचे का 4 → पूरे के 4 बराबर हिस्से", "The 4 below → 4 equal parts in the whole"),
    visualState: "unit",
    narration: [
      {
        id: "isolate-one-unit",
        text: hiEn(
          "अब बाकी हिस्सों को थोड़ी देर भूलकर सिर्फ इस एक बराबर हिस्से को देखो। यह हमारी फ्रैक्शन-इकाई है।",
          "For a moment, ignore the other parts and look only at this one equal piece. This is our fraction unit.",
        ),
        key: hiEn("एक बराबर हिस्सा", "One equal unit"),
        target: "unit-quarter",
      },
      {
        id: "read-the-denominator",
        text: hiEn(
          "एक बटा चार में नीचे लिखे 4 पर ध्यान दो। नीचे वाली संख्या को हर, या डिनॉमिनेटर, कहते हैं।",
          "In one-fourth, notice the 4 written below the fraction line. This lower number is called the denominator.",
        ),
        key: hiEn("नीचे का 4", "The 4 below"),
        target: "denominator",
      },
      {
        id: "denominator-means-partition",
        text: hiEn(
          "यह 4 बताता है कि एक पूरे को कुल चार बराबर हिस्सों में बाँटा गया है। यह चुने हुए हिस्सों की गिनती नहीं है।",
          "The 4 tells us that one whole was split into four equal parts. It does not count how many parts were chosen.",
        ),
        key: hiEn("पूरा 4 बराबर हिस्सों में", "Whole split into 4 equals"),
        target: "denominator",
      },
      {
        id: "denominator-sets-unit-size",
        text: hiEn(
          "एक ही पूरे को जितने अधिक बराबर हिस्सों में बाँटेंगे, हर हिस्सा उतना छोटा होगा। यहाँ हर हिस्सा पूरे का एक चौथाई है।",
          "When the same whole is split into more equal parts, each part becomes smaller. Here, each part is one-fourth of the whole.",
        ),
        key: hiEn("हर हिस्से का आकार", "Size of each part"),
        target: "unit-quarter",
      },
      {
        id: "unit-rebuilds-whole",
        text: hiEn(
          "ऐसी एक-चौथाई इकाइयाँ पूरी पट्टी को ठीक-ठीक भर सकती हैं। इससे हम जाँचते हैं कि इकाई का आकार सही समझा है।",
          "Units of this one-fourth size can fill the strip exactly. That is how we check that we understood the unit size.",
        ),
        key: hiEn("इकाइयाँ पूरा भरती हैं", "Units rebuild the whole"),
        target: "whole",
      },
    ],
  },
  {
    id: "numerator-count",
    eyebrow: hiEn("गिनती बाद में", "Count second"),
    title: hiEn("अब हिस्से गिनो", "Now count the parts"),
    screenKey: hiEn("ऐसे 3 हिस्से = 3/4", "3 parts like this = 3/4"),
    action: hiEn("3 हिस्से रंगो", "Shade 3 parts"),
    evidence: hiEn("ऊपर का 3, चुने हुए हिस्से गिनता है", "The 3 above counts the selected parts"),
    visualState: "fraction",
    narration: [
      {
        id: "choose-like-units",
        text: hiEn(
          "अब इसी एक-चौथाई आकार की इकाइयाँ चुनते हैं। चुनी हुई हर इकाई का आकार एक जैसा रहना चाहिए।",
          "Now we choose units of this same one-fourth size. Every chosen unit must remain the same size.",
        ),
        key: hiEn("एक-जैसी इकाइयाँ चुनो", "Choose matching units"),
        target: "selected-three",
      },
      {
        id: "count-chosen-units",
        text: hiEn(
          "रँगे हुए हिस्सों को एक-एक करके गिनो। हम हिस्सों का आकार नहीं बदल रहे; सिर्फ चुनी हुई इकाइयाँ गिन रहे हैं।",
          "Count the shaded parts one at a time. We are not changing their size; we are only counting the chosen units.",
        ),
        key: hiEn("चुने हिस्से गिनो", "Count chosen parts"),
        target: "selected-three",
      },
      {
        id: "read-the-numerator",
        text: hiEn(
          "फ्रैक्शन में ऊपर का 3 उसी गिनती को लिखता है। ऊपर वाली संख्या को अंश, या न्यूमरेटर, कहते हैं।",
          "The 3 above the fraction line records that count. This upper number is called the numerator.",
        ),
        key: hiEn("ऊपर का 3", "The 3 above"),
        target: "numerator",
      },
      {
        id: "unit-size-stays-quarter",
        text: hiEn(
          "ऊपर की संख्या बदलने से एक हिस्से का आकार नहीं बदलता। हर चुना हुआ हिस्सा अभी भी एक चौथाई है।",
          "Changing the upper number does not change the size of one part. Every chosen part is still one-fourth.",
        ),
        key: hiEn("हर इकाई अभी भी 1/4", "Each unit stays 1/4"),
        target: "unit-quarter",
      },
      {
        id: "compose-the-amount",
        text: hiEn(
          "एक-जैसी चुनी हुई इकाइयाँ साथ मिलकर रँगी हुई मात्रा बनाती हैं। फ्रैक्शन हमें इकाई का आकार और उसकी गिनती, दोनों बताता है।",
          "The equal chosen units combine to make the shaded amount. A fraction tells us both the unit size and how many units are chosen.",
        ),
        key: hiEn("इकाइयाँ मिलकर मात्रा", "Units combine into an amount"),
        target: "amount",
      },
    ],
  },
  {
    id: "equivalent-repartition",
    eyebrow: hiEn("रूप बदला", "New partition"),
    title: hiEn("हिस्से छोटे, मात्रा वही", "Smaller parts, same amount"),
    screenKey: hiEn("अलग नाम · वही मात्रा", "Different name · same amount"),
    action: hiEn("हर 1/4 को दो में बाँटो", "Split every 1/4 in two"),
    evidence: hiEn("हिस्सों का आकार बदला, रँगी हुई मात्रा नहीं", "Part size changed; the shaded amount did not"),
    visualState: "eighths",
    narration: [
      {
        id: "add-new-seams",
        text: hiEn(
          "अब हर चौथाई के बीच एक नई रेखा बनती देखो। रेखा पुराने हिस्से को दो छोटे बराबर हिस्सों में बाँटती है।",
          "Watch a new line appear through each quarter. Each line splits the old part into two smaller equal parts.",
        ),
        key: hiEn("नई बँटवारे की रेखाएँ", "New dividing lines"),
        target: "eighth-seams",
      },
      {
        id: "check-new-parts-equal",
        text: hiEn(
          "नई रेखाएँ हर चौथाई पर एक ही जगह बनी हैं। इसलिए पूरे में बने सभी छोटे हिस्से भी एक-जैसे आकार के हैं।",
          "Each new line is placed in the same position inside every quarter. So all the new smaller parts across the whole are equal in size.",
        ),
        key: hiEn("सभी नए हिस्से बराबर", "All new parts are equal"),
        target: "eighth-seams",
      },
      {
        id: "name-one-eighth",
        text: hiEn(
          "अब पूरा आठ बराबर हिस्सों में बँटा है। इसलिए ऐसा एक छोटा हिस्सा पूरे का एक बटा आठ है।",
          "The whole is now divided into eight equal parts. So one small part is one-eighth of the whole.",
        ),
        key: hiEn("एक छोटा हिस्सा = 1/8", "One small part = 1/8"),
        target: "eighth-unit",
      },
      {
        id: "amount-stays-invariant",
        text: hiEn(
          "रँगी हुई जगह को देखो। हमने केवल उसके अंदर नई रेखाएँ जोड़ी हैं; न रंग बढ़ा है, न घटा है।",
          "Look at the shaded region. We only added new lines inside it; no shaded amount was added or removed.",
        ),
        key: hiEn("मात्रा नहीं बदली", "The amount did not change"),
        target: "amount",
      },
      {
        id: "equivalent-name-stays-unknown",
        text: hiEn(
          "इसलिए वही मात्रा चौथाइयों में भी लिखी जा सकती है और आठवें हिस्सों में भी। आठवें हिस्सों की गिनती अभी खाली रहने दो—उसे तुम खुद बनाओगे।",
          "So the same amount can be named in quarters or in eighths. Leave the number of eighths blank for now—you will build and discover it yourself.",
        ),
        key: hiEn("अलग नाम · वही मात्रा", "Different name · same amount"),
        target: "equivalence",
      },
    ],
  },
  {
    id: "repeated-composition",
    eyebrow: hiEn("गुणा बनाती है", "Multiplication builds"),
    title: hiEn("एक ही हिस्सा, बार-बार", "The same unit, repeated"),
    screenKey: hiEn("बार-बार जोड़ना = ×", "Repeated addition = ×"),
    action: hiEn("बार-बार जोड़ना छोटा लिखो", "Write the repetition briefly"),
    evidence: hiEn("? × 1/8 = 3/4", "? × 1/8 = 3/4"),
    visualState: "multiply",
    narration: [
      {
        id: "see-one-eighth-unit",
        text: hiEn(
          "इन छोटे हिस्सों में से सिर्फ एक पर ध्यान दो। हर बार हम इसी एक बटा आठ आकार की इकाई इस्तेमाल करेंगे।",
          "Focus on just one of the small parts. Each time, we will use a unit of this same one-eighth size.",
        ),
        key: hiEn("हमारी इकाई = 1/8", "Our unit = 1/8"),
        target: "eighth-unit",
      },
      {
        id: "repeat-same-unit",
        text: hiEn(
          "अब उसी इकाई की प्रतियाँ एक-एक करके रखो। हर नई प्रति रँगी हुई मात्रा का अगला बराबर टुकड़ा भरती है।",
          "Now place copies of that unit one at a time. Each new copy fills the next equal piece of the shaded amount.",
        ),
        key: hiEn("उसी इकाई को दोहराओ", "Repeat the same unit"),
        target: "eighth-units",
      },
      {
        id: "require-no-gaps-overlaps",
        text: hiEn(
          "सही गिनती के लिए इकाइयों के बीच खाली जगह नहीं होनी चाहिए और कोई इकाई दूसरी पर चढ़नी नहीं चाहिए।",
          "For the count to be correct, there must be no gaps between the units and no unit may overlap another.",
        ),
        key: hiEn("न खाली जगह · न चढ़ाव", "No gaps · no overlaps"),
        target: "eighth-units",
      },
      {
        id: "name-repeated-addition",
        text: hiEn(
          "एक ही आकार की इकाई को बार-बार जोड़ना लंबा लिखा जा सकता है। गुणा उसी दोहराव को छोटा और साफ लिखता है।",
          "We could write the same-sized unit as repeated addition. Multiplication is a shorter, clearer way to record that repetition.",
        ),
        key: hiEn("बार-बार जोड़ना = गुणा", "Repeated addition = multiply"),
        target: "times",
      },
      {
        id: "missing-factor-is-count",
        text: hiEn(
          "सवालिया निशान उस गिनती की जगह है जो अभी हमें खोजनी है। वह पूछता है: एक बटा आठ को कितनी बार रखने से दी हुई मात्रा बनेगी?",
          "The question mark stands for the count we still need to discover. It asks: how many copies of one-eighth will make the given amount?",
        ),
        key: hiEn("? = इकाइयों की गिनती", "? = number of units"),
        target: "unknown",
      },
    ],
  },
  {
    id: "division-unknown-factor",
    eyebrow: hiEn("भाग पूछती है", "Division asks"),
    title: hiEn("भाग क्या पूछ रहा है?", "What is division asking?"),
    screenKey: hiEn("3/4 में कितने 1/8?", "How many 1/8 units fit in 3/4?"),
    action: hiEn("सवाल को भाग में लिखो", "Write the question as division"),
    evidence: hiEn("3/4 ÷ 1/8 = ? — गिनती अगले अभ्यास में बनाओगे", "3/4 ÷ 1/8 = ? — build the count in the next activity"),
    visualState: "divide",
    narration: [
      {
        id: "same-question-as-division",
        text: hiEn(
          "अब इसी missing-count सवाल को भाग की भाषा में लिखते हैं। भाग यहाँ चीज़ें बाँटने से अधिक, दी हुई मात्रा में बराबर इकाइयाँ खोज रहा है।",
          "Now we write the same missing-count question in division form. Here, division is looking for equal units inside a given amount.",
        ),
        key: hiEn("वही सवाल, भाग की भाषा", "Same question, division form"),
        target: "divide",
      },
      {
        id: "amount-is-given",
        text: hiEn(
          "तीन चौथाई वह पूरी रँगी हुई मात्रा है जिसे हमें ठीक-ठीक भरना है। यह सवाल में पहले से दी हुई है।",
          "Three-fourths is the entire shaded amount we need to fill exactly. It is already given in the question.",
        ),
        key: hiEn("दी हुई मात्रा = 3/4", "Given amount = 3/4"),
        target: "amount",
      },
      {
        id: "group-size-is-given",
        text: hiEn(
          "एक बटा आठ बताता है कि गिनने वाली हर छोटी इकाई कितनी बड़ी है। हर बार इसी आकार की इकाई लेनी है।",
          "One-eighth tells us the size of every small unit we will count. We must use this same unit size each time.",
        ),
        key: hiEn("हर इकाई = 1/8", "Each unit = 1/8"),
        target: "eighth-unit",
      },
      {
        id: "quotient-is-missing-count",
        text: hiEn(
          "बराबर के बाद का सवालिया निशान किसी नई मात्रा का नाम नहीं है। वह पूछ रहा है कि दी हुई मात्रा के अंदर ऐसी कितनी इकाइयाँ समाती हैं।",
          "The question mark after the equals sign is not naming a new amount. It asks how many units of that size fit inside the given amount.",
        ),
        key: hiEn("भाग का जवाब = कितनी इकाइयाँ", "Quotient = how many units"),
        target: "unknown",
      },
      {
        id: "connect-multiply-and-divide",
        text: hiEn(
          "गुणा पूछता था कि इकाई को बार-बार रखने से कौन-सी मात्रा बनती है। भाग उसी संबंध को पीछे से पढ़कर इकाइयों की गिनती पूछता है।",
          "Multiplication asked what amount repeated units make. Division reads the same relationship from the other direction and asks for the number of units.",
        ),
        key: hiEn("गुणा और भाग जुड़े हैं", "Multiply and divide connect"),
        target: "divide",
      },
      {
        id: "handoff-to-lab",
        text: hiEn(
          "अब अनुमान मत लगाओ। एक बटा आठ की इकाइयाँ एक-एक करके रखो, मात्रा को ठीक भरने दो, और उसके बाद ही गिनती बोलो।",
          "Do not guess. Place one-eighth units one at a time, fill the amount exactly, and only then say the count.",
        ),
        key: hiEn("अब बनाओ, फिर गिनो", "Build first, then count"),
        target: "unknown",
      },
    ],
  },
] as const satisfies ReadonlyArray<{
  id: string;
  eyebrow: LocalizedText;
  title: LocalizedText;
  screenKey: LocalizedText;
  action: LocalizedText;
  evidence: LocalizedText;
  visualState: Exclude<FractionVisualState, "blank">;
  narration: ReadonlyArray<FractionNarrationBeat>;
}>;

export type FractionConceptStage = (typeof FRACTION_CONCEPT_STAGES)[number];

export function resolveNarrationBeat(
  beat: FractionNarrationBeat,
  language: NarrationLanguage,
): ResolvedFractionNarrationBeat {
  return { id: beat.id, target: beat.target, text: localized(beat.text, language), key: localized(beat.key, language) };
}

export function narrationBeatFor(
  stageId: string,
  beatId: string,
  language: NarrationLanguage = DEFAULT_NARRATION_LANGUAGE,
) {
  const stage = FRACTION_CONCEPT_STAGES.find((candidate) => candidate.id === stageId);
  const beat = stage?.narration.find((candidate) => candidate.id === beatId);
  return beat ? resolveNarrationBeat(beat, language) : null;
}

export function completedVisualState(stageIndex: number, proved: boolean): FractionVisualState {
  if (proved) return FRACTION_CONCEPT_STAGES[stageIndex]?.visualState ?? "blank";
  if (stageIndex <= 0) return "blank";
  return FRACTION_CONCEPT_STAGES[stageIndex - 1]?.visualState ?? "blank";
}

export function selectedEighthCount() {
  return FRACTION_MODEL.selectedQuarters * FRACTION_MODEL.eighthsPerQuarter;
}
