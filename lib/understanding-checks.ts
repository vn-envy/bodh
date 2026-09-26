import {
  divide,
  fraction,
  formatFraction,
  formatMixed,
  gcd,
  multiply,
} from "./fraction-math.ts";
import type { LocalizedText } from "./narration-language";
import type { EvidenceIndex } from "./understanding-curriculum";

/**
 * Understanding checks for the Climb. Every check is anchored to exactly one
 * Marble evidence statement (topic id + evidence index). Maths checks are
 * generated from small reviewed parameter pools and their keys are computed
 * with exact rational arithmetic; science checks are authored. No model output
 * ever enters a check, an answer key, or the interface.
 */

const hiEn = (hi: string, en: string): LocalizedText => ({ hi, en });
const same = (text: string): LocalizedText => ({ hi: text, en: text });

export type CheckFacet = "see" | "explain" | "apply" | "reverse";

export const FACET_COPY: Readonly<Record<CheckFacet, LocalizedText>> = {
  see: hiEn("देखो और दिखाओ", "See it"),
  explain: hiEn("क्यों? समझाओ", "Explain why"),
  apply: hiEn("नई जगह लगाओ", "Use it somewhere new"),
  reverse: hiEn("उल्टा जाँचो", "Check it backwards"),
};

export type ScienceSceneId =
  | "rain-cloud"
  | "sun-puddle"
  | "wet-clothes"
  | "two-puddles"
  | "cycle"
  | "thermometer"
  | "cumulus"
  | "stratus"
  | "cirrus"
  | "cold-glass"
  | "mirror"
  | "ice-melt"
  | "freezer-tray"
  | "sugar-tea"
  | "sand-water"
  | "salt-water"
  | "ocean-share"
  | "particles";

export type CheckVisual =
  /** Wholes laid out in a row; the first `shaded` parts are coloured, spilling across wholes. */
  | Readonly<{ kind: "bar"; wholes: number; parts: number; shaded: number }>
  /** Several separate wholes, each with the same number of shaded parts. */
  | Readonly<{ kind: "groups"; wholes: number; parts: number; shadedEach: number }>
  /** One whole in `parts`; the first part is split into `split` equal mini-pieces. */
  | Readonly<{ kind: "split"; parts: number; split: number }>
  | Readonly<{ kind: "area"; rows: number; cols: number; rowsShaded: number; colsShaded: number }>
  /** `wholes` bars each cut into `people` pieces and dealt out one piece per person per bar. */
  | Readonly<{ kind: "share"; wholes: number; people: number }>
  | Readonly<{ kind: "dots"; total: number; groupSize: number }>
  | Readonly<{ kind: "expression"; text: string }>
  | Readonly<{ kind: "scene"; scene: ScienceSceneId; value?: number }>;

export type CheckOption = Readonly<{
  id: string;
  label: LocalizedText;
  correct: boolean;
  misconceptionId: MisconceptionId | null;
  why: LocalizedText | null;
  visual: CheckVisual | null;
}>;

export type OrderTile = Readonly<{ id: string; label: LocalizedText }>;

export type CheckResponse =
  | Readonly<{ kind: "choice"; options: readonly CheckOption[] }>
  | Readonly<{ kind: "shade"; parts: number; target: number }>
  | Readonly<{ kind: "hops"; denominator: number; max: number; target: number }>
  /** `tiles` are in the correct order; `display` is the shuffled presentation order. */
  | Readonly<{ kind: "order"; tiles: readonly OrderTile[]; display: readonly string[] }>;

export type UnderstandingCheck = Readonly<{
  id: string;
  topicId: string;
  evidenceIndex: EvidenceIndex;
  variant: number;
  facet: CheckFacet;
  prompt: LocalizedText;
  visual: CheckVisual | null;
  response: CheckResponse;
  hint: LocalizedText;
  explanation: LocalizedText;
}>;

export type CheckAnswer =
  | Readonly<{ kind: "choice"; optionId: string }>
  | Readonly<{ kind: "shade"; shaded: readonly number[] }>
  | Readonly<{ kind: "hops"; hops: number }>
  | Readonly<{ kind: "order"; tileIds: readonly string[] }>;

export type CheckOutcome = Readonly<{
  correct: boolean;
  misconceptionId: MisconceptionId | null;
  why: LocalizedText | null;
}>;

/**
 * Named, child-safe misconception signals. `rootTopicId` is the Marble topic
 * where Bodh repairs the idea; null means "stay here and try another check".
 */
export const MISCONCEPTIONS = {
  "part-to-part": {
    label: hiEn("रँगे हिस्से की तुलना बाकी हिस्सों से, पूरे से नहीं", "Comparing with the other parts instead of the whole"),
    rootTopicId: "mt_ndGqFPWyen",
  },
  "counted-unshaded-parts": {
    label: hiEn("बिना रँगे हिस्से गिनना", "Counting the unshaded parts"),
    rootTopicId: "mt_ndGqFPWyen",
  },
  "fraction-as-two-whole-numbers": {
    label: hiEn("Fraction को दो अलग whole numbers समझना", "Treating a fraction as two separate whole numbers"),
    rootTopicId: "mt_ndGqFPWyen",
  },
  "unequal-parts-accepted": {
    label: hiEn("यह भूलना कि हिस्से बराबर होने चाहिए", "Forgetting that the parts must be equal"),
    rootTopicId: "mt_ndGqFPWyen",
  },
  "unit-fraction-size-confusion": {
    label: hiEn("बड़े denominator को बड़ा हिस्सा समझना", "Thinking a bigger denominator means a bigger piece"),
    rootTopicId: "mt_ndGqFPWyen",
  },
  "numerator-denominator-confused": {
    label: hiEn("ऊपर और नीचे वाले number का काम उलझना", "Mixing up the jobs of the top and bottom numbers"),
    rootTopicId: "mt_ndGqFPWyen",
  },
  "improper-fraction-impossible": {
    label: hiEn("सोचना कि fraction 1 से बड़ा नहीं हो सकता", "Believing a fraction cannot be more than 1"),
    rootTopicId: "mt_09sySPqM9Z",
  },
  "multiplying-both-parts": {
    label: hiEn("Whole से multiply करते समय नीचे वाले number को भी multiply करना", "Multiplying the denominator too when multiplying by a whole number"),
    rootTopicId: "mt_09sySPqM9Z",
  },
  "partial-multiplication": {
    label: hiEn("Mixed number का सिर्फ एक हिस्सा multiply करना", "Multiplying only one part of a mixed number"),
    rootTopicId: "mt_TgHxujL81r",
  },
  "counted-all-shaded": {
    label: hiEn("Area model में सिर्फ overlap की जगह हर रँगा cell गिनना", "Counting every shaded cell instead of only the overlap"),
    rootTopicId: null,
  },
  "not-fully-simplified": {
    label: hiEn("Simplest form तक न पहुँचना", "Stopping before the simplest form"),
    rootTopicId: null,
  },
  "subtracted-to-simplify": {
    label: hiEn("Simplify करने के लिए घटाना", "Subtracting to simplify"),
    rootTopicId: "mt_ndGqFPWyen",
  },
  "fraction-not-division": {
    label: hiEn("Fraction और division का रिश्ता न देखना", "Not seeing that a fraction is a division"),
    rootTopicId: "mt_4Km38F4L-6",
  },
  "dividend-divisor-role-confusion": {
    label: hiEn("क्या बाँटा जा रहा है और किससे—यह उलझना", "Mixing up what is divided and what it is divided by"),
    rootTopicId: "mt_iNdrM2-oJf",
  },
  "ignored-number-of-wholes": {
    label: hiEn("सिर्फ एक whole को बाँटना, सारे wholes को नहीं", "Sharing only one whole instead of all of them"),
    rootTopicId: "mt_4Km38F4L-6",
  },
  "division-always-makes-smaller": {
    label: hiEn("सोचना कि division हमेशा छोटा करती है", "Believing division always makes things smaller"),
    rootTopicId: "mt_iNdrM2-oJf",
  },
  "reciprocal-rule-without-meaning": {
    label: hiEn("Flip rule याद है, meaning नहीं", "Remembering the flip rule without its meaning"),
    rootTopicId: "mt_GDG9_SZmsO",
  },
  "multiplied-instead-of-divided": {
    label: hiEn("Divide की जगह multiply करना", "Multiplying where the story divides"),
    rootTopicId: "mt_iNdrM2-oJf",
  },
  "operation-guessing": {
    label: hiEn("Story पढ़े बिना operation चुनना", "Picking an operation without reading the story"),
    rootTopicId: "mt_iNdrM2-oJf",
  },
  "one-meaning-of-division": {
    label: hiEn("Division का सिर्फ एक meaning मानना", "Knowing only one meaning of division"),
    rootTopicId: "mt_iNdrM2-oJf",
  },
  "unknown-factor-not-connected": {
    label: hiEn("Division को उसकी multiplication से न जोड़ना", "Not connecting division to its multiplication"),
    rootTopicId: "mt_GDG9_SZmsO",
  },
  "water-disappears-when-dry": {
    label: hiEn("सोचना कि सूखने पर पानी खत्म हो जाता है", "Believing water is destroyed when it dries"),
    rootTopicId: "mt_TlLE4cZgOr",
  },
  "water-only-underground": {
    label: hiEn("सोचना कि सूखता पानी सिर्फ ज़मीन में जाता है", "Believing drying water only soaks into the ground"),
    rootTopicId: "mt_TlLE4cZgOr",
  },
  "rain-source-unknown": {
    label: hiEn("बारिश को बादलों से न जोड़ना", "Not linking rain to clouds"),
    rootTopicId: "mt_TlLE4cZgOr",
  },
  "cloud-is-smoke": {
    label: hiEn("बादल को धुआँ या रुई समझना", "Thinking clouds are smoke or cotton"),
    rootTopicId: "mt_IhWzO4sQPg",
  },
  "clouds-are-vapour": {
    label: hiEn("बादल को invisible जलवाष्प समझना", "Thinking clouds are invisible vapour, not droplets"),
    rootTopicId: "mt_IhWzO4sQPg",
  },
  "condensation-link-missing": {
    label: hiEn("ठंडी सतह पर बूँदों को हवा की जलवाष्प से न जोड़ना", "Not linking droplets on cold things to vapour in the air"),
    rootTopicId: "mt_IhWzO4sQPg",
  },
  "cloud-types-mixed": {
    label: hiEn("बादलों के प्रकार उलझना", "Mixing up cloud types"),
    rootTopicId: null,
  },
  "temperature-meaning-confused": {
    label: hiEn("तापमान को किसी और माप से उलझाना", "Confusing temperature with another measure"),
    rootTopicId: "mt_PrWc-HZzDl",
  },
  "temperature-words-mismatched": {
    label: hiEn("Reading और गरम/ठंडा शब्द न मिलाना", "Not matching a reading to hot, warm, cool, or cold"),
    rootTopicId: "mt_PrWc-HZzDl",
  },
  "ice-is-not-water": {
    label: hiEn("सोचना कि बर्फ पानी नहीं है", "Believing ice is not water"),
    rootTopicId: "mt_nRF_VRntrW",
  },
  "water-only-visible-liquid": {
    label: hiEn("सिर्फ दिखने वाले तरल पानी को पानी मानना", "Counting only visible liquid water"),
    rootTopicId: "mt_nRF_VRntrW",
  },
  "melt-freeze-reversed": {
    label: hiEn("पिघलना और जमना उलटा समझना", "Reversing melting and freezing"),
    rootTopicId: "mt_Pl-nsjYGZ3",
  },
  "heat-slows-particles": {
    label: hiEn("सोचना कि गरमी से कण धीमे या बड़े होते हैं", "Believing heat slows particles or makes them grow"),
    rootTopicId: "mt_Pl-nsjYGZ3",
  },
  "melt-dissolve-confused": {
    label: hiEn("घुलना और पिघलना एक समझना", "Treating dissolving and melting as the same"),
    rootTopicId: "mt_ahSqW_kK1b",
  },
  "evaporation-condensation-confused": {
    label: hiEn("Evaporation और condensation उलझना", "Mixing up evaporation and condensation"),
    rootTopicId: "mt_ahSqW_kK1b",
  },
  "cycle-has-start-end": {
    label: hiEn("जल चक्र को शुरू और अंत वाली line समझना", "Seeing the water cycle as a line with a start and an end"),
    rootTopicId: "mt_fhqVdj4BYr",
  },
  "evaporation-requires-boiling": {
    label: hiEn("सोचना कि पानी सिर्फ उबलकर भाप बनता है", "Believing water only becomes vapour when it boils"),
    rootTopicId: "mt_Pl-nsjYGZ3",
  },
  "temperature-rate-unlinked": {
    label: hiEn("गरमी को सूखने की गति से न जोड़ना", "Not linking warmth to how fast water evaporates"),
    rootTopicId: "mt_PrWc-HZzDl",
  },
} as const satisfies Record<string, Readonly<{ label: LocalizedText; rootTopicId: string | null }>>;

export type MisconceptionId = keyof typeof MISCONCEPTIONS;

export function isMisconceptionId(value: unknown): value is MisconceptionId {
  return typeof value === "string" && Object.hasOwn(MISCONCEPTIONS, value);
}

type DraftOption = Readonly<{
  label: LocalizedText;
  correct: boolean;
  misconceptionId?: MisconceptionId;
  why?: LocalizedText;
  visual?: CheckVisual;
}>;

type DraftResponse =
  | Readonly<{ kind: "choice"; options: readonly DraftOption[] }>
  | Readonly<{ kind: "shade"; parts: number; target: number }>
  | Readonly<{ kind: "hops"; denominator: number; max: number; target: number }>
  | Readonly<{ kind: "order"; tiles: readonly LocalizedText[] }>;

type CheckDraft = Readonly<{
  facet: CheckFacet;
  prompt: LocalizedText;
  visual?: CheckVisual;
  response: DraftResponse;
  hint: LocalizedText;
  explanation: LocalizedText;
}>;

type CheckGenerator = (variant: number) => CheckDraft;

const right = (label: LocalizedText | string, extras: Omit<DraftOption, "label" | "correct"> = {}): DraftOption => ({
  label: typeof label === "string" ? same(label) : label,
  correct: true,
  ...extras,
});

const wrong = (
  label: LocalizedText | string,
  misconceptionId: MisconceptionId,
  why: LocalizedText,
  visual?: CheckVisual,
): DraftOption => ({
  label: typeof label === "string" ? same(label) : label,
  correct: false,
  misconceptionId,
  why,
  visual,
});

const choice = (...options: DraftOption[]): DraftResponse => ({ kind: "choice", options });

function pick<T>(pool: readonly T[], variant: number) {
  const size = pool.length;
  return pool[((variant % size) + size) % size];
}

function hashString(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededOrder<T>(items: readonly T[], seed: string) {
  let state = hashString(seed) || 1;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(next() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

const who = (kabir: LocalizedText, meera: LocalizedText) =>
  hiEn(`Kabir: “${kabir.hi}”\nMeera: “${meera.hi}”\nकौन सही है?`, `Kabir: “${kabir.en}”\nMeera: “${meera.en}”\nWho is right?`);

const frac = (n: number, d: number) => formatFraction(fraction(n, d));
const mixed = (n: number, d: number) => formatMixed(fraction(n, d));

/* ------------------------------------------------------------------------ */
/* Mathematics: fractions and division                                       */
/* ------------------------------------------------------------------------ */

const MATH_GENERATORS: Readonly<Record<string, readonly [CheckGenerator, CheckGenerator, CheckGenerator]>> = {
  // Fractions of a whole
  "mt_ndGqFPWyen": [
    (variant) => {
      const b = pick([5, 3, 6, 8, 4, 10], variant);
      return {
        facet: "see",
        prompt: hiEn(`यह bar ${b} बराबर हिस्सों में बँटा है। रँगा हिस्सा पूरे का कितना है?`, `This bar is cut into ${b} equal parts. What fraction of the whole is shaded?`),
        visual: { kind: "bar", wholes: 1, parts: b, shaded: 1 },
        response: choice(
          right(`1/${b}`),
          wrong(`1/${b - 1}`, "part-to-part", hiEn(`1/${b - 1} रँगे हिस्से की तुलना बाकी ${b - 1} हिस्सों से करता है। Fraction हमेशा पूरे से तुलना करता है।`, `1/${b - 1} compares the shaded part with the other ${b - 1} parts. A fraction always compares with the whole.`)),
          wrong(`${b - 1}/${b}`, "counted-unshaded-parts", hiEn(`${b - 1}/${b} बिना रँगे हिस्से गिनता है। सवाल रँगे हिस्से के बारे में है।`, `${b - 1}/${b} counts the unshaded parts. The question is about the shaded part.`)),
        ),
        hint: hiEn("पहले पूरे bar के सारे हिस्से गिनो—वही नीचे वाला number बनेगा।", "First count every part in the whole bar—that becomes the bottom number."),
        explanation: hiEn(`पूरा ${b} बराबर हिस्सों में बँटा है और 1 रँगा है, इसलिए 1/${b}। नीचे का ${b} हिस्से का size बताता है; ऊपर का 1 गिनती।`, `The whole is cut into ${b} equal parts and 1 is shaded, so it is 1/${b}. The bottom ${b} names the part size; the top 1 counts.`),
      };
    },
    (variant) => {
      const [a, b] = pick([[3, 4], [2, 5], [5, 6], [3, 8], [4, 7]] as const, variant);
      return {
        facet: "explain",
        prompt: who(
          hiEn(`${a}/${b} का मतलब ${b} में से ${a} टुकड़े—टुकड़े किसी भी size के हों।`, `${a}/${b} means ${a} pieces out of ${b}—the pieces can be any size.`),
          hiEn(`${a}/${b} का मतलब ${a} हिस्से, और हर हिस्सा पूरे का ठीक 1/${b}।`, `${a}/${b} means ${a} parts, and each part is exactly 1/${b} of the whole.`),
        ),
        visual: { kind: "bar", wholes: 1, parts: b, shaded: a },
        response: choice(
          right(hiEn("Meera", "Meera")),
          wrong(hiEn("Kabir", "Kabir"), "unequal-parts-accepted", hiEn(`अगर टुकड़े अलग-अलग size के हों, तो वे 1/${b} नहीं रहते। नीचे का ${b} बराबर हिस्सों का size बताता है।`, `If the pieces had different sizes, they would not be 1/${b} each. The bottom ${b} names equal-sized parts.`)),
          wrong(hiEn("दोनों—एक ही बात है", "Both—it is the same idea"), "unequal-parts-accepted", hiEn("दोनों बातें अलग हैं: Kabir बराबरी भूल गया। बराबर हिस्से ही fraction को meaning देते हैं।", "The two ideas differ: Kabir forgot equal size. Equal parts are what give a fraction its meaning.")),
        ),
        hint: hiEn(`सोचो: अगर एक टुकड़ा बहुत बड़ा हो, तो क्या वह अभी भी 1/${b} होगा?`, `Think: if one piece were much bigger, would it still be 1/${b}?`),
        explanation: hiEn(`${a}/${b} = 1/${b} size के ${a} हिस्से। Denominator हिस्से का size तय करता है, numerator उन्हें गिनता है।`, `${a}/${b} is ${a} parts of size 1/${b}. The denominator fixes the part size; the numerator counts the parts.`),
      };
    },
    (variant) => {
      const [a, b] = pick([[2, 6], [3, 5], [4, 8], [1, 3], [5, 10], [3, 4]] as const, variant);
      return {
        facet: "see",
        prompt: hiEn(`Bar के हिस्सों पर tap करके ${a}/${b} बनाओ।`, `Tap parts of the bar to build ${a}/${b}.`),
        response: { kind: "shade", parts: b, target: a },
        hint: hiEn(`Bar पहले से ${b} बराबर हिस्सों में कटा है। अब सिर्फ गिनती वाला number देखो।`, `The bar is already cut into ${b} equal parts. Now look only at the counting number.`),
        explanation: hiEn(`${b} में कटे whole के ${a} हिस्से = ${a}/${b}। कौन-से हिस्से रँगे, इससे फर्क नहीं पड़ता—गिनती और size से पड़ता है।`, `${a} pieces of a whole cut into ${b} make ${a}/${b}. Which pieces you shade does not matter—the count and the size do.`),
      };
    },
  ],

  // Understanding fractions: a/b as a sum of 1/b
  "mt_09sySPqM9Z": [
    (variant) => {
      const [a, b] = pick([[5, 8], [3, 5], [4, 6], [3, 7], [4, 9]] as const, variant);
      const repeat = (count: number, unit: string) => Array.from({ length: count }, () => unit).join(" + ");
      return {
        facet: "see",
        prompt: hiEn(`कौन-सा जोड़ ${a}/${b} के बराबर है?`, `Which sum is equal to ${a}/${b}?`),
        visual: { kind: "bar", wholes: 1, parts: b, shaded: a },
        response: choice(
          right(repeat(a, `1/${b}`)),
          wrong(repeat(b, `1/${b}`), "numerator-denominator-confused", hiEn(`यह ${b} copies हैं—यानी पूरा whole। ${a}/${b} में ऊपर का ${a} copies गिनता है।`, `That is ${b} copies—the entire whole. In ${a}/${b}, the top ${a} counts the copies.`)),
          wrong(`1/${a} + 1/${b}`, "fraction-as-two-whole-numbers", hiEn(`${a} और ${b} दो अलग fractions नहीं बनाते। ${a}/${b} एक ही size (1/${b}) के ${a} हिस्से हैं।`, `${a} and ${b} do not make two separate fractions. ${a}/${b} is ${a} parts of one size, 1/${b}.`)),
        ),
        hint: hiEn(`Picture में हर रँगा हिस्सा 1/${b} है। कितने रँगे हैं?`, `In the picture each shaded part is 1/${b}. How many are shaded?`),
        explanation: hiEn(`${a}/${b} = ${a} बार 1/${b}। Fraction एक unit (1/${b}) और उसकी गिनती (${a}) का छोटा नाम है।`, `${a}/${b} is 1/${b} taken ${a} times. A fraction is a short name for a unit (1/${b}) and its count (${a}).`),
      };
    },
    (variant) => {
      const [a, b] = pick([[4, 3], [5, 4], [7, 6], [3, 2], [5, 3]] as const, variant);
      return {
        facet: "see",
        prompt: hiEn(`0 से शुरू करो। हर tap = 1/${b} की एक छलांग। ${a}/${b} पर रुको।`, `Start at 0. Each tap is one hop of 1/${b}. Stop at ${a}/${b}.`),
        response: { kind: "hops", denominator: b, max: 2, target: a },
        hint: hiEn(`1 तक पहुँचने में ${b} छलांगें लगती हैं। ${a}/${b} को कितनी चाहिए?`, `It takes ${b} hops to reach 1. How many does ${a}/${b} need?`),
        explanation: hiEn(`${a} छलांगें, हर एक 1/${b}: ${a}/${b}। यह 1 से आगे चला गया—fraction 1 से बड़ा हो सकता है।`, `${a} hops of 1/${b} each land on ${a}/${b}. It went past 1—a fraction can be more than one whole.`),
      };
    },
    (variant) => {
      const [a, b] = pick([[7, 4], [5, 3], [9, 8], [7, 6], [5, 2]] as const, variant);
      return {
        facet: "explain",
        prompt: who(
          hiEn(`${a}/${b} हो ही नहीं सकता, क्योंकि एक whole में सिर्फ ${b} हिस्से होते हैं।`, `${a}/${b} cannot exist, because one whole only has ${b} parts.`),
          hiEn(`${a}/${b} = 1/${b} के ${a} copies। यह एक whole से ज़्यादा है, इसलिए दूसरा whole भी लगता है।`, `${a}/${b} is ${a} copies of 1/${b}. That is more than one whole, so it spills into a second whole.`),
        ),
        visual: { kind: "bar", wholes: 2, parts: b, shaded: a },
        response: choice(
          right(hiEn("Meera", "Meera")),
          wrong(hiEn("Kabir", "Kabir"), "improper-fraction-impossible", hiEn(`1/${b} के copies गिनते रहो—${b} के बाद भी गिनती रुकती नहीं। Picture में ${a} हिस्से दो wholes में फैले हैं।`, `Keep counting copies of 1/${b}—the count does not stop at ${b}. The picture shows ${a} parts spread over two wholes.`)),
          wrong(hiEn(`कोई नहीं—${a}/${b} का मतलब ${a} − ${b}`, `Neither—${a}/${b} means ${a} − ${b}`), "fraction-as-two-whole-numbers", hiEn("Fraction bar घटाने का निशान नहीं है। वह unit-size और उसकी गिनती बताता है।", "A fraction bar is not a minus sign. It names a unit size and how many of it.")),
        ),
        hint: hiEn(`Picture में रँगे हिस्से गिनो। क्या वे एक whole में समा रहे हैं?`, "Count the shaded parts in the picture. Do they fit inside one whole?"),
        explanation: hiEn(`${a}/${b} = ${Array.from({ length: a }, () => `1/${b}`).join(" + ")}। पहले ${b} copies एक whole भरते हैं, बाकी दूसरे में जाते हैं।`, `${a}/${b} = ${Array.from({ length: a }, () => `1/${b}`).join(" + ")}. The first ${b} copies fill one whole; the rest go into the next.`),
      };
    },
  ],

  // Multiplying fractions by whole numbers
  "mt_TgHxujL81r": [
    (variant) => {
      const [n, a, b, story] = pick([
        [4, 3, 8, hiEn("km", "km")],
        [3, 2, 5, hiEn("litre", "litres")],
        [5, 2, 7, hiEn("metre", "metres")],
        [2, 3, 4, hiEn("cup", "cups")],
        [3, 3, 10, hiEn("kg", "kg")],
      ] as const, variant);
      return {
        facet: "apply",
        prompt: hiEn(`Riya ने ${n} दिन, रोज़ ${a}/${b} ${story.hi} इस्तेमाल किया। कुल कितना? (${n} × ${a}/${b})`, `Riya used ${a}/${b} ${story.en} every day for ${n} days. How much in all? (${n} × ${a}/${b})`),
        visual: { kind: "expression", text: `${n} × ${a}/${b} = ?` },
        response: choice(
          right(`${n * a}/${b}`),
          wrong(`${n * a}/${n * b}`, "multiplying-both-parts", hiEn(`${n * a}/${n * b} वही ${a}/${b} है—नीचे का number बदलने से हिस्से छोटे हो गए। ${n} बार लेने से unit-size नहीं बदलता, सिर्फ गिनती बदलती है।`, `${n * a}/${n * b} is still ${a}/${b}—changing the bottom number made the pieces smaller. Taking something ${n} times keeps the unit size and changes only the count.`)),
          wrong(`${n + a}/${b}`, "operation-guessing", hiEn(`यहाँ ${n} बार repeat करना है, ${n} जोड़ना नहीं।`, `The story repeats ${a}/${b} ${n} times; it does not add ${n}.`)),
        ),
        hint: hiEn(`${a}/${b} को ${n} बार जोड़कर देखो। 1/${b} के कुल कितने pieces बने?`, `Add ${a}/${b} to itself ${n} times. How many pieces of 1/${b} is that?`),
        explanation: hiEn(`${Array.from({ length: n }, () => `${a}/${b}`).join(" + ")} = ${n * a}/${b}। हर बार ${a} pieces of 1/${b}, ${n} बार: ${n * a} pieces।`, `${Array.from({ length: n }, () => `${a}/${b}`).join(" + ")} = ${n * a}/${b}. ${a} pieces of 1/${b}, ${n} times, is ${n * a} pieces.`),
      };
    },
    (variant) => {
      const [w, p, q, m] = pick([
        [1, 1, 4, 3],
        [2, 1, 3, 2],
        [1, 2, 5, 2],
        [2, 1, 4, 3],
        [1, 1, 3, 2],
      ] as const, variant);
      const product = multiply(fraction(w * q + p, q), fraction(m));
      return {
        facet: "apply",
        prompt: hiEn(`${w} ${p}/${q} × ${m} = ? Mixed number में लिखो।`, `${w} ${p}/${q} × ${m} = ? Write it as a mixed number.`),
        visual: { kind: "expression", text: `${w} ${p}/${q} × ${m}` },
        response: choice(
          right(formatMixed(product)),
          wrong(`${w * m} ${p}/${q}`, "partial-multiplication", hiEn(`सिर्फ ${w} को ${m} से multiply किया। ${p}/${q} भी ${m} बार आता है।`, `Only the ${w} was multiplied by ${m}. The ${p}/${q} also comes ${m} times.`)),
          wrong(formatMixed(fraction(w * q + p * m, q)), "partial-multiplication", hiEn(`सिर्फ ${p}/${q} को ${m} से multiply किया। Whole ${w} भी ${m} बार आता है।`, `Only the ${p}/${q} was multiplied by ${m}. The whole ${w} also comes ${m} times.`)),
        ),
        hint: hiEn(`${w} ${p}/${q} को ${m} बार जोड़ो: पहले wholes, फिर fraction वाले हिस्से।`, `Add ${w} ${p}/${q} to itself ${m} times: wholes first, then the fraction parts.`),
        explanation: hiEn(`${w} × ${m} = ${w * m} wholes, और ${p}/${q} × ${m} = ${p * m}/${q}। दोनों मिलाकर ${formatMixed(product)}।`, `${w} × ${m} = ${w * m} wholes, and ${p}/${q} × ${m} = ${p * m}/${q}. Together that is ${formatMixed(product)}.`),
      };
    },
    (variant) => {
      const [n, b] = pick([[5, 4], [7, 6], [4, 3], [7, 5], [9, 8]] as const, variant);
      return {
        facet: "see",
        prompt: hiEn(`Picture में 1/${b} के ${n} copies रखे हैं: ${n} × 1/${b}। यह कुल कितना है?`, `The picture holds ${n} copies of 1/${b}: ${n} × 1/${b}. How much is that in all?`),
        visual: { kind: "bar", wholes: 2, parts: b, shaded: n },
        response: choice(
          right(`${n}/${b}`),
          wrong(`${n}/${n * b}`, "multiplying-both-parts", hiEn(`Picture में हर हिस्सा अभी भी 1/${b} है, 1/${n * b} नहीं। Copies बढ़े, size नहीं बदला।`, `Every part in the picture is still 1/${b}, not 1/${n * b}. The copies grew; their size did not change.`)),
          wrong(hiEn(`1—एक whole से ज़्यादा नहीं हो सकता`, `1—it cannot be more than one whole`), "improper-fraction-impossible", hiEn(`${b} copies एक whole भरते हैं और बाकी ${n - b} दूसरे whole में जाते हैं। Amount 1 से ज़्यादा है।`, `${b} copies fill one whole and the other ${n - b} spill into the next. The amount is more than 1.`)),
        ),
        hint: hiEn(`हर रँगा हिस्सा 1/${b} है। कुल कितने रँगे हैं?`, `Every shaded part is 1/${b}. How many are shaded in all?`),
        explanation: hiEn(`${n} × 1/${b} = ${n}/${b} = ${mixed(n, b)}। ${n} copies of one unit—बस यही multiplication है।`, `${n} × 1/${b} = ${n}/${b} = ${mixed(n, b)}. ${n} copies of one unit—that is all the multiplication means.`),
      };
    },
  ],

  // Multiplying a fraction by a fraction
  "mt_AabJisinfi": [
    (variant) => {
      const [a, b, c, d] = pick([[2, 3, 4, 5], [1, 2, 3, 4], [3, 4, 2, 3], [2, 5, 1, 3], [3, 5, 2, 3]] as const, variant);
      const eitherShaded = a * d + b * c - a * c;
      return {
        facet: "see",
        prompt: hiEn(`Area model में ${a}/${b} rows और ${c}/${d} columns रँगे हैं। जहाँ दोनों रंग मिलते हैं, वह पूरे का कितना है? यही ${a}/${b} × ${c}/${d} है।`, `In this area model, ${a}/${b} of the rows and ${c}/${d} of the columns are shaded. What fraction of the whole is double-shaded? That is ${a}/${b} × ${c}/${d}.`),
        visual: { kind: "area", rows: b, cols: d, rowsShaded: a, colsShaded: c },
        response: choice(
          right(`${a * c}/${b * d}`),
          wrong(`${eitherShaded}/${b * d}`, "counted-all-shaded", hiEn(`यह हर रँगा cell गिनता है। ${a}/${b} × ${c}/${d} सिर्फ वही cells हैं जहाँ दोनों रंग overlap करते हैं।`, `That counts every shaded cell. ${a}/${b} × ${c}/${d} is only the cells where both shadings overlap.`)),
          wrong(`${a + c}/${b + d}`, "fraction-as-two-whole-numbers", hiEn(`Numerators और denominators जोड़ना area को नहीं गिनता। Picture में overlap cells गिनो।`, `Adding the tops and bottoms does not count any area. Count the overlapping cells in the picture.`)),
        ),
        hint: hiEn(`पूरे में कुल ${b * d} cells हैं। दो बार रँगे cells गिनो।`, `The whole has ${b * d} cells. Count the cells shaded twice.`),
        explanation: hiEn(`${a} rows × ${c} columns = ${a * c} overlap cells, कुल ${b} × ${d} = ${b * d} cells में से: ${a * c}/${b * d}।`, `${a} rows × ${c} columns give ${a * c} overlap cells out of ${b} × ${d} = ${b * d}: ${a * c}/${b * d}.`),
      };
    },
    (variant) => {
      const [a, b, n] = pick([[2, 3, 4], [3, 4, 3], [3, 5, 4], [5, 6, 2], [2, 5, 3]] as const, variant);
      return {
        facet: "apply",
        prompt: hiEn(`${n} plates हैं, हर plate पर ${a}/${b} roti। कुल कितनी rotis? (${a}/${b} × ${n})`, `There are ${n} plates with ${a}/${b} of a roti on each. How many rotis in all? (${a}/${b} × ${n})`),
        visual: { kind: "groups", wholes: n, parts: b, shadedEach: a },
        response: choice(
          right(mixed(a * n, b)),
          wrong(`${a * n}/${b * n}`, "multiplying-both-parts", hiEn(`${a * n}/${b * n} वही ${a}/${b} है। Plates बढ़ने से pieces का size नहीं बदलता।`, `${a * n}/${b * n} is still ${a}/${b}. More plates do not change the size of each piece.`)),
          wrong(`${n} ${a}/${b}`, "partial-multiplication", hiEn(`${n} पूरी rotis नहीं हैं—हर plate पर सिर्फ ${a}/${b} है।`, `There are not ${n} whole rotis—each plate holds only ${a}/${b}.`)),
        ),
        hint: hiEn(`सारे 1/${b} pieces गिनो, फिर देखो कितनी पूरी rotis बनती हैं।`, `Count all the 1/${b} pieces, then see how many whole rotis they make.`),
        explanation: hiEn(`${a}/${b} × ${n} = ${a * n}/${b}। ${b} pieces मिलकर एक roti बनाते हैं, इसलिए ${mixed(a * n, b)}।`, `${a}/${b} × ${n} = ${a * n}/${b}. Every ${b} pieces make one roti, so it is ${mixed(a * n, b)}.`),
      };
    },
    (variant) => {
      const [a, b, c, d] = pick([[3, 4, 2, 3], [2, 5, 5, 6], [4, 5, 1, 2], [2, 3, 3, 8], [3, 4, 4, 9]] as const, variant);
      const top = a * c;
      const bottom = b * d;
      const divisor = gcd(top, bottom);
      const partial = Array.from({ length: divisor - 2 }, (_, index) => index + 2).find((candidate) => divisor % candidate === 0);
      const options: DraftOption[] = [
        right(frac(top, bottom)),
        wrong(`${top}/${bottom}`, "not-fully-simplified", hiEn(`${top} और ${bottom} दोनों ${divisor} से बँटते हैं, इसलिए यह अभी simplest नहीं है।`, `${top} and ${bottom} can both be divided by ${divisor}, so this is not the simplest form yet.`)),
        wrong(`1/${bottom - top + 1}`, "subtracted-to-simplify", hiEn("दोनों numbers से एक ही चीज़ घटाने से value बदल जाती है। Simplify करने के लिए दोनों को एक ही number से divide करते हैं।", "Subtracting the same amount from both numbers changes the value. To simplify, divide both by the same number.")),
      ];
      if (partial) {
        options.push(wrong(`${top / partial}/${bottom / partial}`, "not-fully-simplified", hiEn(`अच्छी शुरुआत—${partial} से divide किया। पर अभी भी दोनों numbers एक common factor share करते हैं।`, `Good start—you divided by ${partial}. The two numbers still share a common factor.`)));
      }
      return {
        facet: "apply",
        prompt: hiEn(`${a}/${b} × ${c}/${d} = ${top}/${bottom}। इसका simplest form क्या है?`, `${a}/${b} × ${c}/${d} = ${top}/${bottom}. What is its simplest form?`),
        visual: { kind: "expression", text: `${a}/${b} × ${c}/${d} = ${top}/${bottom}` },
        response: choice(...options),
        hint: hiEn(`${top} और ${bottom} दोनों को बाँटने वाला सबसे बड़ा number कौन-सा है?`, `What is the largest number that divides both ${top} and ${bottom}?`),
        explanation: hiEn(`${top} ÷ ${divisor} = ${top / divisor} और ${bottom} ÷ ${divisor} = ${bottom / divisor}। Amount वही रहती है, बस pieces बड़े होते हैं: ${frac(top, bottom)}।`, `${top} ÷ ${divisor} = ${top / divisor} and ${bottom} ÷ ${divisor} = ${bottom / divisor}. The amount stays the same; the pieces just get bigger: ${frac(top, bottom)}.`),
      };
    },
  ],

  // A fraction is division
  "mt_4Km38F4L-6": [
    (variant) => {
      const [a, b] = pick([[3, 4], [2, 5], [5, 6], [3, 7], [4, 9]] as const, variant);
      return {
        facet: "reverse",
        prompt: hiEn(`${a}/${b} और division का सही रिश्ता कौन-सा है?`, `Which statement correctly links ${a}/${b} and division?`),
        response: choice(
          right(hiEn(`${a}/${b} = ${a} ÷ ${b}, क्योंकि ${a}/${b} × ${b} = ${a}`, `${a}/${b} = ${a} ÷ ${b}, because ${a}/${b} × ${b} = ${a}`)),
          wrong(hiEn(`${a}/${b} = ${b} ÷ ${a}, क्योंकि बड़े को छोटे से divide करते हैं`, `${a}/${b} = ${b} ÷ ${a}, because you divide the bigger by the smaller`), "dividend-divisor-role-confusion", hiEn(`${b} ÷ ${a}, 1 से बड़ा है, पर ${a}/${b} 1 से छोटा। ऊपर वाला number बाँटा जाता है।`, `${b} ÷ ${a} is more than 1, but ${a}/${b} is less than 1. The top number is the one being divided.`)),
          wrong(hiEn(`${a}/${b} सिर्फ एक हिस्सा है; इसका division से कोई रिश्ता नहीं`, `${a}/${b} is just a part; it has nothing to do with division`), "fraction-not-division", hiEn(`${a} चीज़ों को ${b} लोगों में बाँटो—हर एक को ${a}/${b} मिलता है। Fraction bar एक division है।`, `Share ${a} things among ${b} people and each gets ${a}/${b}. The fraction bar is a division.`)),
        ),
        hint: hiEn(`${a}/${b} को ${b} बार जोड़ो। क्या मिलता है?`, `Add ${a}/${b} to itself ${b} times. What do you get?`),
        explanation: hiEn(`${a} ÷ ${b} पूछता है: ${b} से multiply करके ${a} कौन देगा? ${a}/${b} × ${b} = ${a}, इसलिए ${a} ÷ ${b} = ${a}/${b}।`, `${a} ÷ ${b} asks what times ${b} makes ${a}. Since ${a}/${b} × ${b} = ${a}, ${a} ÷ ${b} = ${a}/${b}.`),
      };
    },
    (variant) => {
      const [n, m, thing] = pick([
        [3, 4, hiEn("rotis", "rotis")],
        [5, 4, hiEn("chocolate bars", "chocolate bars")],
        [2, 3, hiEn("pizzas", "pizzas")],
        [7, 3, hiEn("metre रस्सी", "metres of rope")],
        [50, 9, hiEn("kg चावल", "kg of rice")],
      ] as const, variant);
      return {
        facet: "apply",
        prompt: hiEn(`${n} ${thing.hi} को ${m} बच्चों में बराबर बाँटा। हर बच्चे को कितना मिला?`, `${n} ${thing.en} are shared equally among ${m} children. How much does each child get?`),
        visual: { kind: "expression", text: `${n} ÷ ${m} = ?` },
        response: choice(
          right(mixed(n, m)),
          wrong(mixed(m, n), "dividend-divisor-role-confusion", hiEn(`यह ${m} ÷ ${n} है। यहाँ ${n} चीज़ें बाँटी जा रही हैं, ${m} बच्चों में।`, `That is ${m} ÷ ${n}. Here ${n} things are being shared among ${m} children.`)),
          wrong(`1/${m}`, "ignored-number-of-wholes", hiEn(`1/${m} सिर्फ एक whole का हिस्सा है। बाँटने के लिए ${n} wholes हैं।`, `1/${m} is a share of only one whole. There are ${n} wholes to share.`)),
        ),
        hint: hiEn(`हर whole को ${m} हिस्सों में काटो और हर बच्चे को हर whole से एक हिस्सा दो।`, `Cut every whole into ${m} parts and give each child one part from every whole.`),
        explanation: hiEn(`${n} ÷ ${m} = ${n}/${m}${n > m ? ` = ${mixed(n, m)}` : ""}। हर बच्चे को ${n} wholes में से हर एक का 1/${m} मिलता है।`, `${n} ÷ ${m} = ${n}/${m}${n > m ? ` = ${mixed(n, m)}` : ""}. Each child gets 1/${m} of each of the ${n} wholes.`),
      };
    },
    (variant) => {
      const [n, m] = pick([[3, 4], [2, 3], [3, 5], [2, 5], [4, 5]] as const, variant);
      return {
        facet: "see",
        prompt: hiEn(`${n} bars को ${m} दोस्तों में बाँटा: हर bar के ${m} हिस्से करके, हर दोस्त को हर bar से एक हिस्सा। एक दोस्त को कुल कितना मिला?`, `${n} bars are shared among ${m} friends: each bar is cut into ${m} and every friend gets one piece of every bar. How much does one friend get?`),
        visual: { kind: "share", wholes: n, people: m },
        response: choice(
          right(`${n}/${m}`),
          wrong(`1/${m}`, "ignored-number-of-wholes", hiEn(`1/${m} सिर्फ एक bar से मिला हिस्सा है। Picture में हर दोस्त को ${n} bars से हिस्से मिले।`, `1/${m} is the piece from just one bar. In the picture each friend gets pieces from ${n} bars.`)),
          wrong(`${m}/${n}`, "dividend-divisor-role-confusion", hiEn(`${m}/${n}, ${m} ÷ ${n} है। यहाँ ${n} bars बाँटे जा रहे हैं।`, `${m}/${n} is ${m} ÷ ${n}. Here it is the ${n} bars that are being shared.`)),
        ),
        hint: hiEn("एक ही रंग के सारे pieces गिनो—वे एक दोस्त के हैं।", "Count all the pieces of one colour—they belong to one friend."),
        explanation: hiEn(`एक दोस्त को ${n} pieces मिले, हर एक 1/${m}: ${n}/${m}। इसलिए ${n} ÷ ${m} = ${n}/${m}।`, `One friend gets ${n} pieces of 1/${m} each: ${n}/${m}. That is why ${n} ÷ ${m} = ${n}/${m}.`),
      };
    },
  ],

  // Dividing a unit fraction by a whole number
  "mt_ifPDOYvUqm": [
    (variant) => {
      const [b, n] = pick([[3, 4], [2, 3], [4, 2], [3, 2], [5, 2], [2, 5]] as const, variant);
      return {
        facet: "see",
        prompt: hiEn(`1/${b} को ${n} बराबर हिस्सों में बाँटा (1/${b} ÷ ${n})। एक छोटा हिस्सा पूरे का कितना है?`, `1/${b} is split into ${n} equal pieces (1/${b} ÷ ${n}). What fraction of the whole is one small piece?`),
        visual: { kind: "split", parts: b, split: n },
        response: choice(
          right(`1/${b * n}`),
          wrong(frac(n, b), "multiplied-instead-of-divided", hiEn(`${n}/${b}, 1/${b} का ${n} गुना है। बाँटने पर हर हिस्सा 1/${b} से छोटा होना चाहिए।`, `${n}/${b} is 1/${b} taken ${n} times. After splitting, each piece must be smaller than 1/${b}.`)),
          wrong(`1/${b + n}`, "fraction-as-two-whole-numbers", hiEn(`Denominators जोड़ने से size नहीं मिलता। पूरे whole में ऐसे कितने छोटे हिस्से समाएँगे?`, `Adding the numbers does not give the size. How many small pieces would fill the whole?`)),
        ),
        hint: hiEn(`अगर हर 1/${b} को ${n} में बाँटो, तो पूरे whole में कितने छोटे हिस्से होंगे?`, `If every 1/${b} were split into ${n}, how many small pieces would the whole have?`),
        explanation: hiEn(`${b} हिस्से × ${n} = ${b * n} छोटे हिस्से पूरे में। इसलिए एक छोटा हिस्सा 1/${b * n} है: 1/${b} ÷ ${n} = 1/${b * n}।`, `${b} parts × ${n} = ${b * n} small pieces in the whole, so one piece is 1/${b * n}: 1/${b} ÷ ${n} = 1/${b * n}.`),
      };
    },
    (variant) => {
      const [b, n] = pick([[6, 3], [3, 4], [2, 4], [4, 3], [5, 2]] as const, variant);
      return {
        facet: "apply",
        prompt: hiEn(`एक bag चावल का 1/${b} हिस्सा ${n} बराबर डिब्बों में भरा। हर डिब्बे में पूरे bag का कितना है?`, `1/${b} of a bag of rice is packed equally into ${n} tins. What fraction of the whole bag is in each tin?`),
        visual: { kind: "expression", text: `1/${b} ÷ ${n} = ?` },
        response: choice(
          right(`1/${b * n}`),
          wrong(frac(n, b), "multiplied-instead-of-divided", hiEn(`${n}/${b} तो शुरू वाले चावल से भी ज़्यादा है। बाँटने पर हर डिब्बे में कम होना चाहिए।`, `${n}/${b} is more rice than we started with. Sharing must leave less in each tin.`)),
          wrong(`1/${b + n}`, "fraction-as-two-whole-numbers", hiEn("Denominators जोड़ने से डिब्बे का हिस्सा नहीं मिलता।", "Adding the numbers does not give each tin's share.")),
        ),
        hint: hiEn(`सोचो: ${n} डिब्बे एक 1/${b} भरते हैं। पूरा bag कितने डिब्बे भरेगा?`, `Think: ${n} tins hold one 1/${b}. How many tins would the whole bag fill?`),
        explanation: hiEn(`पूरा bag ${b} × ${n} = ${b * n} डिब्बे भरेगा, इसलिए हर डिब्बा 1/${b * n} है।`, `The whole bag would fill ${b} × ${n} = ${b * n} tins, so each tin holds 1/${b * n}.`),
      };
    },
    (variant) => {
      const [b, n] = pick([[3, 4], [2, 3], [4, 2], [5, 2], [6, 3]] as const, variant);
      return {
        facet: "reverse",
        prompt: hiEn(`1/${b} ÷ ${n} = 1/${b * n}। कौन-सा multiplication पक्का करता है कि यह सही है?`, `1/${b} ÷ ${n} = 1/${b * n}. Which multiplication proves this is right?`),
        response: choice(
          right(`1/${b * n} × ${n} = 1/${b}`),
          wrong(`1/${b} × ${n} = ${frac(n, b)}`, "multiplied-instead-of-divided", hiEn(`यह शुरू वाले 1/${b} को ${n} गुना करता है। Check के लिए answer को ${n} से multiply करके वापस 1/${b} पाना है।`, `That multiplies the starting 1/${b}. To check, multiply the answer by ${n} and get back to 1/${b}.`)),
          wrong(`${b * n} × ${n} = ${b * n * n}`, "unknown-factor-not-connected", hiEn("यह answer को वापस शुरू वाली amount से नहीं जोड़ता।", "That does not connect the answer back to the starting amount.")),
        ),
        hint: hiEn(`Division ने ${n} बराबर हिस्से बनाए। उन ${n} हिस्सों को वापस जोड़ो तो क्या मिलना चाहिए?`, `The division made ${n} equal pieces. Put the ${n} pieces back together—what should you get?`),
        explanation: hiEn(`${n} हिस्से, हर एक 1/${b * n}: 1/${b * n} × ${n} = ${n}/${b * n} = 1/${b}। Multiplication division को undo करता है।`, `${n} pieces of 1/${b * n} each: 1/${b * n} × ${n} = ${n}/${b * n} = 1/${b}. Multiplication undoes the division.`),
      };
    },
  ],

  // Dividing a whole number by a unit fraction
  "mt_1PAWhRhpdg": [
    (variant) => {
      const [n, b] = pick([[2, 4], [3, 3], [2, 5], [3, 2], [4, 3]] as const, variant);
      return {
        facet: "see",
        prompt: hiEn(`${n} ÷ 1/${b}: 0 से ${n} तक 1/${b} की छलांगें लगाओ। ठीक ${n} पर रुको—कितनी छलांगें लगीं?`, `${n} ÷ 1/${b}: hop from 0 to ${n} in hops of 1/${b}. Stop exactly on ${n}—how many hops did it take?`),
        response: { kind: "hops", denominator: b, max: n, target: n * b },
        hint: hiEn(`हर whole में 1/${b} की ${b} छलांगें होती हैं।`, `Every whole holds ${b} hops of 1/${b}.`),
        explanation: hiEn(`हर whole में ${b} hops, ${n} wholes में ${n} × ${b} = ${n * b}। ${n} ÷ 1/${b} = ${n * b}—छोटे group-size से गिनती बड़ी हुई।`, `${b} hops in every whole, so ${n} × ${b} = ${n * b} hops in ${n} wholes. ${n} ÷ 1/${b} = ${n * b}—a small group size made a big count.`),
      };
    },
    (variant) => {
      const [n, b] = pick([[4, 5], [6, 4], [3, 8], [5, 3], [2, 6]] as const, variant);
      return {
        facet: "apply",
        prompt: hiEn(`${n} metre ribbon है और हर bow में 1/${b} metre लगता है। कितने bows बनेंगे?`, `You have ${n} metres of ribbon and each bow needs 1/${b} of a metre. How many bows can you make?`),
        visual: { kind: "expression", text: `${n} ÷ 1/${b} = ?` },
        response: choice(
          right(`${n * b}`),
          wrong(frac(n, b), "division-always-makes-smaller", hiEn(`${frac(n, b)} bows? हर bow बहुत छोटा है, इसलिए ${n} metre में बहुत सारे bows बनेंगे। Division यहाँ groups गिन रहा है।`, `${frac(n, b)} bows? Each bow is tiny, so ${n} metres make many bows. Here division counts groups.`)),
          wrong(`${n + b}`, "operation-guessing", hiEn("Numbers जोड़ने से bows की गिनती नहीं मिलती। एक metre में कितने bows बनते हैं?", "Adding the numbers does not count bows. How many bows come from one metre?")),
        ),
        hint: hiEn(`पहले सिर्फ 1 metre सोचो: उसमें कितने 1/${b} metre bows?`, `First think about just 1 metre: how many 1/${b}-metre bows does it hold?`),
        explanation: hiEn(`1 metre = ${b} bows, इसलिए ${n} metre = ${n} × ${b} = ${n * b} bows।`, `1 metre makes ${b} bows, so ${n} metres make ${n} × ${b} = ${n * b} bows.`),
      };
    },
    (variant) => {
      const [n, b] = pick([[4, 5], [3, 4], [2, 6], [5, 2], [6, 3]] as const, variant);
      return {
        facet: "reverse",
        prompt: hiEn(`${n} ÷ 1/${b} = ${n * b}। कौन-सा multiplication यह पक्का करता है?`, `${n} ÷ 1/${b} = ${n * b}. Which multiplication proves it?`),
        response: choice(
          right(`${n * b} × 1/${b} = ${n}`),
          wrong(`${n} × 1/${b} = ${frac(n, b)}`, "division-always-makes-smaller", hiEn(`यह ${n} को छोटा करता है, answer को check नहीं करता। ${n * b} groups, हर एक 1/${b}—मिलकर ${n} होने चाहिए।`, `That shrinks ${n}; it does not check the answer. ${n * b} groups of 1/${b} each should make ${n}.`)),
          wrong(`${n * b} × ${b} = ${n * b * b}`, "unknown-factor-not-connected", hiEn(`Check में group-size 1/${b} होना चाहिए, ${b} नहीं।`, `The check must use the group size 1/${b}, not ${b}.`)),
        ),
        hint: hiEn(`${n * b} groups हैं और हर group का size 1/${b} है। सब मिलाकर कितना?`, `There are ${n * b} groups, each of size 1/${b}. How much is that altogether?`),
        explanation: hiEn(`${n * b} × 1/${b} = ${n * b}/${b} = ${n}। वही amount वापस मिली, इसलिए division सही है।`, `${n * b} × 1/${b} = ${n * b}/${b} = ${n}. We are back to the starting amount, so the division is right.`),
      };
    },
  ],

  // Dividing fractions
  "mt_9Y96vxG_LH": [
    (variant) => {
      const [a, b, d] = pick([[3, 4, 8], [2, 3, 6], [1, 2, 4], [3, 5, 10], [2, 5, 10]] as const, variant);
      const quotient = formatFraction(divide(fraction(a, b), fraction(1, d)));
      if (variant % 2 === 0) {
        return {
          facet: "apply",
          prompt: hiEn(`${a}/${b} ÷ 1/${d} किसके बराबर है?`, `Which is the same as ${a}/${b} ÷ 1/${d}?`),
          response: choice(
            right(`${a}/${b} × ${d}`),
            wrong(`${b}/${a} × 1/${d}`, "reciprocal-rule-without-meaning", hiEn("गलत fraction flip हुआ। Flip सिर्फ divisor (जिससे divide कर रहे हैं) का होता है।", "The wrong fraction was flipped. Only the divisor—the fraction you divide by—gets flipped.")),
            wrong(`${a}/${b} × 1/${d}`, "division-always-makes-smaller", hiEn(`यह ${a}/${b} को और छोटा करता है। पर ${a}/${b} में 1/${d} कई बार fit होता है।`, `That makes ${a}/${b} even smaller. But 1/${d} fits into ${a}/${b} many times.`)),
          ),
          hint: hiEn(`1 whole में 1/${d} कितनी बार fit होता है?`, `How many times does 1/${d} fit into one whole?`),
          explanation: hiEn(`1 whole में ${d} pieces of 1/${d} होते हैं, इसलिए ${a}/${b} में ${a}/${b} × ${d} = ${quotient} pieces। Flip rule इसी गिनती का shortcut है।`, `One whole holds ${d} pieces of 1/${d}, so ${a}/${b} holds ${a}/${b} × ${d} = ${quotient} of them. The flip rule is a shortcut for that count.`),
        };
      }
      return {
        facet: "explain",
        prompt: hiEn(`${a}/${b} ÷ 1/${d} में flip करके ${a}/${b} × ${d} करते हैं। यह क्यों काम करता है?`, `For ${a}/${b} ÷ 1/${d} we flip and compute ${a}/${b} × ${d}. Why does that work?`),
        visual: { kind: "bar", wholes: 1, parts: d, shaded: (a * d) / b },
        response: choice(
          right(hiEn(`1 whole में ${d} pieces of 1/${d} हैं, इसलिए ${a}/${b} whole में ${a}/${b} × ${d} pieces होंगे`, `One whole holds ${d} pieces of 1/${d}, so ${a}/${b} of a whole holds ${a}/${b} × ${d} of them`)),
          wrong(hiEn("क्योंकि division और multiplication opposite हैं, इसलिए सब कुछ उल्टा कर देते हैं", "Because division and multiplication are opposites, so you turn everything upside down"), "reciprocal-rule-without-meaning", hiEn("अगर सब उल्टा करते, तो पहला fraction भी flip होता। Rule का reason group-count है।", "If everything were turned over, the first fraction would flip too. The rule's reason is the group count.")),
          wrong(hiEn("क्योंकि flip करने से answer छोटा और आसान बनता है", "Because flipping makes the answer smaller and easier"), "division-always-makes-smaller", hiEn(`यहाँ answer ${quotient} है—${a}/${b} से बड़ा, क्योंकि छोटे 1/${d} groups कई बार fit होते हैं।`, `Here the answer is ${quotient}—bigger than ${a}/${b}, because small 1/${d} groups fit many times.`)),
        ),
        hint: hiEn(`Picture में हर छोटा हिस्सा 1/${d} है। Flip rule क्या गिन रहा है?`, `Each small part in the picture is 1/${d}. What is the flip rule counting?`),
        explanation: hiEn(`÷ 1/${d} पूछता है "कितने 1/${d} fit होते हैं?" हर whole में ${d}, इसलिए × ${d}। यही reciprocal है।`, `÷ 1/${d} asks "how many 1/${d} fit?" Every whole holds ${d}, so we multiply by ${d}. That is the reciprocal.`),
      };
    },
    (variant) => {
      const [a, b, c, d] = pick([[3, 4, 1, 8], [2, 3, 1, 6], [3, 4, 3, 8], [4, 5, 2, 10], [1, 2, 1, 6]] as const, variant);
      const shaded = (a * d) / b;
      const quotient = divide(fraction(a, b), fraction(c, d));
      const candidates: DraftOption[] = [
        wrong(`1/${formatFraction(quotient)}`, "division-always-makes-smaller", hiEn(`Picture में ${c}/${d}-size groups कई बार fit होते हैं, इसलिए answer 1 से बड़ा है।`, `In the picture the ${c}/${d}-sized groups fit several times, so the answer is more than 1.`)),
        wrong(frac(a * c, b * d), "multiplied-instead-of-divided", hiEn(`यह ${a}/${b} × ${c}/${d} है। Division पूछता है कितने groups fit होते हैं।`, `That is ${a}/${b} × ${c}/${d}. Division asks how many groups fit.`)),
      ];
      if (c > 1) {
        candidates.push(wrong(`${shaded}`, "reciprocal-rule-without-meaning", hiEn(`${shaded} छोटे 1/${d} pieces हैं, पर हर group ${c} pieces का है।`, `There are ${shaded} small 1/${d} pieces, but each group is ${c} pieces.`)));
      } else {
        candidates.push(wrong(`${d}`, "numerator-denominator-confused", hiEn(`${d} पूरे whole के pieces हैं। सिर्फ रँगे ${a}/${b} वाले pieces गिनो।`, `${d} is the number of pieces in the whole bar. Count only the pieces inside the shaded ${a}/${b}.`)));
      }
      return {
        facet: "see",
        prompt: hiEn(`${a}/${b} को ${d} बराबर हिस्सों वाले bar पर दिखाया है। इसमें ${c}/${d}-size के कितने groups fit होते हैं? (${a}/${b} ÷ ${c}/${d})`, `${a}/${b} is shown on a bar cut into ${d} equal parts. How many groups of size ${c}/${d} fit inside it? (${a}/${b} ÷ ${c}/${d})`),
        visual: { kind: "bar", wholes: 1, parts: d, shaded },
        response: choice(right(formatFraction(quotient)), ...candidates),
        hint: hiEn(`रँगे हुए 1/${d} pieces गिनो, फिर ${c}-${c} के groups बनाओ।`, `Count the shaded 1/${d} pieces, then group them ${c} at a time.`),
        explanation: hiEn(`${a}/${b} = ${shaded}/${d}। ${shaded} pieces को ${c}-${c} के groups में बाँटने पर ${formatFraction(quotient)} groups।`, `${a}/${b} = ${shaded}/${d}. ${shaded} pieces in groups of ${c} make ${formatFraction(quotient)} groups.`),
      };
    },
    (variant) => {
      const [a, b, c, d] = pick([[3, 4, 3, 8], [3, 4, 1, 8], [2, 3, 1, 6], [1, 2, 1, 8], [5, 6, 5, 12]] as const, variant);
      const quotient = divide(fraction(a, b), fraction(c, d));
      return {
        facet: "apply",
        prompt: hiEn(`Meera के पास ${a}/${b} litre lassi है और हर glass में ${c}/${d} litre आता है। कितने glasses भरेंगे?`, `Meera has ${a}/${b} of a litre of lassi and each glass holds ${c}/${d} of a litre. How many glasses can she fill?`),
        visual: { kind: "expression", text: `${a}/${b} ÷ ${c}/${d} = ?` },
        response: choice(
          right(formatFraction(quotient)),
          wrong(frac(a * c, b * d), "multiplied-instead-of-divided", hiEn("Multiply करने से lassi और कम हो गई। सवाल पूछ रहा है कितने glasses भरेंगे—यानी groups की गिनती।", "Multiplying shrank the lassi. The question asks how many glasses—a count of groups.")),
          wrong(`1/${formatFraction(quotient)}`, "division-always-makes-smaller", hiEn(`हर glass छोटा है, इसलिए एक से ज़्यादा glasses भरेंगे।`, `Each glass is small, so more than one glass gets filled.`)),
        ),
        hint: hiEn(`दोनों को ${d}वें हिस्सों में लिखो: ${a}/${b} = ${(a * d) / b}/${d}।`, `Write both in ${d}ths: ${a}/${b} = ${(a * d) / b}/${d}.`),
        explanation: hiEn(`${a}/${b} = ${(a * d) / b}/${d}, और हर glass ${c}/${d}। ${(a * d) / b} ÷ ${c} = ${formatFraction(quotient)} glasses।`, `${a}/${b} = ${(a * d) / b}/${d}, and each glass is ${c}/${d}. ${(a * d) / b} ÷ ${c} = ${formatFraction(quotient)} glasses.`),
      };
    },
  ],

  // What division means
  "mt_iNdrM2-oJf": [
    (variant) => {
      const [total, k] = pick([[12, 3], [56, 8], [20, 4], [18, 6], [15, 5]] as const, variant);
      return {
        facet: "explain",
        prompt: who(
          hiEn(`${total} ÷ ${k} का मतलब ${total} चीज़ें ${k} लोगों में बराबर बाँटना।`, `${total} ÷ ${k} means sharing ${total} things equally among ${k} people.`),
          hiEn(`${total} ÷ ${k} का मतलब ${k}-${k} के groups बनाना।`, `${total} ÷ ${k} means making groups of ${k}.`),
        ),
        response: choice(
          right(hiEn("दोनों—division के दो meanings हैं", "Both—division has two meanings")),
          wrong(hiEn("सिर्फ Kabir", "Only Kabir"), "one-meaning-of-division", hiEn(`${k}-${k} के groups बनाना भी ${total} ÷ ${k} है, और answer वही ${total / k} आता है।`, `Making groups of ${k} is also ${total} ÷ ${k}, and it gives the same ${total / k}.`)),
          wrong(hiEn("सिर्फ Meera", "Only Meera"), "one-meaning-of-division", hiEn(`${k} लोगों में बाँटना भी ${total} ÷ ${k} है—हर एक को ${total / k} मिलते हैं।`, `Sharing among ${k} people is also ${total} ÷ ${k}—each gets ${total / k}.`)),
        ),
        hint: hiEn("दोनों तरीकों से picture बनाकर देखो। क्या दोनों में एक ही number आता है?", "Picture it both ways. Does the same number come out?"),
        explanation: hiEn(`Sharing: ${k} लोग, हर एक को ${total / k}। Grouping: ${k}-${k} के ${total / k} groups। ${total} ÷ ${k} = ${total / k} दोनों कहानियाँ बताता है।`, `Sharing: ${k} people get ${total / k} each. Grouping: ${total / k} groups of ${k}. ${total} ÷ ${k} = ${total / k} tells both stories.`),
      };
    },
    (variant) => {
      const [total, k] = pick([[12, 3], [15, 5], [12, 4], [18, 3], [10, 2], [20, 5]] as const, variant);
      const groupsOf = variant % 2 === 0;
      const share = total / k;
      return {
        facet: "see",
        prompt: groupsOf
          ? hiEn(`कौन-सी picture ${total} ÷ ${k} को "${k}-${k} के groups" की तरह दिखाती है?`, `Which picture shows ${total} ÷ ${k} as "groups of ${k}"?`)
          : hiEn(`कौन-सी picture ${total} ÷ ${k} को "${k} बराबर shares" की तरह दिखाती है?`, `Which picture shows ${total} ÷ ${k} as "${k} equal shares"?`),
        response: choice(
          right(
            groupsOf ? hiEn(`${share} groups, हर एक में ${k}`, `${share} groups of ${k}`) : hiEn(`${k} shares, हर एक में ${share}`, `${k} shares of ${share}`),
            { visual: { kind: "dots", total, groupSize: groupsOf ? k : share } },
          ),
          wrong(
            groupsOf ? hiEn(`${k} groups, हर एक में ${share}`, `${k} groups of ${share}`) : hiEn(`${share} shares, हर एक में ${k}`, `${share} shares of ${k}`),
            "one-meaning-of-division",
            groupsOf
              ? hiEn(`यह sharing picture है: ${k} groups। "${k}-${k} के groups" में हर group में ${k} होते हैं।`, `This is the sharing picture: ${k} groups. "Groups of ${k}" puts ${k} in each group.`)
              : hiEn(`यह grouping picture है: ${k}-${k} के groups। "${k} shares" में ठीक ${k} हिस्से होते हैं।`, `This is the grouping picture: groups of ${k}. "${k} shares" means exactly ${k} parts.`),
            { kind: "dots", total, groupSize: groupsOf ? share : k },
          ),
          wrong(
            hiEn(`${total + k} dots, groups में`, `${total + k} dots in groups`),
            "operation-guessing",
            hiEn(`इस picture में ${total + k} dots हैं, ${total} नहीं। पहले total सही रखो।`, `This picture has ${total + k} dots, not ${total}. Start from the right total.`),
            { kind: "dots", total: total + k, groupSize: k },
          ),
        ),
        hint: groupsOf
          ? hiEn(`हर group में कितने dots होने चाहिए? ${k}।`, `How many dots belong in each group? ${k}.`)
          : hiEn(`कितने shares होने चाहिए? ${k}।`, `How many shares should there be? ${k}.`),
        explanation: groupsOf
          ? hiEn(`${total} dots को ${k}-${k} में रखो: ${share} groups। ${total} ÷ ${k} = ${share}।`, `Put ${total} dots in groups of ${k}: ${share} groups. ${total} ÷ ${k} = ${share}.`)
          : hiEn(`${total} dots को ${k} shares में बाँटो: हर share में ${share}। ${total} ÷ ${k} = ${share}।`, `Share ${total} dots into ${k} shares: ${share} in each. ${total} ÷ ${k} = ${share}.`),
      };
    },
    (variant) => {
      const [total, k, story] = pick([
        [24, 4, hiEn("pencils को 4 बच्चों में बराबर बाँटा", "pencils are shared equally among 4 children")],
        [30, 5, hiEn("laddoos, 5-5 करके डिब्बों में रखे", "laddoos are packed 5 to a box")],
        [18, 3, hiEn("बच्चे 3-3 की teams में बँटे", "children split into teams of 3")],
        [28, 7, hiEn("आम 7 थैलों में बराबर भरे", "mangoes are packed equally into 7 bags")],
        [36, 6, hiEn("कुर्सियाँ 6-6 की rows में लगीं", "chairs are set out in rows of 6")],
      ] as const, variant);
      return {
        facet: "apply",
        prompt: hiEn(`${total} ${story.hi}। कौन-सा expression इस कहानी से मेल खाता है?`, `${total} ${story.en}. Which expression matches the story?`),
        response: choice(
          right(`${total} ÷ ${k}`),
          wrong(`${k} ÷ ${total}`, "dividend-divisor-role-confusion", hiEn(`यहाँ ${total} चीज़ें बाँटी जा रही हैं। Division में पहले वह आता है जो बाँटा जा रहा है।`, `Here ${total} things are being split. In a division, the amount being split comes first.`)),
          wrong(`${total} × ${k}`, "operation-guessing", hiEn("Multiply करने से ज़्यादा चीज़ें बनतीं। कहानी में चीज़ें बराबर हिस्सों में बँट रही हैं।", "Multiplying would make more things. In the story, things are split into equal parts.")),
          wrong(`${total} − ${k}`, "operation-guessing", hiEn(`${k} को एक बार हटाना नहीं है; सारी चीज़ें बराबर हिस्सों में जा रही हैं।`, `The story does not remove ${k} once; it splits everything into equal parts.`)),
        ),
        hint: hiEn("कहानी में कौन-सी amount बराबर हिस्सों में बँट रही है?", "In the story, which amount is being split into equal parts?"),
        explanation: hiEn(`${total} चीज़ें बराबर हिस्सों में, ${k} से जुड़ी: ${total} ÷ ${k} = ${total / k}।`, `${total} things split into equal parts using ${k}: ${total} ÷ ${k} = ${total / k}.`),
      };
    },
  ],

  // Division as an unknown factor
  "mt_GDG9_SZmsO": [
    (variant) => {
      const [p, k] = pick([[32, 8], [42, 6], [27, 3], [56, 7], [36, 9]] as const, variant);
      return {
        facet: "reverse",
        prompt: hiEn(`${p} ÷ ${k} = ? किस multiplication सवाल जैसा है?`, `${p} ÷ ${k} = ? is the same as which multiplication question?`),
        response: choice(
          right(`${k} × ? = ${p}`),
          wrong(`${p} × ${k} = ?`, "unknown-factor-not-connected", hiEn(`${p} × ${k} बहुत बड़ा number देगा। Division पूछता है: ${k} को किससे multiply करें कि ${p} बने?`, `${p} × ${k} gives a much bigger number. Division asks: ${k} times what makes ${p}?`)),
          wrong(`? × ${p} = ${k}`, "dividend-divisor-role-confusion", hiEn(`${p} total है, इसलिए वह = के बाद आता है।`, `${p} is the total, so it goes after the equals sign.`)),
        ),
        hint: hiEn(`${p}, ${k} के कितने groups से बनता है?`, `How many groups of ${k} make ${p}?`),
        explanation: hiEn(`${p} ÷ ${k} = ${p / k}, क्योंकि ${k} × ${p / k} = ${p}। Division एक missing factor ढूँढता है।`, `${p} ÷ ${k} = ${p / k} because ${k} × ${p / k} = ${p}. Division finds a missing factor.`),
      };
    },
    (variant) => {
      const [k, q] = pick([[7, 6], [8, 4], [9, 3], [6, 8], [4, 7]] as const, variant);
      const p = k * q;
      return {
        facet: "apply",
        prompt: hiEn(`तुम जानते हो ${k} × ${q} = ${p}। तो ${p} ÷ ${k} = ?`, `You know ${k} × ${q} = ${p}. So what is ${p} ÷ ${k}?`),
        response: choice(
          right(`${q}`),
          wrong(`${p - k}`, "operation-guessing", hiEn(`यह ${p} − ${k} है। Division पूछता है ${k} के कितने groups ${p} बनाते हैं।`, `That is ${p} − ${k}. Division asks how many groups of ${k} make ${p}.`)),
          wrong(`${p * k}`, "unknown-factor-not-connected", hiEn(`यह ${p} × ${k} है। जानी हुई table उल्टी पढ़ो: ${k} × ? = ${p}।`, `That is ${p} × ${k}. Read the known fact backwards: ${k} × ? = ${p}.`)),
        ),
        hint: hiEn(`${k} × ? = ${p}—यह तुम्हें पहले से पता है।`, `${k} × ? = ${p}—you already know this.`),
        explanation: hiEn(`${k} × ${q} = ${p}, इसलिए ${p} ÷ ${k} = ${q}। एक ही fact family, दो दिशाएँ।`, `${k} × ${q} = ${p}, so ${p} ÷ ${k} = ${q}. One fact family, two directions.`),
      };
    },
    (variant) => {
      const [k, q] = pick([[8, 4], [6, 7], [9, 5], [7, 3], [5, 8]] as const, variant);
      const p = k * q;
      return {
        facet: "explain",
        prompt: hiEn(`${k} × ${q} = ${p}। इस multiplication को उल्टा करके कौन-सा division fact सही बनता है?`, `${k} × ${q} = ${p}. Undoing this multiplication gives which correct division fact?`),
        response: choice(
          right(`${p} ÷ ${k} = ${q}`),
          wrong(`${q} ÷ ${k} = ${p}`, "dividend-divisor-role-confusion", hiEn(`Total ${p} है, इसलिए division ${p} से शुरू होगा।`, `The total is ${p}, so the division starts from ${p}.`)),
          wrong(`${p} ÷ ${k} = ${p - k}`, "operation-guessing", hiEn(`${k} × ${p - k} = ${k * (p - k)}, ${p} नहीं। Division multiplication को undo करता है, subtraction को नहीं।`, `${k} × ${p - k} = ${k * (p - k)}, not ${p}. Division undoes multiplication, not subtraction.`)),
        ),
        hint: hiEn(`Multiplication ने ${k} के ${q} groups जोड़े। Division उन groups को फिर से गिनता है।`, `The multiplication put ${q} groups of ${k} together. Division counts those groups again.`),
        explanation: hiEn(`${k} × ${q} = ${p} ↔ ${p} ÷ ${k} = ${q}। Multiplication और division एक-दूसरे को undo करते हैं।`, `${k} × ${q} = ${p} ↔ ${p} ÷ ${k} = ${q}. Multiplication and division undo each other.`),
      };
    },
  ],
};

/* ------------------------------------------------------------------------ */
/* Science: water, weather, and states of matter                             */
/* ------------------------------------------------------------------------ */

const sceneQuestion = (
  facet: CheckFacet,
  scene: ScienceSceneId | null,
  prompt: LocalizedText,
  options: readonly DraftOption[],
  hint: LocalizedText,
  explanation: LocalizedText,
  value?: number,
): CheckDraft => ({
  facet,
  prompt,
  visual: scene ? { kind: "scene", scene, value } : undefined,
  response: { kind: "choice", options },
  hint,
  explanation,
});

const THERMOMETER_READINGS = [
  { value: 38, word: hiEn("गरम", "hot") },
  { value: 22, word: hiEn("गुनगुना", "warm") },
  { value: 10, word: hiEn("हल्का ठंडा", "cool") },
  { value: 2, word: hiEn("ठंडा", "cold") },
] as const;

const SCIENCE_BANKS: Readonly<Record<string, readonly [readonly CheckDraft[], readonly CheckDraft[], readonly CheckDraft[]]>> = {
  // Rain & Puddles
  "mt_TlLE4cZgOr": [
    [
      sceneQuestion("see", "rain-cloud", hiEn("बारिश की बूँदें कहाँ से गिरती हैं?", "Where do raindrops fall from?"), [
        right(hiEn("बादलों से—बादल पानी की बहुत छोटी बूँदों से बने हैं", "From clouds—clouds are made of tiny water droplets")),
        wrong(hiEn("आसमान के छेदों से", "From holes in the sky"), "rain-source-unknown", hiEn("आसमान में कोई टंकी या छेद नहीं है। बूँदें बादलों में बनती हैं और भारी होकर गिरती हैं।", "The sky has no tank or holes. Drops form inside clouds and fall when they grow heavy.")),
        wrong(hiEn("Sun से", "From the Sun"), "rain-source-unknown", hiEn("Sun पानी को गरम करता है, पर बारिश बादलों से गिरती है।", "The Sun warms water, but rain falls from clouds.")),
      ], hiEn("Picture में बूँदें किस चीज़ के नीचे से शुरू हो रही हैं?", "In the picture, what are the drops falling out of?"), hiEn("बादल की छोटी बूँदें आपस में मिलकर बड़ी और भारी होती हैं, फिर बारिश बनकर गिरती हैं।", "Tiny cloud droplets join into bigger, heavier drops, which then fall as rain.")),
      sceneQuestion("apply", "rain-cloud", hiEn("एक बादल घना और गहरा grey होता जा रहा है। आगे क्या हो सकता है?", "A cloud is growing thick and dark grey. What might happen next?"), [
        right(hiEn("बारिश—उसकी बूँदें भारी होकर गिर सकती हैं", "Rain—its droplets may grow heavy and fall")),
        wrong(hiEn("बादल धुआँ छोड़ेगा", "The cloud will give off smoke"), "cloud-is-smoke", hiEn("बादल धुआँ नहीं है—वह पानी की बूँदों से बना है। घना बादल मतलब ज़्यादा बूँदें।", "A cloud is not smoke—it is made of water droplets. A thick cloud means more droplets.")),
        wrong(hiEn("कुछ नहीं—बादल से पानी नहीं आता", "Nothing—clouds do not give water"), "rain-source-unknown", hiEn("बारिश बादलों से ही गिरती है।", "Rain does fall from clouds.")),
      ], hiEn("बादल किससे बना है?", "What is a cloud made of?"), hiEn("गहरे बादल में बहुत सारी पानी की बूँदें होती हैं। जब वे भारी होती हैं, बारिश गिरती है।", "A dark cloud holds a great many water droplets. When they grow heavy, rain falls.")),
    ],
    [
      sceneQuestion("explain", "sun-puddle", hiEn("धूप में puddle छोटा होता गया। उसका पानी कहाँ गया?", "In the sunshine the puddle kept shrinking. Where did its water go?"), [
        right(hiEn("हवा में—invisible जलवाष्प बनकर", "Into the air—as invisible water vapour")),
        wrong(hiEn("Sun ने पानी खत्म कर दिया", "The Sun destroyed the water"), "water-disappears-when-dry", hiEn("पानी खत्म नहीं होता। वह तरल से invisible गैस बनकर हवा में चला जाता है।", "Water is not destroyed. It changes from liquid to an invisible gas and moves into the air.")),
        wrong(hiEn("सारा पानी सिर्फ ज़मीन में चला गया", "All of it only soaked into the ground"), "water-only-underground", hiEn("थोड़ा पानी ज़मीन सोख सकती है, पर पक्की सड़क का puddle भी सूखता है—पानी हवा में जाता है।", "The ground can soak up some, but puddles dry on hard roads too—the water goes into the air.")),
      ], hiEn("न दिखना और खत्म होना—क्या एक ही बात है?", "Is 'cannot see it' the same as 'gone'?"), hiEn("Sun की गरमी से पानी evaporate होकर जलवाष्प बनता है। जलवाष्प दिखती नहीं, पर हवा में मौजूद रहती है।", "The Sun's warmth evaporates the water into vapour. Vapour cannot be seen, but it is still there in the air.")),
      sceneQuestion("apply", "wet-clothes", hiEn("गीले कपड़े धूप में सूख गए। कपड़ों का पानी कहाँ गया?", "Wet clothes dried in the sunshine. Where did their water go?"), [
        right(hiEn("हवा में, जलवाष्प बनकर", "Into the air, as water vapour")),
        wrong(hiEn("पानी हमेशा के लिए खत्म हो गया", "The water was gone forever"), "water-disappears-when-dry", hiEn("पानी खत्म नहीं हुआ—उसने अपनी अवस्था और जगह बदली।", "The water was not destroyed—it changed its state and its place.")),
        wrong(hiEn("कपड़ों ने पानी खा लिया", "The clothes ate the water"), "water-disappears-when-dry", hiEn("सूखे कपड़े गीले कपड़ों से भारी नहीं होते—पानी उनसे निकलकर हवा में गया।", "Dry clothes are not heavier than wet ones—the water left them and went into the air.")),
      ], hiEn("Puddle और गीले कपड़े—दोनों में एक ही बात हो रही है।", "Puddles and wet clothes—the same thing is happening in both."), hiEn("कपड़ों का पानी evaporate होकर हवा में जलवाष्प बन गया।", "The water in the clothes evaporated into vapour in the air.")),
    ],
    [
      sceneQuestion("explain", "cycle", hiEn("कल की बारिश का पानी आज puddle में है। कुछ दिन बाद यही पानी कहाँ हो सकता है?", "Yesterday's rain is in a puddle today. Where could that same water be in a few days?"), [
        right(hiEn("फिर हवा में, फिर बादल में, फिर बारिश में—यह चलता रहता है", "In the air, then a cloud, then rain again—it keeps going")),
        wrong(hiEn("कहीं नहीं—सूखने के बाद पानी खत्म", "Nowhere—once it dries, water is finished"), "water-disappears-when-dry", hiEn("सूखना पानी की यात्रा का एक पड़ाव है, अंत नहीं।", "Drying is one stop on water's journey, not the end.")),
        wrong(hiEn("हमेशा उसी puddle में", "Always in that same puddle"), "rain-source-unknown", hiEn("Puddle सूखते हैं—पानी ऊपर जाता है और कहीं और बरसता है।", "Puddles dry up—the water rises and rains down somewhere else.")),
      ], hiEn("पानी ऊपर जाता है। क्या वह कभी नीचे लौटता है?", "Water goes up. Does it ever come back down?"), hiEn("पानी ऊपर जाता है, बादल बनता है, और बारिश बनकर लौटता है—बार-बार।", "Water rises, becomes cloud, and returns as rain—again and again.")),
    ],
  ],

  // Temperature & Thermometers
  "mt_PrWc-HZzDl": [
    [
      sceneQuestion("explain", null, hiEn("तापमान हमें क्या बताता है?", "What does temperature tell us?"), [
        right(hiEn("कोई चीज़ कितनी गरम या ठंडी है", "How hot or cold something is")),
        wrong(hiEn("कोई चीज़ कितनी भारी है", "How heavy something is"), "temperature-meaning-confused", hiEn("भार तराज़ू से मापते हैं। तापमान गरमी और ठंडक का माप है।", "Weight is measured with a scale. Temperature measures hotness and coldness.")),
        wrong(hiEn("कितनी बारिश होगी", "How much rain will fall"), "temperature-meaning-confused", hiEn("बारिश अलग चीज़ है। तापमान सिर्फ गरम-ठंडा बताता है।", "Rain is a different thing. Temperature only tells hot and cold.")),
      ], hiEn("Thermometer पर °C लिखा होता है। वह किस चीज़ को मापता है?", "A thermometer shows °C. What does it measure?"), hiEn("तापमान = कोई चीज़ कितनी गरम या ठंडी है। ज़्यादा °C मतलब ज़्यादा गरम।", "Temperature is how hot or cold something is. More °C means hotter.")),
      sceneQuestion("apply", null, hiEn("एक कप चाय 70°C की है और दूसरी 40°C की। कौन-सी ज़्यादा गरम है?", "One cup of tea is at 70°C and another is at 40°C. Which is hotter?"), [
        right(hiEn("70°C वाली", "The 70°C cup")),
        wrong(hiEn("40°C वाली", "The 40°C cup"), "temperature-words-mismatched", hiEn("बड़ा °C number मतलब ज़्यादा गरम।", "A bigger °C number means hotter.")),
        wrong(hiEn("दोनों बराबर—दोनों चाय हैं", "Both are the same—they are both tea"), "temperature-meaning-confused", hiEn("एक ही चीज़ अलग-अलग तापमान पर हो सकती है।", "The same thing can be at different temperatures.")),
      ], hiEn("कौन-सा number बड़ा है?", "Which number is bigger?"), hiEn("70°C, 40°C से ज़्यादा है, इसलिए वह चाय ज़्यादा गरम है।", "70°C is more than 40°C, so that tea is hotter.")),
    ],
    [
      sceneQuestion("see", "thermometer", hiEn("बाहर की हवा का तापमान मापने के लिए कौन-सा tool चाहिए?", "Which tool measures the temperature of the air outside?"), [
        right(hiEn("Thermometer", "A thermometer")),
        wrong(hiEn("Ruler (पैमाना)", "A ruler"), "temperature-meaning-confused", hiEn("Ruler लंबाई मापता है, गरमी नहीं।", "A ruler measures length, not hotness.")),
        wrong(hiEn("तराज़ू", "A weighing scale"), "temperature-meaning-confused", hiEn("तराज़ू भार मापता है।", "A scale measures weight.")),
      ], hiEn("इस tool पर °C के निशान होते हैं।", "This tool has °C markings."), hiEn("Thermometer तापमान मापता है। उसका liquid गरमी में ऊपर और ठंडक में नीचे जाता है।", "A thermometer measures temperature. Its liquid rises when warm and falls when cold."), 30),
    ],
    THERMOMETER_READINGS.map((reading) => sceneQuestion(
      "see",
      "thermometer",
      hiEn(`Thermometer ${reading.value}°C दिखा रहा है। हवा कैसी है?`, `The thermometer reads ${reading.value}°C. How does the air feel?`),
      THERMOMETER_READINGS.map((option) => option.value === reading.value
        ? right(option.word)
        : wrong(option.word, "temperature-words-mismatched", hiEn(`${option.word.hi} ${option.value}°C के आस-पास होता है, ${reading.value}°C पर नहीं।`, `${option.word.en[0].toUpperCase()}${option.word.en.slice(1)} is closer to ${option.value}°C, not ${reading.value}°C.`))),
      hiEn("गरम ≈ 30°C से ऊपर, गुनगुना ≈ 20°C, हल्का ठंडा ≈ 10°C, ठंडा ≈ 0°C के पास।", "Hot is above about 30°C, warm about 20°C, cool about 10°C, cold near 0°C."),
      hiEn(`${reading.value}°C = ${reading.word.hi}। तापमान का number और शब्द एक ही चीज़ बताते हैं।`, `${reading.value}°C is ${reading.word.en}. The number and the word describe the same thing.`),
      reading.value,
    )),
  ],

  // Cloud Types
  "mt_IhWzO4sQPg": [
    ([
      ["cumulus", hiEn("fluffy, रुई जैसे ढेर", "puffy, cotton-like heaps")],
      ["stratus", hiEn("आसमान पर फैली सपाट grey परत", "a flat grey layer across the sky")],
      ["cirrus", hiEn("बहुत ऊँचे, पतले, बालों जैसे wisps", "thin, wispy streaks very high up")],
    ] as const).map(([scene, look]) => sceneQuestion(
      "see",
      scene,
      hiEn(`यह बादल ${look.hi} जैसा है। इसका नाम क्या है?`, `This cloud looks like ${look.en}. What is it called?`),
      (["cumulus", "stratus", "cirrus"] as const).map((name) => name === scene
        ? right(same(name[0].toUpperCase() + name.slice(1)))
        : wrong(same(name[0].toUpperCase() + name.slice(1)), "cloud-types-mixed", hiEn(`${name[0].toUpperCase() + name.slice(1)} ${name === "cumulus" ? "fluffy ढेर" : name === "stratus" ? "सपाट परत" : "ऊँचे पतले wisps"} होते हैं।`, `${name[0].toUpperCase() + name.slice(1)} clouds are ${name === "cumulus" ? "puffy heaps" : name === "stratus" ? "flat layers" : "high, thin wisps"}.`))),
      hiEn("Cumulus = ढेर, Stratus = परत, Cirrus = बाल जैसे wisps।", "Cumulus = heap, stratus = layer, cirrus = wisp of hair."),
      hiEn(`यह ${scene[0].toUpperCase() + scene.slice(1)} है। तीनों प्रकार पानी की छोटी बूँदों या बर्फ के कणों से बने होते हैं।`, `This is ${scene}. All three types are made of tiny water droplets or ice crystals.`),
    )),
    [
      sceneQuestion("explain", "cumulus", hiEn("बादल किससे बने होते हैं?", "What are clouds made of?"), [
        right(hiEn("पानी की बहुत छोटी बूँदों से, जो ठंडी हुई जलवाष्प से बनीं", "Tiny water droplets that formed when water vapour cooled")),
        wrong(hiEn("धुएँ से", "Smoke"), "cloud-is-smoke", hiEn("धुआँ जलने से बनता है। बादल पानी की बूँदें हैं—इसीलिए उनसे बारिश होती है।", "Smoke comes from burning. Clouds are water droplets—that is why they can rain.")),
        wrong(hiEn("Invisible जलवाष्प से, इसलिए बादल भी गैस है", "Invisible water vapour, so a cloud is a gas"), "clouds-are-vapour", hiEn("जलवाष्प दिखती नहीं, पर बादल दिखता है। बादल तब बनता है जब vapour ठंडी होकर तरल बूँदें बनती है।", "Vapour is invisible, but you can see a cloud. A cloud forms when vapour cools into liquid droplets.")),
      ], hiEn("अगर बादल invisible गैस होता, तो क्या हम उसे देख पाते?", "If a cloud were an invisible gas, could we see it?"), hiEn("गरम जलवाष्प ऊपर ठंडी हवा में condense होकर छोटी तरल बूँदें बनाती है। उन बूँदों का झुंड बादल है।", "Warm vapour rises, cools, and condenses into tiny liquid droplets. A crowd of those droplets is a cloud.")),
      sceneQuestion("explain", "cold-glass", hiEn("ऊपर उठती जलवाष्प बादल कब बनती है?", "When does rising water vapour turn into a cloud?"), [
        right(hiEn("जब वह ऊपर ठंडी होकर छोटी बूँदें बनाती है (condensation)", "When it cools high up and forms tiny droplets (condensation)")),
        wrong(hiEn("जब वह और गरम होती है", "When it gets even hotter"), "condensation-link-missing", hiEn("गरम होने से vapour और फैलती है। बूँदें ठंडा होने पर बनती हैं—जैसे ठंडे glass पर।", "Heating spreads vapour out more. Droplets form on cooling—just like on a cold glass.")),
        wrong(hiEn("जब हवा उसे धुएँ में बदल देती है", "When the wind turns it into smoke"), "cloud-is-smoke", hiEn("हवा पानी को धुआँ नहीं बनाती। बादल पानी ही है।", "Wind does not turn water into smoke. A cloud is still water.")),
      ], hiEn("ठंडे glass के बाहर बूँदें कैसे आती हैं?", "How do drops appear outside a cold glass?"), hiEn("ठंडक से vapour condense होकर बूँदें बनाती है—ठंडे glass पर भी, और ऊँचे आसमान में भी।", "Cooling makes vapour condense into droplets—on a cold glass and high in the sky alike.")),
    ],
    [
      sceneQuestion("apply", "cumulus", hiEn("आसमान में छोटे, सफ़ेद, अलग-अलग cumulus बादल हैं। मौसम कैसा रहने की सम्भावना है?", "The sky has small, white, separate cumulus clouds. What weather is likely?"), [
        right(hiEn("ज़्यादातर साफ़ और अच्छा मौसम", "Mostly fair, pleasant weather")),
        wrong(hiEn("तेज़ तूफ़ान पक्का है", "A big storm for sure"), "cloud-types-mixed", hiEn("छोटे सफ़ेद cumulus आम तौर पर अच्छे मौसम के होते हैं। ऊँचे, गहरे, बढ़ते बादल तूफ़ान लाते हैं।", "Small white cumulus usually mean fair weather. Tall, dark, growing clouds bring storms.")),
        wrong(hiEn("पूरे दिन लगातार बूँदा-बाँदी", "Drizzle all day long"), "cloud-types-mixed", hiEn("दिन भर की बूँदा-बाँदी आम तौर पर flat grey stratus से होती है।", "All-day drizzle usually comes from flat grey stratus.")),
      ], hiEn("सफ़ेद और छोटे बादल—भारी हैं या हल्के?", "Small white clouds—heavy with water, or light?"), hiEn("छोटे सफ़ेद cumulus = अच्छा मौसम। बादल देखकर अंदाज़ा लगाना मौसम पढ़ना है।", "Small white cumulus mean fair weather. Reading clouds is reading the weather.")),
      sceneQuestion("apply", "stratus", hiEn("पूरा आसमान flat grey stratus से ढका है। मौसम कैसा रहेगा?", "The whole sky is covered by flat grey stratus. What weather is likely?"), [
        right(hiEn("बादल छाए रहेंगे, हल्की बूँदा-बाँदी हो सकती है", "Overcast, perhaps light drizzle")),
        wrong(hiEn("तेज़ धूप वाला साफ़ दिन", "A bright, sunny, clear day"), "cloud-types-mixed", hiEn("Stratus की परत Sun को ढक लेती है।", "A stratus layer covers the Sun.")),
        wrong(hiEn("बर्फ़ीला तूफ़ान", "A blizzard"), "cloud-types-mixed", hiEn("Stratus आम तौर पर हल्की बूँदा-बाँदी लाते हैं, तूफ़ान नहीं।", "Stratus usually bring light drizzle, not storms.")),
      ], hiEn("सपाट परत Sun के साथ क्या करती है?", "What does a flat layer do to the Sun?"), hiEn("Stratus = overcast आसमान और कभी-कभी बूँदा-बाँदी।", "Stratus mean an overcast sky and sometimes drizzle.")),
    ],
  ],

  // Where water is found on Earth
  "mt_nRF_VRntrW": [
    [
      sceneQuestion("see", "ocean-share", hiEn("धरती पर पानी कहाँ-कहाँ मिलता है? सबसे पूरा जवाब चुनो।", "Where is water found on Earth? Choose the most complete answer."), [
        right(hiEn("समुद्र, नदियाँ, glaciers, ज़मीन के नीचे, और हवा में भी", "Oceans, rivers, glaciers, underground, and in the air too")),
        wrong(hiEn("सिर्फ समुद्र और नदियों में", "Only in oceans and rivers"), "water-only-visible-liquid", hiEn("Glaciers की बर्फ, ज़मीन के नीचे का पानी और हवा की जलवाष्प भी पानी है।", "Glacier ice, groundwater, and vapour in the air are water too.")),
        wrong(hiEn("सिर्फ नलों और बोतलों में", "Only in taps and bottles"), "water-only-visible-liquid", hiEn("नल का पानी नदियों, झीलों और ज़मीन के नीचे से आता है।", "Tap water comes from rivers, lakes, and underground.")),
      ], hiEn("क्या हवा में भी पानी हो सकता है?", "Can there be water in the air, too?"), hiEn("पानी तरल (समुद्र, नदी, ज़मीन के नीचे), ठोस (glacier), और गैस (हवा में vapour) के रूप में मिलता है।", "Water is found as liquid (oceans, rivers, underground), solid (glaciers), and gas (vapour in the air).")),
    ],
    [
      sceneQuestion("explain", "ice-melt", hiEn("Glacier की बर्फ और नदी का पानी—क्या दोनों पानी हैं?", "Glacier ice and river water—are both water?"), [
        right(hiEn("हाँ—बर्फ ठोस पानी है, नदी तरल पानी", "Yes—ice is solid water; the river is liquid water")),
        wrong(hiEn("नहीं—बर्फ अलग पदार्थ है", "No—ice is a different substance"), "ice-is-not-water", hiEn("बर्फ पिघलकर वही पानी बन जाती है। सिर्फ अवस्था अलग है।", "Ice melts back into the same water. Only its state differs.")),
        wrong(hiEn("सिर्फ नदी का पानी असली पानी है", "Only river water is real water"), "ice-is-not-water", hiEn("बर्फ, पानी और जलवाष्प—तीनों एक ही पदार्थ की तीन अवस्थाएँ हैं।", "Ice, water, and vapour are three states of one substance.")),
      ], hiEn("बर्फ पिघलने पर क्या बनती है?", "What does ice become when it melts?"), hiEn("बर्फ = ठोस पानी। पिघलने पर वही पानी तरल बनता है।", "Ice is solid water. When it melts, the same water becomes liquid.")),
    ],
    [
      sceneQuestion("see", "ocean-share", hiEn("धरती का सबसे ज़्यादा पानी कहाँ है?", "Where is most of Earth's water?"), [
        right(hiEn("समुद्रों में", "In the oceans")),
        wrong(hiEn("नदियों और झीलों में", "In rivers and lakes"), "water-only-visible-liquid", hiEn("नदियाँ और झीलें बहुत छोटा हिस्सा हैं। लगभग सारा पानी समुद्रों में है।", "Rivers and lakes are a tiny share. Almost all water is in the oceans.")),
        wrong(hiEn("बादलों में", "In the clouds"), "clouds-are-vapour", hiEn("बादलों में किसी भी समय बहुत कम पानी होता है।", "Clouds hold very little of Earth's water at any moment.")),
      ], hiEn("Picture में सबसे बड़ा नीला हिस्सा किसका है?", "Whose is the biggest blue share in the picture?"), hiEn("धरती का लगभग 97% पानी समुद्रों में है—खारा पानी।", "About 97% of Earth's water is in the oceans—salty water.")),
    ],
  ],

  // Heating & Cooling Changes
  "mt_Pl-nsjYGZ3": [
    [
      sceneQuestion("see", "ice-melt", hiEn("धूप में रखी ice-cream पिघल गई। यह कौन-सा बदलाव है?", "Ice-cream left in the sun turned runny. Which change is this?"), [
        right(hiEn("Melting: ठोस → तरल", "Melting: solid → liquid")),
        wrong(hiEn("Freezing: तरल → ठोस", "Freezing: liquid → solid"), "melt-freeze-reversed", hiEn("Freezing में तरल ठोस बनता है। यहाँ ठोस ice-cream तरल हो गई।", "Freezing turns liquid into solid. Here the solid ice-cream turned liquid.")),
        wrong(hiEn("Dissolving: घुलना", "Dissolving"), "melt-dissolve-confused", hiEn("घुलना तब होता है जब कोई चीज़ तरल में मिल जाती है। यहाँ गरमी से ठोस तरल बना—melting।", "Dissolving is mixing into a liquid. Here heat turned a solid into a liquid—melting.")),
      ], hiEn("पहले कैसी थी—ठोस या तरल? अब कैसी है?", "What was it before—solid or liquid? What is it now?"), hiEn("गरमी से ठोस तरल बने, वह melting है।", "When heat turns a solid into a liquid, that is melting.")),
      sceneQuestion("see", "freezer-tray", hiEn("Freezer में रखी पानी की tray बर्फ बन गई। यह कौन-सा बदलाव है?", "A tray of water in the freezer became ice. Which change is this?"), [
        right(hiEn("Freezing: तरल → ठोस", "Freezing: liquid → solid")),
        wrong(hiEn("Melting: ठोस → तरल", "Melting: solid → liquid"), "melt-freeze-reversed", hiEn("Melting में ठोस तरल बनता है। यहाँ तरल पानी ठोस बर्फ बना।", "Melting turns a solid into a liquid. Here liquid water became solid ice.")),
        wrong(hiEn("Evaporating: तरल → गैस", "Evaporating: liquid → gas"), "evaporation-condensation-confused", hiEn("Evaporation में पानी गैस बनता है। बर्फ ठोस है।", "Evaporation makes a gas. Ice is a solid.")),
      ], hiEn("ठंडक से तरल क्या बनता है?", "What does cold turn a liquid into?"), hiEn("ठंडा होने पर तरल पानी 0°C पर ठोस बर्फ बनता है—freezing।", "Cooled to 0°C, liquid water becomes solid ice—freezing.")),
    ],
    [
      sceneQuestion("see", "thermometer", hiEn("पानी किस तापमान पर जमता है और किस पर उबलता है?", "At what temperatures does water freeze and boil?"), [
        right(hiEn("0°C पर जमता, 100°C पर उबलता", "Freezes at 0°C, boils at 100°C")),
        wrong(hiEn("100°C पर जमता, 0°C पर उबलता", "Freezes at 100°C, boils at 0°C"), "melt-freeze-reversed", hiEn("उबलना बहुत गरमी में होता है, जमना ठंडक में। इसलिए 0°C जमना, 100°C उबलना।", "Boiling needs great heat; freezing happens in the cold. So 0°C freezes, 100°C boils.")),
        wrong(hiEn("10°C पर जमता, 50°C पर उबलता", "Freezes at 10°C, boils at 50°C"), "temperature-meaning-confused", hiEn("10°C का पानी तरल रहता है, और 50°C का पानी गरम है पर उबलता नहीं।", "Water at 10°C stays liquid, and water at 50°C is hot but not boiling.")),
      ], hiEn("Freezer बहुत ठंडा होता है; उबलता kettle बहुत गरम।", "A freezer is very cold; a boiling kettle is very hot."), hiEn("पानी 0°C पर जमता है और 100°C पर उबलता है। ये पानी के दो पक्के निशान हैं।", "Water freezes at 0°C and boils at 100°C. These are water's two fixed marks."), 100),
    ],
    [
      sceneQuestion("explain", "particles", hiEn("पानी गरम करने पर उसके कणों का क्या होता है?", "What happens to water's particles when it is heated?"), [
        right(hiEn("कणों को ज़्यादा ऊर्जा मिलती है और वे तेज़ हिलते हैं; कुछ गैस बनकर निकल जाते हैं", "They gain energy and move faster; some escape as gas")),
        wrong(hiEn("कण गरमी से फूलकर बड़े हो जाते हैं", "The particles swell up and grow bigger"), "heat-slows-particles", hiEn("कण खुद बड़े नहीं होते। वे तेज़ हिलते हैं और ज़्यादा फैलते हैं।", "The particles do not grow. They move faster and spread out more.")),
        wrong(hiEn("कण धीमे हो जाते हैं", "The particles slow down"), "heat-slows-particles", hiEn("ठंडक कणों को धीमा करती है। गरमी उन्हें तेज़ करती है।", "Cooling slows particles down. Heating speeds them up.")),
      ], hiEn("Picture में गरम तरफ़ के कण कैसे चल रहे हैं?", "In the picture, how do the particles on the warm side move?"), hiEn("गरमी = ज़्यादा ऊर्जा = तेज़ कण। सबसे तेज़ कण तरल छोड़कर गैस बन जाते हैं—यही evaporation है।", "Heat means more energy and faster particles. The fastest ones leave the liquid as gas—that is evaporation.")),
    ],
  ],

  // Changes & Separation Vocabulary
  "mt_ahSqW_kK1b": [
    [
      sceneQuestion("explain", "sugar-tea", hiEn("चाय में चीनी हिलाई और वह दिखनी बंद हो गई। चीनी ने क्या किया?", "Sugar was stirred into tea and can no longer be seen. What did the sugar do?"), [
        right(hiEn("Dissolve—घुल गई; चीनी अभी भी चाय में है, इसलिए चाय मीठी है", "Dissolved—it is still in the tea, which is why the tea is sweet")),
        wrong(hiEn("Melt—पिघल गई", "Melted"), "melt-dissolve-confused", hiEn("Melting गरमी से ठोस का तरल बनना है। चीनी चाय में घुली है—मिल गई है।", "Melting is heat turning a solid into a liquid. The sugar has mixed into the tea—it dissolved.")),
        wrong(hiEn("गायब हो गई", "Vanished"), "water-disappears-when-dry", hiEn("अगर गायब होती तो चाय मीठी न होती। चीनी अभी भी वहीं है।", "If it had vanished, the tea would not be sweet. The sugar is still there.")),
      ], hiEn("चाय का स्वाद बताता है कि चीनी अभी भी है या नहीं।", "The taste of the tea tells you whether the sugar is still there."), hiEn("Dissolve = किसी तरल में घुलकर मिल जाना। Melt = गरमी से ठोस का तरल बनना। दोनों अलग हैं।", "Dissolve means mixing into a liquid. Melt means heat turning a solid to liquid. They are different.")),
      sceneQuestion("explain", "sugar-tea", who(
        hiEn("चीनी चाय में melt हो गई।", "The sugar melted in the tea."),
        hiEn("चीनी dissolve हुई। Melt तो गरमी से ठोस का तरल बनना है।", "The sugar dissolved. Melting is heat turning a solid into a liquid."),
      ), [
        right(hiEn("Meera", "Meera")),
        wrong(hiEn("Kabir", "Kabir"), "melt-dissolve-confused", hiEn("चीनी को पिघलाने के लिए बहुत ज़्यादा गरमी चाहिए। चाय में वह घुलती है।", "Melting sugar needs far more heat. In tea, it dissolves.")),
        wrong(hiEn("दोनों शब्द एक ही हैं", "Both words mean the same"), "melt-dissolve-confused", hiEn("Ice-cube पिघलता है; नमक पानी में घुलता है। शब्द अलग बदलाव बताते हैं।", "An ice cube melts; salt dissolves in water. The words name different changes.")),
      ], hiEn("क्या चीनी को पिघलाने के लिए चाय काफ़ी गरम है?", "Is tea hot enough to melt sugar on its own?"), hiEn("सही science word सही बदलाव बताता है: dissolve ≠ melt।", "The precise word names the precise change: dissolve is not melt.")),
    ],
    [
      sceneQuestion("see", "sand-water", hiEn("रेत को पानी में हिलाया, फिर वह नीचे बैठ गई। रेत कैसी है?", "Sand was stirred into water and then settled at the bottom. What is sand?"), [
        right(hiEn("Insoluble—पानी में नहीं घुलती", "Insoluble—it does not dissolve in water")),
        wrong(hiEn("Soluble—पानी में घुलती है", "Soluble—it dissolves in water"), "melt-dissolve-confused", hiEn("अगर घुलती, तो नीचे दिखाई न देती। रेत अलग दिख रही है।", "If it dissolved, you would not see it at the bottom. The sand is still separate.")),
        wrong(hiEn("Melted—पिघल गई", "Melted"), "melt-dissolve-confused", hiEn("रेत पिघली नहीं—वह ठोस दाने बनकर बैठी है।", "The sand did not melt—it settled as solid grains.")),
      ], hiEn("क्या तुम्हें रेत अब भी अलग दिख रही है?", "Can you still see the sand separately?"), hiEn("Insoluble चीज़ें पानी में नहीं घुलतीं और अलग दिखती रहती हैं—रेत, कंकड़।", "Insoluble things do not dissolve in water and stay visible—sand, pebbles.")),
      sceneQuestion("see", "salt-water", hiEn("नमक को पानी में हिलाया और वह दिखना बंद हो गया, पर पानी खारा हो गया। नमक कैसा है?", "Salt stirred into water can no longer be seen, but the water tastes salty. What is salt?"), [
        right(hiEn("Soluble—पानी में घुलता है", "Soluble—it dissolves in water")),
        wrong(hiEn("Insoluble—पानी में नहीं घुलता", "Insoluble—it does not dissolve"), "melt-dissolve-confused", hiEn("नमक दिख नहीं रहा पर स्वाद में है—वह घुल गया है।", "The salt is not visible but you can taste it—it dissolved.")),
        wrong(hiEn("Evaporated—हवा में उड़ गया", "Evaporated into the air"), "evaporation-condensation-confused", hiEn("अगर उड़ जाता, तो पानी खारा न होता।", "If it had left, the water would not taste salty.")),
      ], hiEn("खारा स्वाद क्या बताता है?", "What does the salty taste tell you?"), hiEn("Soluble चीज़ें पानी में घुल जाती हैं—दिखती नहीं, पर मौजूद रहती हैं।", "Soluble things dissolve in water—unseen, but still present.")),
    ],
    [
      sceneQuestion("explain", "mirror", hiEn("गरम पानी से नहाने के बाद ठंडे शीशे पर बूँदें आ गईं। यह evaporation है या condensation?", "After a hot shower, droplets cover the cold mirror. Is this evaporation or condensation?"), [
        right(hiEn("Condensation—हवा की जलवाष्प ठंडी होकर तरल बूँदें बनी", "Condensation—vapour in the air cooled into liquid droplets")),
        wrong(hiEn("Evaporation", "Evaporation"), "evaporation-condensation-confused", hiEn("Evaporation में तरल गैस बनता है। यहाँ गैस (vapour) वापस तरल बूँदें बनी।", "Evaporation turns liquid into gas. Here gas (vapour) turned back into liquid drops.")),
        wrong(hiEn("शीशे के अंदर से पानी रिसा", "Water leaked out of the glass"), "condensation-link-missing", hiEn("शीशे के अंदर पानी नहीं होता। बूँदें हवा की vapour से आईं।", "There is no water inside a mirror. The drops came from vapour in the air.")),
      ], hiEn("बूँदें गैस से बनीं या गैस बनीं?", "Did the drops come from a gas, or turn into a gas?"), hiEn("Evaporation: तरल → गैस। Condensation: गैस → तरल। शीशे पर condensation है।", "Evaporation: liquid → gas. Condensation: gas → liquid. The mirror shows condensation.")),
      sceneQuestion("explain", "sun-puddle", hiEn("धूप में गीला फर्श सूख गया। यह evaporation है या condensation?", "A wet floor dried in the sunshine. Is this evaporation or condensation?"), [
        right(hiEn("Evaporation—तरल पानी जलवाष्प बना", "Evaporation—liquid water became vapour")),
        wrong(hiEn("Condensation", "Condensation"), "evaporation-condensation-confused", hiEn("Condensation में बूँदें बनती हैं। यहाँ बूँदें गायब होकर vapour बनीं।", "Condensation makes droplets. Here the water left as vapour.")),
        wrong(hiEn("पानी खत्म हो गया", "The water was destroyed"), "water-disappears-when-dry", hiEn("पानी खत्म नहीं हुआ—वह हवा में vapour बनकर चला गया।", "The water was not destroyed—it went into the air as vapour.")),
      ], hiEn("पानी तरल से किस अवस्था में गया?", "Which state did the water change into?"), hiEn("तरल → गैस = evaporation।", "Liquid → gas is evaporation.")),
    ],
  ],

  // The Water Cycle
  "mt_fhqVdj4BYr": [
    [
      {
        facet: "see",
        prompt: hiEn("समुद्र से शुरू करो। जल चक्र के तीन चरण क्रम में रखो।", "Start at the sea. Put the three stages of the water cycle in order."),
        visual: { kind: "scene", scene: "cycle" },
        response: {
          kind: "order",
          tiles: [
            hiEn("Evaporation: Sun की गरमी से पानी जलवाष्प बनता है", "Evaporation: the Sun's heat turns water into vapour"),
            hiEn("Condensation: ऊपर ठंडी होकर vapour बादल की बूँदें बनती है", "Condensation: vapour cools high up into cloud droplets"),
            hiEn("Precipitation: भारी बूँदें बारिश बनकर गिरती हैं", "Precipitation: heavy drops fall as rain"),
          ],
        },
        hint: hiEn("पानी पहले ऊपर जाता है, फिर बादल बनता है, फिर…", "Water rises first, then becomes cloud, then…"),
        explanation: hiEn("Evaporation → condensation → precipitation, और फिर से evaporation। तीन चरण, एक चक्र।", "Evaporation → condensation → precipitation, then evaporation again. Three stages, one loop."),
      },
    ],
    [
      sceneQuestion("explain", "cycle", hiEn("जल चक्र को कौन चलाता है?", "What drives the water cycle?"), [
        right(hiEn("Sun—उसकी गरमी पानी को evaporate करती है", "The Sun—its heat evaporates water")),
        wrong(hiEn("बादल खुद नया पानी बनाते हैं", "Clouds make new water by themselves"), "rain-source-unknown", hiEn("बादल नया पानी नहीं बनाते—वे evaporate हुए पानी से बनते हैं।", "Clouds do not make new water—they form from water that evaporated.")),
        wrong(hiEn("चाँद", "The Moon"), "rain-source-unknown", hiEn("चाँद ज्वार-भाटे पर असर डालता है, पर evaporation की गरमी Sun से आती है।", "The Moon affects tides, but the heat for evaporation comes from the Sun.")),
      ], hiEn("पानी को ऊपर उठाने के लिए ऊर्जा कहाँ से आती है?", "Where does the energy to lift water come from?"), hiEn("Sun पानी को गरम करता है → evaporation → बाकी चक्र चलता है। Sun के बिना चक्र रुक जाएगा।", "The Sun warms water → evaporation → the rest of the cycle follows. Without the Sun, the cycle would stall.")),
    ],
    [
      sceneQuestion("explain", "cycle", hiEn("जल चक्र कहाँ से शुरू होता है और कहाँ खत्म?", "Where does the water cycle start and where does it end?"), [
        right(hiEn("कहीं नहीं—यह एक loop है जो चलता रहता है", "Nowhere—it is a loop that keeps going")),
        wrong(hiEn("समुद्र से शुरू, बारिश पर खत्म", "It starts at the sea and ends with rain"), "cycle-has-start-end", hiEn("बारिश का पानी फिर समुद्र, नदी या puddle में जाता है और फिर evaporate होता है।", "Rainwater returns to seas, rivers, or puddles and evaporates again.")),
        wrong(hiEn("बादल से शुरू, समुद्र पर हमेशा के लिए रुक जाता है", "It starts at a cloud and stops forever at the sea"), "cycle-has-start-end", hiEn("समुद्र का पानी Sun से गरम होकर फिर ऊपर जाता है।", "Sea water is warmed by the Sun and rises again.")),
      ], hiEn("Picture के तीरों को उंगली से follow करो। क्या कोई आखिरी तीर है?", "Follow the arrows in the picture with your finger. Is there a last arrow?"), hiEn("चक्र का मतलब है गोल-गोल: कोई पहला या आखिरी चरण नहीं।", "A cycle goes round and round: there is no first or last stage.")),
    ],
  ],

  // Evaporation & the Water Cycle
  "mt_Qkewo5M3_c": [
    [
      sceneQuestion("explain", null, hiEn("Evaporation और condensation में क्या फर्क है?", "What is the difference between evaporation and condensation?"), [
        right(hiEn("Evaporation: तरल → गैस; condensation: गैस → तरल", "Evaporation: liquid → gas; condensation: gas → liquid")),
        wrong(hiEn("Evaporation: गैस → तरल; condensation: तरल → गैस", "Evaporation: gas → liquid; condensation: liquid → gas"), "evaporation-condensation-confused", hiEn("उल्टा हो गया। Puddle का सूखना evaporation है—तरल गैस बनता है।", "They are reversed. A drying puddle is evaporation—liquid becomes gas.")),
        wrong(hiEn("दोनों में पानी खत्म हो जाता है", "In both, water is destroyed"), "water-disappears-when-dry", hiEn("दोनों में पानी रहता है—सिर्फ उसकी अवस्था बदलती है।", "In both, the water remains—only its state changes.")),
      ], hiEn("Puddle सूखना और ठंडे glass पर बूँदें—कौन किसका उल्टा है?", "A drying puddle and drops on a cold glass—which is the reverse of which?"), hiEn("Evaporation और condensation एक-दूसरे के उल्टे हैं। दोनों में वही पानी रहता है।", "Evaporation and condensation are opposites. The same water is there in both.")),
      sceneQuestion("see", "cold-glass", hiEn("ठंडे पानी के glass के बाहर बूँदें आ गईं। ये बूँदें कहाँ से आईं?", "Drops appeared on the outside of a glass of cold water. Where did they come from?"), [
        right(hiEn("हवा की जलवाष्प से, जो ठंडे glass को छूकर condense हुई", "From water vapour in the air, which condensed on the cold glass")),
        wrong(hiEn("Glass के अंदर का पानी दीवार से रिस गया", "Water inside leaked through the glass"), "condensation-link-missing", hiEn("Glass पानी को बाहर नहीं जाने देता। बूँदें बाहर की हवा से आईं।", "Glass does not let water through. The drops came from the air outside.")),
        wrong(hiEn("ठंडक ने नया पानी बना दिया", "The cold made brand-new water"), "condensation-link-missing", hiEn("ठंडक नया पानी नहीं बनाती—वह हवा में पहले से मौजूद vapour को तरल बनाती है।", "Cold does not create water—it turns vapour already in the air into liquid.")),
      ], hiEn("अगर बाहर की हवा बिल्कुल सूखी हो, तो क्या बूँदें बनेंगी?", "If the air outside were completely dry, would drops form?"), hiEn("हवा में invisible vapour होती है। ठंडी सतह पर वह condense होकर बूँदें बनाती है।", "Air carries invisible vapour. On a cold surface it condenses into drops.")),
    ],
    [
      {
        facet: "apply",
        prompt: hiEn("एक puddle की पानी की यात्रा को क्रम में रखो।", "Put one puddle's water journey in order."),
        visual: { kind: "scene", scene: "cycle" },
        response: {
          kind: "order",
          tiles: [
            hiEn("Puddle में तरल पानी", "Liquid water in a puddle"),
            hiEn("गरमी से invisible जलवाष्प बनी", "Warmth turns it into invisible vapour"),
            hiEn("ऊपर ठंडी होकर बादल की बूँदें बनीं", "It cools high up into cloud droplets"),
            hiEn("भारी बूँदें बारिश बनकर लौटीं", "Heavy drops fall back as rain"),
          ],
        },
        hint: hiEn("पानी पहले नीचे से ऊपर जाता है, फिर ऊपर से नीचे।", "Water goes from low to high first, then high to low."),
        explanation: hiEn("Puddle → vapour (evaporation) → बादल (condensation) → बारिश (precipitation)। वही पानी, पूरी यात्रा।", "Puddle → vapour (evaporation) → cloud (condensation) → rain (precipitation). The same water, the whole journey."),
      },
    ],
    [
      sceneQuestion("apply", "two-puddles", hiEn("दो बराबर puddles हैं: एक धूप में, एक छाँव में। कौन पहले सूखेगा?", "Two equal puddles: one in the sun, one in the shade. Which dries first?"), [
        right(hiEn("धूप वाला—ज़्यादा गरमी से तेज़ evaporation", "The sunny one—more warmth means faster evaporation")),
        wrong(hiEn("छाँव वाला", "The shady one"), "temperature-rate-unlinked", hiEn("छाँव ठंडी है। ठंडक में पानी के कण धीमे चलते हैं, इसलिए evaporation धीमा।", "Shade is cooler. In the cool, water particles move slower, so evaporation is slower.")),
        wrong(hiEn("दोनों बिल्कुल एक साथ", "Both at exactly the same time"), "temperature-rate-unlinked", hiEn("तापमान अलग है, इसलिए evaporation की गति भी अलग होगी।", "Their temperatures differ, so their evaporation speeds differ too.")),
      ], hiEn("गरमी से पानी के कणों की speed का क्या होता है?", "What does warmth do to the speed of water particles?"), hiEn("ज़्यादा तापमान → कण तेज़ → ज़्यादा कण गैस बनकर निकलते हैं → puddle जल्दी सूखता है।", "Higher temperature → faster particles → more escape as gas → the puddle dries sooner.")),
      sceneQuestion("apply", "wet-clothes", who(
        hiEn("कपड़े सिर्फ तब सूखते हैं जब पानी उबलता है।", "Clothes only dry when the water boils."),
        hiEn("कपड़े बिना उबले भी सूखते हैं—गरमी से evaporation तेज़ होता है।", "Clothes dry without boiling—warmth just makes evaporation faster."),
      ), [
        right(hiEn("Meera", "Meera")),
        wrong(hiEn("Kabir", "Kabir"), "evaporation-requires-boiling", hiEn("रस्सी पर टँगे कपड़े कभी 100°C नहीं होते, फिर भी सूखते हैं। Evaporation किसी भी तापमान पर होता है।", "Clothes on a line never reach 100°C, yet they dry. Evaporation happens at any temperature.")),
        wrong(hiEn("दोनों नहीं—कपड़े हवा से सूखते हैं, गरमी का कोई लेना-देना नहीं", "Neither—wind dries clothes; warmth has nothing to do with it"), "temperature-rate-unlinked", hiEn("हवा मदद करती है, पर गरमी भी evaporation को तेज़ करती है।", "Wind helps, but warmth also speeds up evaporation.")),
      ], hiEn("सर्दियों में भी कपड़े सूखते हैं—बस धीरे।", "Clothes dry in winter too—just more slowly."), hiEn("Evaporation उबले बिना होता है। तापमान उसकी गति तय करता है।", "Evaporation happens without boiling. Temperature sets its speed.")),
    ],
  ],
};

/* ------------------------------------------------------------------------ */
/* Assembly and evaluation                                                   */
/* ------------------------------------------------------------------------ */

export const CHECKABLE_TOPIC_IDS: readonly string[] = [
  ...Object.keys(MATH_GENERATORS),
  ...Object.keys(SCIENCE_BANKS),
];

function draftFor(topicId: string, evidenceIndex: EvidenceIndex, variant: number): CheckDraft | null {
  if (Object.hasOwn(MATH_GENERATORS, topicId)) return MATH_GENERATORS[topicId][evidenceIndex](variant);
  if (Object.hasOwn(SCIENCE_BANKS, topicId)) return pick(SCIENCE_BANKS[topicId][evidenceIndex], variant);
  return null;
}

/** How many distinct checks exist for one evidence statement before variants repeat. */
export function variantCount(topicId: string, evidenceIndex: EvidenceIndex) {
  if (Object.hasOwn(SCIENCE_BANKS, topicId)) return SCIENCE_BANKS[topicId][evidenceIndex].length;
  return Object.hasOwn(MATH_GENERATORS, topicId) ? 5 : 0;
}

export function checkFor(topicId: string, evidenceIndex: EvidenceIndex, variant = 0): UnderstandingCheck | null {
  if (!Number.isInteger(variant) || variant < 0) return null;
  const draft = draftFor(topicId, evidenceIndex, variant);
  if (!draft) return null;
  const id = `${topicId}~${evidenceIndex}~${variant}`;
  let response: CheckResponse;
  if (draft.response.kind === "choice") {
    const ordered = seededOrder(draft.response.options, id);
    response = {
      kind: "choice",
      options: ordered.map((option, index) => ({
        id: `choice-${index + 1}`,
        label: option.label,
        correct: option.correct,
        misconceptionId: option.misconceptionId ?? null,
        why: option.why ?? null,
        visual: option.visual ?? null,
      })),
    };
  } else if (draft.response.kind === "order") {
    const tiles = draft.response.tiles.map((label, index) => ({ id: `step-${index + 1}`, label }));
    let display = seededOrder(tiles.map((tile) => tile.id), id);
    if (display.every((tileId, index) => tileId === tiles[index].id)) display = [...display.slice(1), display[0]];
    response = { kind: "order", tiles, display };
  } else {
    response = draft.response;
  }
  return {
    id,
    topicId,
    evidenceIndex,
    variant,
    facet: draft.facet,
    prompt: draft.prompt,
    visual: draft.visual ?? null,
    response,
    hint: draft.hint,
    explanation: draft.explanation,
  };
}

export function evaluateCheck(check: UnderstandingCheck, answer: CheckAnswer): CheckOutcome {
  const response = check.response;
  if (response.kind === "choice" && answer.kind === "choice") {
    const option = response.options.find((candidate) => candidate.id === answer.optionId);
    if (!option) return { correct: false, misconceptionId: null, why: null };
    return { correct: option.correct, misconceptionId: option.misconceptionId, why: option.why };
  }

  if (response.kind === "shade" && answer.kind === "shade") {
    const shaded = new Set(answer.shaded.filter((index) => Number.isInteger(index) && index >= 0 && index < response.parts));
    const count = shaded.size;
    if (count === response.target) return { correct: true, misconceptionId: null, why: null };
    if (count === response.parts - response.target) {
      return {
        correct: false,
        misconceptionId: "counted-unshaded-parts",
        why: hiEn(`${count} हिस्से रँगे, जो बाकी बचे हिस्सों की गिनती है। ऊपर वाला number रँगे हिस्से गिनता है।`, `You shaded ${count}, which is the count of the leftover parts. The top number counts the shaded parts.`),
      };
    }
    if (count === response.parts) {
      return {
        correct: false,
        misconceptionId: "numerator-denominator-confused",
        why: hiEn(`पूरा bar रँगा गया—यह ${response.parts}/${response.parts} = 1 whole है। नीचे का number कुल हिस्से बताता है, ऊपर का रँगे हुए।`, `The whole bar is shaded—that is ${response.parts}/${response.parts}, one whole. The bottom number counts all parts; the top counts shaded ones.`),
      };
    }
    return {
      correct: false,
      misconceptionId: null,
      why: hiEn(`अभी ${count} हिस्से रँगे हैं। ${response.target}/${response.parts} के लिए ${response.target} चाहिए।`, `${count} parts are shaded now. ${response.target}/${response.parts} needs ${response.target}.`),
    };
  }

  if (response.kind === "hops" && answer.kind === "hops") {
    if (answer.hops === response.target) return { correct: true, misconceptionId: null, why: null };
    if (answer.hops === response.denominator && response.target > response.denominator) {
      return {
        correct: false,
        misconceptionId: "improper-fraction-impossible",
        why: hiEn(`तुम 1 पर रुक गए, पर ${response.target}/${response.denominator} तो 1 से आगे है—छलांगें लगाते रहो।`, `You stopped at 1, but ${response.target}/${response.denominator} lies beyond 1—keep hopping.`),
      };
    }
    return {
      correct: false,
      misconceptionId: null,
      why: hiEn(`तुम ${answer.hops}/${response.denominator} पर रुके। हर छलांग 1/${response.denominator} है—निशाने तक गिनो।`, `You stopped at ${answer.hops}/${response.denominator}. Each hop is 1/${response.denominator}—count to the target.`),
    };
  }

  if (response.kind === "order" && answer.kind === "order") {
    const correct = answer.tileIds.length === response.tiles.length
      && response.tiles.every((tile, index) => answer.tileIds[index] === tile.id);
    if (correct) return { correct: true, misconceptionId: null, why: null };
    const firstWrong = response.tiles.findIndex((tile, index) => answer.tileIds[index] !== tile.id);
    const misconceptionId: MisconceptionId | null = check.topicId === "mt_fhqVdj4BYr" || check.topicId === "mt_Qkewo5M3_c"
      ? "evaporation-condensation-confused"
      : null;
    return {
      correct: false,
      misconceptionId,
      why: hiEn(`चरण ${firstWrong + 1} दोबारा देखो: पानी पहले किस अवस्था में बदलता है?`, `Look again at step ${firstWrong + 1}: which change has to happen first?`),
    };
  }

  return { correct: false, misconceptionId: null, why: null };
}
