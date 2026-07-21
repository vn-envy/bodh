import { reviewedProbeSelectionIsValid } from "./reviewed-probes.ts";
import type { LocalizedText } from "./narration-language.ts";
import {
  seededDoubtById,
  type SeededDoubtId,
} from "./seeded-doubts.ts";

const hiEn = (hi: string, en: string): LocalizedText => ({ hi, en });

export const SEEDED_JOURNEY_STORAGE_KEY = "bodh:seeded-live-journey:v1" as const;
export const SEEDED_JOURNEY_VERSION = "seeded-live-journey-v1" as const;
export type MathSeededDoubtId = Exclude<SeededDoubtId, "seed-09">;

type FitVisual = Readonly<{
  kind: "fit";
  wholeCount: number;
  denominator: number;
  activeUnits: number;
  unitLabel: string;
  amountLabel: string;
}>;

type ShareVisual = Readonly<{
  kind: "share";
  denominator: 3;
  shares: 4;
}>;

type PairVisual = Readonly<{
  kind: "pair";
  activeSixths: 5;
  groupSize: 2;
}>;

type ClarifyVisual = Readonly<{ kind: "clarify" }>;

export type SeedLessonVisual = FitVisual | ShareVisual | PairVisual | ClarifyVisual;

export type SeedLesson = Readonly<{
  seedId: MathSeededDoubtId;
  title: LocalizedText;
  promise: LocalizedText;
  diagnosis: LocalizedText;
  atomicIdeas: readonly [LocalizedText, LocalizedText, LocalizedText];
  interactionTitle: LocalizedText;
  interactionHelp: LocalizedText;
  completion: LocalizedText;
  receiptIdea: LocalizedText;
  visual: SeedLessonVisual;
  check: Readonly<{
    question: LocalizedText;
    options: readonly Readonly<{
      id: string;
      label: LocalizedText;
      correct: boolean;
    }>[];
    hint: LocalizedText;
  }>;
}>;

export const SEED_LESSONS: Readonly<Record<MathSeededDoubtId, SeedLesson>> = {
  "seed-01": {
    seedId: "seed-01",
    title: hiEn("Rule को picture का meaning दो", "Give the rule a picture"),
    promise: hiEn("आज हम flip rule याद नहीं करेंगे—हम देखेंगे कि 1/8, 3/4 में कितनी बार fit होता है।", "Today we will not memorise a flip rule—we will see how many one-eighths fit inside three-quarters."),
    diagnosis: hiEn("तुम्हें procedure दिख रहा है; missing bridge यह है कि division बराबर-size groups गिन रही है।", "You can see the procedure; the missing bridge is that division is counting equal-sized groups."),
    atomicIdeas: [
      hiEn("एक whole को पहले 8 बराबर pieces में बाँटो।", "Partition one whole into eight equal pieces."),
      hiEn("3/4 और 6/8 एक ही मात्रा हैं—सिर्फ pieces का नाम बदला है।", "Three-quarters and six-eighths are the same amount—the pieces have only been renamed."),
      hiEn("अब 1/8-size pieces गिनो। यही quotient का meaning है।", "Now count the one-eighth-sized pieces. That count is the meaning of the quotient."),
    ],
    interactionTitle: hiEn("हर coloured 1/8 को tap करके गिनो", "Tap and count every coloured one-eighth"),
    interactionHelp: hiEn("Bodh तुम्हारे साथ एक-एक group गिनेगा।", "Bodh will count each group with you."),
    completion: hiEn("छह 1/8 groups ने 3/4 को बिल्कुल भर दिया। इसलिए reciprocal multiplication वही group-count जल्दी लिखती है।", "Six one-eighth groups exactly fill three-quarters. Reciprocal multiplication is a compact way to record that same group count."),
    receiptIdea: hiEn("मैं division को divisor-size groups की गिनती की तरह देख सकता/सकती हूँ।", "I can see division as counting groups of the divisor's size."),
    visual: { kind: "fit", wholeCount: 1, denominator: 8, activeUnits: 6, unitLabel: "1/8", amountLabel: "3/4" },
    check: {
      question: hiEn("इस picture में division असल में क्या गिन रही थी?", "What was the division actually counting in this picture?"),
      options: [
        { id: "groups", label: hiEn("3/4 में fit होने वाले 1/8 groups", "The one-eighth groups that fit inside three-quarters"), correct: true },
        { id: "flip", label: hiEn("सिर्फ दूसरे fraction को flip करना", "Only flipping the second fraction"), correct: false },
        { id: "denominators", label: hiEn("दो denominators को जोड़ना", "Adding the two denominators"), correct: false },
      ],
      hint: hiEn("Picture में जिस size के pieces को गिना, उसे देखो।", "Look at the size of the pieces you counted in the picture."),
    },
  },
  "seed-02": {
    seedId: "seed-02",
    title: hiEn("छोटा group, बड़ी गिनती", "A smaller group can make a larger count"),
    promise: hiEn("हम 4 wholes को fifths में खोलकर देखेंगे—answer को guess नहीं करेंगे।", "We will open four wholes into fifths instead of guessing whether the answer should be smaller."),
    diagnosis: hiEn("Division amount को हमेशा छोटा नहीं करती; कभी वह पूछती है कि छोटे groups कितने हैं।", "Division does not always shrink an amount; sometimes it asks how many small groups are present."),
    atomicIdeas: [
      hiEn("हर whole में पाँच 1/5 groups होते हैं।", "Each whole contains five one-fifth groups."),
      hiEn("चार wholes में वही set चार बार दिखाई देगा।", "Across four wholes, that same set appears four times."),
      hiEn("Group छोटा है, इसलिए group-count original whole-count से बड़ा हो सकता है।", "Because the group is small, the group count can be larger than the original number of wholes."),
    ],
    interactionTitle: hiEn("हर whole खोलो और fifths को जमा होते देखो", "Open each whole and watch the fifths accumulate"),
    interactionHelp: hiEn("चार taps—हर tap एक पूरा और पाँच नए groups दिखाएगा।", "Four taps—each reveals one whole and five new groups."),
    completion: hiEn("चार wholes ने मिलकर बीस 1/5 groups बनाए। Division ने amount छोटा नहीं किया; उसने छोटे groups गिने।", "Four wholes contain twenty one-fifth groups. Division did not shrink the amount; it counted smaller groups."),
    receiptIdea: hiEn("छोटे divisor से divide करने पर group-count बढ़ सकती है।", "Dividing by a small group size can produce a larger group count."),
    visual: { kind: "fit", wholeCount: 4, denominator: 5, activeUnits: 20, unitLabel: "1/5", amountLabel: "4" },
    check: {
      question: hiEn("4 ÷ 1/5 में 1/5 क्या बताता है?", "In 4 ÷ 1/5, what does one-fifth tell us?"),
      options: [
        { id: "group-size", label: hiEn("हर गिने जाने वाले group का size", "The size of each group being counted"), correct: true },
        { id: "whole-count", label: hiEn("wholes की final गिनती", "The final number of wholes"), correct: false },
        { id: "shrink", label: hiEn("answer को छोटा करना", "That the answer must shrink"), correct: false },
      ],
      hint: hiEn("हर coloured tile पर लिखा fraction देखो।", "Look at the fraction written on every coloured tile."),
    },
  },
  "seed-03": {
    seedId: "seed-03",
    title: hiEn("एक third को चार बराबर shares में बाँटो", "Share one-third equally among four"),
    promise: hiEn("यह grouping नहीं, sharing division है—एक छोटी मात्रा को चार बराबर हिस्सों में बाँटना।", "This is sharing division, not group counting—we are splitting one small amount into four equal shares."),
    diagnosis: hiEn("Multiplication और division opposites हैं, पर action तय करने के लिए पहले meaning देखना पड़ता है।", "Multiplication and division are inverse operations, but the meaning must decide the action."),
    atomicIdeas: [
      hiEn("पहले पूरे को thirds में बाँटो और एक third चुनो।", "First partition the whole into thirds and choose one-third."),
      hiEn("अब उस एक third को चार बराबर mini-pieces में बाँटो।", "Now divide that one-third into four equal mini-pieces."),
      hiEn("पूरे में ऐसे 12 mini-pieces होते हैं; हर share उनमें से एक है।", "The whole now has twelve mini-pieces; each share is one of them."),
    ],
    interactionTitle: hiEn("1/3 को चार friends में share करो", "Share one-third among four friends"),
    interactionHelp: hiEn("पहले split करो, फिर चारों shares बाँटो।", "Split it first, then distribute all four shares."),
    completion: hiEn("एक third के चार बराबर shares में हर share पूरे का 1/12 है।", "When one-third is shared equally into four, each share is one-twelfth of the whole."),
    receiptIdea: hiEn("Fraction ÷ whole का मतलब fraction को बराबर shares में बाँटना हो सकता है।", "A fraction divided by a whole number can mean sharing that fraction equally."),
    visual: { kind: "share", denominator: 3, shares: 4 },
    check: {
      question: hiEn("हर share 1/3 से छोटा क्यों हुआ?", "Why is each share smaller than one-third?"),
      options: [
        { id: "shared", label: hiEn("क्योंकि उसी 1/3 को चार बराबर shares में बाँटा", "Because the same one-third was split into four equal shares"), correct: true },
        { id: "multiplied", label: hiEn("क्योंकि हमने 1/3 को चार बार लिया", "Because we took one-third four times"), correct: false },
        { id: "denominator-rule", label: hiEn("क्योंकि denominator हमेशा बढ़ता है", "Because denominators always increase"), correct: false },
      ],
      hint: hiEn("क्या amount बढ़ी थी, या वही amount लोगों में बँटी थी?", "Did the amount grow, or was the same amount shared?"),
    },
  },
  "seed-04": {
    seedId: "seed-04",
    title: hiEn("Denominator piece-size बताता है", "The denominator names the piece size"),
    promise: hiEn("2/3 को sixths में देखकर denominator और answer की अलग roles साफ़ करेंगे।", "We will view two-thirds in sixths to separate the denominator's role from the answer."),
    diagnosis: hiEn("बड़ा denominator छोटे unit-pieces बनाता है; वह अपने आप quotient छोटा नहीं बनाता।", "A larger denominator creates smaller unit pieces; it does not automatically make the quotient smaller."),
    atomicIdeas: [
      hiEn("हर 1/3 को दो बराबर हिस्सों में बाँटने पर 2/6 बनता है।", "Splitting every third in two turns one-third into two-sixths."),
      hiEn("इसलिए 2/3 वही मात्रा है जो 4/6।", "So two-thirds is the same amount as four-sixths."),
      hiEn("अब 1/6-size groups गिनना सीधा दिखता है।", "Now the one-sixth-sized groups can be counted directly."),
    ],
    interactionTitle: hiEn("2/3 में छिपे sixths गिनो", "Count the sixths hidden inside two-thirds"),
    interactionHelp: hiEn("हर coloured 1/6 को क्रम से tap करो।", "Tap each coloured one-sixth in order."),
    completion: hiEn("2/3 और 4/6 एक ही मात्रा हैं, इसलिए चार 1/6 groups fit होते हैं।", "Two-thirds and four-sixths are the same amount, so four one-sixth groups fit."),
    receiptIdea: hiEn("Denominator unit-size बताता है; quotient group-count बताता है।", "The denominator describes unit size; the quotient describes group count."),
    visual: { kind: "fit", wholeCount: 1, denominator: 6, activeUnits: 4, unitLabel: "1/6", amountLabel: "2/3" },
    check: {
      question: hiEn("Denominator 3 से 6 होने पर coloured amount का क्या हुआ?", "What happened to the coloured amount when thirds became sixths?"),
      options: [
        { id: "same", label: hiEn("Amount वही रही; pieces छोटे और अधिक हुए", "The amount stayed the same; the pieces became smaller and more numerous"), correct: true },
        { id: "smaller", label: hiEn("Amount आधी हो गई", "The amount was halved"), correct: false },
        { id: "larger", label: hiEn("Amount दोगुनी हो गई", "The amount doubled"), correct: false },
      ],
      hint: hiEn("Bar की coloured length को before और after सोचो।", "Think about the coloured length before and after repartitioning."),
    },
  },
  "seed-05": {
    seedId: "seed-05",
    title: hiEn("सही answer को सही meaning से जोड़ो", "Connect the right answer to the right meaning"),
    promise: hiEn("तुम्हारी calculation सही है; अब picture बताएगी कि छह किस चीज़ की गिनती है।", "Your calculation is right; now the picture will show what the six is counting."),
    diagnosis: hiEn("यह correction नहीं, connection है—procedure को group-fit meaning से जोड़ना।", "This is not a correction but a connection: linking the procedure to group-fit meaning."),
    atomicIdeas: [
      hiEn("3/4 को six equal eighths की तरह देखो।", "See three-quarters as six equal eighths."),
      hiEn("हर eighth एक divisor-size group है।", "Each eighth is one divisor-sized group."),
      hiEn("छह answer इसलिए है क्योंकि छह groups fit होते हैं—सिर्फ rule की वजह से नहीं।", "The answer is six because six groups fit, not merely because a rule says so."),
    ],
    interactionTitle: hiEn("अपनी सही calculation को picture में prove करो", "Prove your correct calculation with a picture"),
    interactionHelp: hiEn("हर 1/8 group tap करो और छह का meaning बनाओ।", "Tap each one-eighth group and build the meaning of six."),
    completion: hiEn("अब six सिर्फ calculated answer नहीं है; वह 3/4 में fit हुए six eighth-sized groups हैं।", "Now six is not just a calculated answer; it is the six eighth-sized groups that fit inside three-quarters."),
    receiptIdea: hiEn("मैं सही procedure को visual meaning से explain कर सकता/सकती हूँ।", "I can explain a correct procedure using visual meaning."),
    visual: { kind: "fit", wholeCount: 1, denominator: 8, activeUnits: 6, unitLabel: "1/8", amountLabel: "3/4" },
    check: {
      question: hiEn("Answer 6 किसकी गिनती है?", "What does the answer six count?"),
      options: [
        { id: "eighth-groups", label: hiEn("3/4 में fit हुए 1/8-size groups", "The one-eighth-sized groups fitting inside three-quarters"), correct: true },
        { id: "steps", label: hiEn("calculation में लिखी lines", "The lines written in the calculation"), correct: false },
        { id: "denominator", label: hiEn("सिर्फ denominator 8", "Only the denominator eight"), correct: false },
      ],
      hint: hiEn("जो coloured pieces तुमने tap किए, उनका size देखो।", "Look at the size of the coloured pieces you tapped."),
    },
  },
  "seed-06": {
    seedId: "seed-06",
    title: hiEn("Concept बचाओ, arithmetic slip ठीक करो", "Keep the concept; repair the arithmetic"),
    promise: hiEn("तुम्हारी fraction-division setup सही थी। हम केवल आखिरी count को picture से check करेंगे।", "Your fraction-division setup was sound. We will use a picture to check only the final count."),
    diagnosis: hiEn("Bodh को conceptual reteach नहीं करना चाहिए जब evidence सिर्फ arithmetic slip दिखाए।", "Bodh should not reteach the whole concept when the evidence points only to an arithmetic slip."),
    atomicIdeas: [
      hiEn("3/5 को tenths में लिखने पर 6/10 मिलता है।", "Writing three-fifths in tenths gives six-tenths."),
      hiEn("हर 1/10 एक counted group है।", "Each one-tenth is one counted group."),
      hiEn("30/5 की आखिरी arithmetic उसी six-group picture से check हो सकती है।", "The final arithmetic in thirty divided by five can be checked against that six-group picture."),
    ],
    interactionTitle: hiEn("सिर्फ आखिरी count verify करो", "Verify only the final count"),
    interactionHelp: hiEn("छह coloured tenths गिनो—setup को मत बदलो।", "Count the six coloured tenths; do not change the setup."),
    completion: hiEn("Picture में छह tenths हैं। इसलिए setup सही था और केवल 30 ÷ 5 की arithmetic को repair करना था।", "The picture contains six tenths. The setup was correct; only the arithmetic in thirty divided by five needed repair."),
    receiptIdea: hiEn("मैं concept error और arithmetic slip में फर्क कर सकता/सकती हूँ।", "I can distinguish a concept error from an arithmetic slip."),
    visual: { kind: "fit", wholeCount: 1, denominator: 10, activeUnits: 6, unitLabel: "1/10", amountLabel: "3/5" },
    check: {
      question: hiEn("इस doubt में Bodh को कितना reteach करना चाहिए था?", "How much should Bodh reteach for this doubt?"),
      options: [
        { id: "arithmetic-only", label: hiEn("सिर्फ आखिरी arithmetic step", "Only the final arithmetic step"), correct: true },
        { id: "all-fractions", label: hiEn("fractions की पूरी शुरुआत", "All of fractions from the beginning"), correct: false },
        { id: "nothing", label: hiEn("कुछ भी नहीं", "Nothing at all"), correct: false },
      ],
      hint: hiEn("Setup और आखिरी calculation को अलग-अलग देखो।", "Look at the setup and the final calculation separately."),
    },
  },
  "seed-07": {
    seedId: "seed-07",
    title: hiEn("साफ़ सवाल के बिना guess नहीं", "Do not guess without a readable question"),
    promise: hiEn("पहले photo या notation साफ़ करेंगे; उसके बाद ही concept journey चुनी जाएगी।", "First make the photo or notation readable; only then should Bodh choose a concept journey."),
    diagnosis: hiEn("यह learning gap नहीं, input-fidelity problem है।", "This is an input-fidelity problem, not a diagnosed learning gap."),
    atomicIdeas: [
      hiEn("Unreadable symbols से exact question पता नहीं चलता।", "Unreadable symbols do not support an exact question."),
      hiEn("Exact question के बिना misconception label लगाना unsafe है।", "Assigning a misconception without the exact question would be unsafe."),
      hiEn("साफ़ photo या typed notation माँगना सही next step है।", "Requesting a clear photo or typed notation is the correct next step."),
    ],
    interactionTitle: hiEn("सवाल दोबारा साफ़ भेजो", "Send the question clearly again"),
    interactionHelp: hiEn("Photo retake करो या equation type करो।", "Retake the photo or type the equation."),
    completion: hiEn("अब Bodh guess किए बिना सही concept चुन सकता है।", "Bodh can now select a concept without guessing."),
    receiptIdea: hiEn("मैं जानता/जानती हूँ कि कब साफ़ input माँगना चाहिए।", "I know when a clearer input is needed."),
    visual: { kind: "clarify" },
    check: {
      question: hiEn("Unreadable photo पर Bodh को क्या करना चाहिए?", "What should Bodh do with an unreadable photo?"),
      options: [
        { id: "clarify", label: hiEn("साफ़ photo या typed equation माँगनी चाहिए", "Ask for a clearer photo or a typed equation"), correct: true },
        { id: "guess", label: hiEn("सबसे likely equation guess करनी चाहिए", "Guess the most likely equation"), correct: false },
      ],
      hint: hiEn("Safety का मतलब uncertainty को छिपाना नहीं है।", "Safety means not hiding uncertainty."),
    },
  },
  "seed-08": {
    seedId: "seed-08",
    title: hiEn("Answer से पहले एक meaning check", "One meaning check before the answer"),
    promise: hiEn("Bodh answer रोकता नहीं; वह पहले देखता है कि 1/3-size groups का meaning साफ़ है या नहीं।", "Bodh is not withholding help; it first checks whether one-third-sized groups have meaning."),
    diagnosis: hiEn("Answer-only request से understanding का evidence नहीं मिलता, इसलिए एक छोटा visual probe जरूरी है।", "An answer-only request provides no evidence of understanding, so one small visual probe is necessary."),
    atomicIdeas: [
      hiEn("5/6 को पाँच sixths की तरह बनाओ।", "Build five-sixths from five sixth-sized pieces."),
      hiEn("एक 1/3 group दो sixths के बराबर है।", "One one-third group is equal to two sixths."),
      hiEn("Pairs बनाओ: दो पूरे groups और एक आधा group दिखाई देगा।", "Make pairs: two whole groups and one half-group will appear."),
    ],
    interactionTitle: hiEn("Sixths को 1/3-size pairs में group करो", "Group the sixths into one-third-sized pairs"),
    interactionHelp: hiEn("दो full pairs और आखिरी half-pair खोलो।", "Reveal two full pairs and the final half-pair."),
    completion: hiEn("पाँच sixths में दो पूरे 1/3 groups और एक half-group fit होता है—यानी 2 1/2 groups।", "Five-sixths contains two complete one-third groups and one half-group—two and a half groups in all."),
    receiptIdea: hiEn("मैं answer से पहले divisor-size groups का meaning check कर सकता/सकती हूँ।", "I can check the meaning of divisor-sized groups before accepting an answer."),
    visual: { kind: "pair", activeSixths: 5, groupSize: 2 },
    check: {
      question: hiEn("आखिरी अकेला 1/6, 1/3 group का कितना हिस्सा है?", "What fraction of a one-third group is the final one-sixth?"),
      options: [
        { id: "half", label: hiEn("आधा group", "Half a group"), correct: true },
        { id: "whole", label: hiEn("एक पूरा group", "One whole group"), correct: false },
        { id: "third", label: hiEn("एक-third group", "One-third of a group"), correct: false },
      ],
      hint: hiEn("एक full 1/3 group में कितने sixths चाहिए?", "How many sixths are needed for one full one-third group?"),
    },
  },
} as const;

export function seedLessonById(id: unknown) {
  return typeof id === "string" && Object.hasOwn(SEED_LESSONS, id)
    ? SEED_LESSONS[id as MathSeededDoubtId]
    : null;
}

export type SeedJourneyHandoff = Readonly<{
  version: typeof SEEDED_JOURNEY_VERSION;
  seedId: SeededDoubtId;
  source: "openai";
  canonicalEquation: string;
  conceptIds: readonly string[];
  hypothesisIds: readonly string[];
  model: string;
  promptVersion: string;
  probeId: string;
  optionId: string;
}>;

function isBoundedId(value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(value);
}

function boundedIds(value: unknown, minimum = 1, maximum = 3): value is string[] {
  return Array.isArray(value)
    && value.length >= minimum
    && value.length <= maximum
    && new Set(value).size === value.length
    && value.every(isBoundedId);
}

function normaliseSeedJourneyHandoff(value: unknown): SeedJourneyHandoff | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const expectedKeys = [
    "canonicalEquation",
    "conceptIds",
    "hypothesisIds",
    "model",
    "optionId",
    "probeId",
    "promptVersion",
    "seedId",
    "source",
    "version",
  ];
  if (Object.keys(record).sort().join("|") !== expectedKeys.join("|")) return null;
  if (record.version !== SEEDED_JOURNEY_VERSION || record.source !== "openai") return null;
  const seed = seededDoubtById(record.seedId);
  if (!seed || record.canonicalEquation !== seed.problemText) return null;
  if (!boundedIds(record.conceptIds) || !boundedIds(record.hypothesisIds)) return null;
  if (!isBoundedId(record.model) || !isBoundedId(record.promptVersion)) return null;
  if (!isBoundedId(record.probeId) || !isBoundedId(record.optionId)) return null;
  if (!reviewedProbeSelectionIsValid(record.probeId, record.optionId)) return null;
  return {
    version: SEEDED_JOURNEY_VERSION,
    seedId: seed.id,
    source: "openai",
    canonicalEquation: seed.problemText,
    conceptIds: [...record.conceptIds],
    hypothesisIds: [...record.hypothesisIds],
    model: record.model,
    promptVersion: record.promptVersion,
    probeId: record.probeId,
    optionId: record.optionId,
  };
}

export function serializeSeedJourneyHandoff(value: unknown) {
  const handoff = normaliseSeedJourneyHandoff(value);
  return handoff ? JSON.stringify(handoff) : null;
}

export function parseSeedJourneyHandoff(raw: unknown) {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 1_500) return null;
  try {
    return normaliseSeedJourneyHandoff(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}
