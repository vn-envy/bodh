import type { LocalizedText } from "./narration-language";

export const SEEDED_DOUBT_IDS = [
  "seed-01",
  "seed-02",
  "seed-03",
  "seed-04",
  "seed-05",
  "seed-06",
  "seed-07",
  "seed-08",
  "seed-09",
] as const;

export type SeededDoubtId = (typeof SEEDED_DOUBT_IDS)[number];
export type SeededDoubtKind = "full-journey" | "diagnosis-sample" | "safe-retry";
export type SeededDoubtSubject = "mathematics" | "science";

export type SeededDoubt = Readonly<{
  id: SeededDoubtId;
  subject: SeededDoubtSubject;
  title: LocalizedText;
  concept: LocalizedText;
  problemText: string;
  learnerReasoning: string;
  visibleWorkText: string;
  focusTopicId: string;
  goalTopicId: string;
  kind: SeededDoubtKind;
}>;

const hiEn = (hi: string, en: string): LocalizedText => ({ hi, en });

/**
 * A learner-safe projection of the reviewed seed corpus. Expected answers,
 * acceptable labels, and evaluator-only metadata never enter the client bundle.
 */
export const SEEDED_DOUBTS: readonly SeededDoubt[] = [
  {
    id: "seed-01",
    subject: "mathematics",
    title: hiEn("Rule याद है, meaning नहीं", "I remember the rule, not the meaning"),
    concept: hiEn("Fraction division का meaning", "Meaning of fraction division"),
    problemText: "3/4 ÷ 1/8 = ?",
    learnerReasoning: "मुझे समझ नहीं आता कि इसे उल्टा करके multiply क्यों करते हैं।",
    visibleWorkText: "3/4 × 8/1",
    focusTopicId: "mt_ndGqFPWyen",
    goalTopicId: "mt_9Y96vxG_LH",
    kind: "full-journey",
  },
  {
    id: "seed-02",
    subject: "mathematics",
    title: hiEn("क्या division हमेशा छोटा करता है?", "Does division always make things smaller?"),
    concept: hiEn("Whole में छोटे groups गिनना", "Counting small groups inside a whole"),
    problemText: "4 ÷ 1/5 = ?",
    learnerReasoning: "भाग करने पर जवाब छोटा होना चाहिए, इसलिए बीस नहीं हो सकता।",
    visibleWorkText: "4 ÷ 5 = 0.8",
    focusTopicId: "mt_4Km38F4L-6",
    goalTopicId: "mt_1PAWhRhpdg",
    kind: "diagnosis-sample",
  },
  {
    id: "seed-03",
    subject: "mathematics",
    title: hiEn("एक fraction को 4 में बाँटना", "Splitting one fraction into four"),
    concept: hiEn("Unit fraction को बराबर बाँटना", "Sharing a unit fraction equally"),
    problemText: "1/3 ÷ 4 = ?",
    learnerReasoning: "Dividing and multiplying are opposites, so I multiplied by four.",
    visibleWorkText: "1/3 × 4 = 4/3",
    focusTopicId: "mt_4Km38F4L-6",
    goalTopicId: "mt_ifPDOYvUqm",
    kind: "diagnosis-sample",
  },
  {
    id: "seed-04",
    subject: "mathematics",
    title: hiEn("बड़ा denominator, छोटा answer?", "Bigger denominator, smaller answer?"),
    concept: hiEn("Denominator और unit-size", "Denominator and unit size"),
    problemText: "2/3 ÷ 1/6 = ?",
    learnerReasoning: "Denominator bada ho raha hai so answer chhota hoga, I think.",
    visibleWorkText: "2/3 ÷ 1/6 = 2/18",
    focusTopicId: "mt_ndGqFPWyen",
    goalTopicId: "mt_9Y96vxG_LH",
    kind: "diagnosis-sample",
  },
  {
    id: "seed-05",
    subject: "mathematics",
    title: hiEn("Answer सही, पर क्यों?", "The answer is right—but why?"),
    concept: hiEn("Procedure को picture से जोड़ना", "Connecting a procedure to a picture"),
    problemText: "3/4 ÷ 1/8 = ?",
    learnerReasoning: "Answer 6 hai because second fraction ko flip karna hota hai, bas.",
    visibleWorkText: "3/4 × 8/1 = 24/4 = 6",
    focusTopicId: "mt_09sySPqM9Z",
    goalTopicId: "mt_9Y96vxG_LH",
    kind: "diagnosis-sample",
  },
  {
    id: "seed-06",
    subject: "mathematics",
    title: hiEn("Concept सही, arithmetic slip", "The concept is right; arithmetic slipped"),
    concept: hiEn("Over-teach किए बिना repair", "Repairing without over-teaching"),
    problemText: "3/5 ÷ 1/10 = ?",
    learnerReasoning: "मैंने एक बटे दस को उल्टा किया और फिर simplify किया।",
    visibleWorkText: "3/5 × 10/1 = 30/5 = 5",
    focusTopicId: "mt_AabJisinfi",
    goalTopicId: "mt_9Y96vxG_LH",
    kind: "diagnosis-sample",
  },
  {
    id: "seed-07",
    subject: "mathematics",
    title: hiEn("Photo पढ़ी नहीं जा रही", "The homework photo is not readable"),
    concept: hiEn("Guess नहीं—साफ़ input माँगना", "Do not guess—ask for a clearer input"),
    problemText: "[The photographed equation is not readable]",
    learnerReasoning: "यह वाला समझ नहीं आया।",
    visibleWorkText: "",
    focusTopicId: "mt_ndGqFPWyen",
    goalTopicId: "mt_ndGqFPWyen",
    kind: "safe-retry",
  },
  {
    id: "seed-08",
    subject: "mathematics",
    title: hiEn("बस answer बता दो", "Just tell me the answer"),
    concept: hiEn("Answer से पहले understanding check", "Check understanding before an answer"),
    problemText: "5/6 ÷ 1/3 = ?",
    learnerReasoning: "Bas answer bata do, steps nahi chahiye.",
    visibleWorkText: "",
    focusTopicId: "mt_09sySPqM9Z",
    goalTopicId: "mt_9Y96vxG_LH",
    kind: "diagnosis-sample",
  },
  {
    id: "seed-09",
    subject: "science",
    title: hiEn("Puddle का पानी कहाँ गया?", "Where did the puddle water go?"),
    concept: hiEn("पानी गायब नहीं होता—state और जगह बदलता है", "Water does not vanish—it changes state and location"),
    problemText: "धूप में puddle का पानी गायब कहाँ हो गया?",
    learnerReasoning: "मुझे लगता है Sun ने पानी पी लिया या पानी खत्म हो गया—वह हवा में कैसे जा सकता है?",
    visibleWorkText: "Puddle → धूप → गायब",
    focusTopicId: "mt_TlLE4cZgOr",
    goalTopicId: "mt_Qkewo5M3_c",
    kind: "diagnosis-sample",
  },
] as const;

export function seededDoubtById(id: unknown) {
  return SEEDED_DOUBTS.find((sample) => sample.id === id) ?? null;
}

export function learningHrefForSeed(seed: SeededDoubt) {
  return seed.subject === "science"
    ? `/science/evaporation?live=${seed.id}`
    : `/learn?seed=${seed.id}`;
}

export function curatedFallbackForSeed(seed: SeededDoubt | null) {
  return seed?.subject === "science"
    ? { kind: "curated_science" as const, href: "/science/evaporation" as const, artifactKey: "science-evaporation" as const }
    : { kind: "curated_demo" as const, href: "/demo" as const, artifactKey: "curated-demo" as const };
}

/**
 * A reviewed seed may influence routing only when the submitted learner-facing
 * fields still exactly match the public fixture. Editing any field turns the
 * request back into an ordinary live doubt and prevents a forged seed id from
 * selecting a lesson artifact.
 */
export function verifiedSeededDoubtForInput(
  id: unknown,
  input: Readonly<{
    problemText: string;
    learnerReasoning: string;
    visibleWorkText?: string;
  }>,
) {
  const sample = seededDoubtById(id);
  if (!sample) return null;
  return sample.problemText === input.problemText
    && sample.learnerReasoning === input.learnerReasoning
    && sample.visibleWorkText === (input.visibleWorkText ?? "")
    ? sample
    : null;
}
