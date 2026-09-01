import { ADAPTIVE_PROBE_CATALOG, entryAtomIdForOption, requiredRepairAtomIds } from "../adaptive-repair.ts";
import { EVAPORATION_CONCEPT_STAGES } from "../evaporation-concept.ts";
import { FRACTION_CONCEPT_STAGES } from "../fraction-concept.ts";
import type { LocalizedText } from "../narration-language.ts";
import { SCIENCE_PROBE_CATALOG } from "../reviewed-probes.ts";
import type { LiteProperty } from "../json-schema-lite.ts";
import type { StationId } from "./places.ts";
import { PUDDLE_CONTROL_SCHEMA } from "./stations/puddle-sun.ts";
import { SEESAW_CONTROL_SCHEMA } from "./stations/roti-seesaw.ts";

const hiEn = (hi: string, en: string): LocalizedText => ({ hi, en });

export type StationProbeOption = Readonly<{
  id: string;
  label: LocalizedText;
  correct: boolean;
  /** Evidence attached to the growth graph, never a label on the child. */
  signals: readonly string[];
}>;

export type StationProbe = Readonly<{
  id: string;
  question: LocalizedText;
  options: readonly StationProbeOption[];
}>;

export type StationBeat = Readonly<{
  id: string;
  atomId: string;
  text: LocalizedText;
  key: LocalizedText;
  target: string;
}>;

export type StationDefinition = Readonly<{
  id: StationId;
  title: LocalizedText;
  invitation: LocalizedText;
  /** Node that the opening probe is evidence about. */
  probeNodeId: string;
  probe: StationProbe;
  /** Nodes that hands-on attempts are evidence about. */
  tinkerNodeIds: readonly string[];
  /** Ordered atoms Bodh may explain, resolved from the probe answer. */
  atomsFor(optionId: string): readonly string[];
  beatsFor(atomId: string): readonly StationBeat[];
  controls: Readonly<Record<string, LiteProperty>>;
  transfer: Readonly<{
    predictionProbe: StationProbe;
    nodeIds: readonly string[];
    instruction: LocalizedText;
  }>;
  hints: Readonly<Record<"probe" | "tinker" | "explain" | "transfer-predict" | "transfer-do" | "done", LocalizedText>>;
}>;

const scienceProbe = SCIENCE_PROBE_CATALOG[0];
const unitSizeProbe = ADAPTIVE_PROBE_CATALOG.find((probe) => probe.id === "probe-unit-size")!;

const SCIENCE_OPTION_SIGNALS: Record<string, readonly string[]> = {
  "water-invisible-vapour": [],
  "water-destroyed-by-sun": ["water-disappears-when-dry"],
  "water-only-underground": ["condensation-link-missing"],
};

const UNIT_SIZE_OPTION_SIGNALS: Record<string, readonly string[]> = {
  "unit-eighth-smaller": [],
  "unit-quarter-smaller": ["unit-fraction-size-confusion"],
  "unit-same-size": ["unit-fraction-size-confusion"],
};

function beatsFromStage(stage: { id: string; narration: readonly { id: string; text: LocalizedText; key: LocalizedText; target: string }[] } | undefined): StationBeat[] {
  if (!stage) return [];
  return stage.narration.map((beat) => ({ id: beat.id, atomId: stage.id, text: beat.text, key: beat.key, target: beat.target }));
}

export const PUDDLE_STATION: StationDefinition = {
  id: "puddle-sun",
  title: hiEn("धूप में puddle", "The puddle in the sun"),
  invitation: hiEn(
    "सूरज को पास लाओ, हवा चलाओ, ढक्कन रखो। गिनती देखो—क्या पानी कभी कम होता है?",
    "Move the sun closer, blow some wind, drop a lid. Watch the counter—does the water ever get less?",
  ),
  probeNodeId: "notice-puddle",
  probe: {
    id: scienceProbe.id,
    question: scienceProbe.question,
    options: scienceProbe.options.map((option) => ({
      id: option.id,
      label: option.label,
      correct: option.id === "water-invisible-vapour",
      signals: SCIENCE_OPTION_SIGNALS[option.id] ?? [],
    })),
  },
  tinkerNodeIds: ["sun-heat", "invisible-vapour"],
  atomsFor: () => EVAPORATION_CONCEPT_STAGES.map((stage) => stage.id),
  beatsFor: (atomId) => beatsFromStage(EVAPORATION_CONCEPT_STAGES.find((stage) => stage.id === atomId)),
  controls: { ...PUDDLE_CONTROL_SCHEMA, wait: { type: "integer", minimum: 1, maximum: 20, description: "Let this many moments pass" } },
  transfer: {
    predictionProbe: {
      id: "transfer-cold-lid",
      question: hiEn("अगर गर्म puddle पर ठंडा ढक्कन रख दें, तो क्या होगा?", "If a cold lid is placed over the warm puddle, what will happen?"),
      options: [
        { id: "lid-droplets-form", label: hiEn("ढक्कन के नीचे बूँदें बनेंगी", "Droplets will form under the lid"), correct: true, signals: [] },
        { id: "lid-water-gone", label: hiEn("पानी फिर भी गायब हो जाएगा", "The water will still disappear"), correct: false, signals: ["water-disappears-when-dry"] },
        { id: "lid-nothing", label: hiEn("कुछ नहीं बदलेगा", "Nothing will change"), correct: false, signals: ["condensation-link-missing"] },
      ],
    },
    nodeIds: ["cooling-cloud", "mt_Qkewo5M3_c"],
    instruction: hiEn("अब ढक्कन रखो और तब तक इंतज़ार करो जब तक बूँदें न दिखें। फिर जाँचो।", "Now place the lid and wait until you see droplets. Then check."),
  },
  hints: {
    probe: hiEn("गलत जवाब नहीं होता—जो सोचते हो वही चुनो।", "There is no wrong answer here—choose what you actually think."),
    tinker: hiEn("सूरज को 3 पर ले जाओ और गिनती देखो। फिर ढक्कन रखकर देखो।", "Turn the sun up to 3 and watch the counter. Then try the lid."),
    explain: hiEn("Bodh से कहो: समझाओ। हर बात के बाद picture बदलेगी।", "Ask Bodh to explain. The picture changes after every idea."),
    "transfer-predict": hiEn("ठंडी चीज़ पर भाप क्या करती है? बाथरूम का शीशा याद करो।", "What does vapour do on something cold? Think of the bathroom mirror."),
    "transfer-do": hiEn("ढक्कन चालू करो, फिर कुछ पल इंतज़ार करो।", "Switch the lid on, then wait a few moments."),
    done: hiEn("यह जगह अब तुम्हारी है। Map पर दूसरी जगह देखो।", "This place is yours now. Look at the map for somewhere new."),
  },
};

export const SEESAW_STATION: StationDefinition = {
  id: "roti-seesaw",
  title: hiEn("रोटी का तराज़ू", "The roti seesaw"),
  invitation: hiEn(
    "बाएँ पैन में 3/4 रोटी है। दाएँ पैन में 1/8 के टुकड़े रखो जब तक तराज़ू बराबर न हो जाए।",
    "The left pan holds 3/4 of a roti. Stack 1/8 pieces on the right until the seesaw balances.",
  ),
  probeNodeId: "unit-and-denominator",
  probe: {
    id: unitSizeProbe.id,
    question: unitSizeProbe.question,
    options: unitSizeProbe.options.map((option) => ({
      id: option.id,
      label: option.label,
      correct: option.id === "unit-eighth-smaller",
      signals: UNIT_SIZE_OPTION_SIGNALS[option.id] ?? [],
    })),
  },
  tinkerNodeIds: ["equivalent-repartition", "division-unknown-factor"],
  atomsFor: (optionId) => requiredRepairAtomIds(entryAtomIdForOption(optionId) ?? "unit-and-denominator"),
  beatsFor: (atomId) => beatsFromStage(FRACTION_CONCEPT_STAGES.find((stage) => stage.id === atomId)),
  controls: SEESAW_CONTROL_SCHEMA,
  transfer: {
    predictionProbe: {
      id: "transfer-two-thirds",
      question: hiEn("अब बाएँ पैन में 2/3 रोटी है और टुकड़े 1/6 के हैं। कितने टुकड़े बराबर करेंगे?", "Now the left pan holds 2/3 of a roti and the pieces are 1/6. How many pieces will balance it?"),
      options: [
        { id: "two-thirds-four", label: hiEn("चार", "Four"), correct: true, signals: [] },
        { id: "two-thirds-six", label: hiEn("छह", "Six"), correct: false, signals: ["reciprocal-rule-without-meaning"] },
        { id: "two-thirds-two", label: hiEn("दो", "Two"), correct: false, signals: ["fraction-as-two-whole-numbers"] },
      ],
    },
    nodeIds: ["division-unknown-factor", "mt_9Y96vxG_LH"],
    instruction: hiEn("अब 1/6 के टुकड़े रखकर तराज़ू बराबर करो, फिर जाँचो।", "Now balance the seesaw with 1/6 pieces, then check."),
  },
  hints: {
    probe: hiEn("एक ही रोटी को ज़्यादा टुकड़ों में बाँटो तो हर टुकड़ा कैसा होगा?", "If the same roti is cut into more pieces, what happens to each piece?"),
    tinker: hiEn("एक-एक टुकड़ा रखो और झुकाव देखो। कब बराबर होता है?", "Add one piece at a time and watch the tilt. When does it level?"),
    explain: hiEn("Bodh से कहो: समझाओ। वही पट्टी हर बात में बदलेगी।", "Ask Bodh to explain. The same strip transforms with each idea."),
    "transfer-predict": hiEn("2/3 में 1/6 कितनी बार fit होता है? पहले picture सोचो।", "How many 1/6 pieces fit in 2/3? Picture it before you answer."),
    "transfer-do": hiEn("टुकड़े बदलो और तब जाँचो जब तराज़ू सीधा दिखे।", "Change the pieces and check when the beam looks level."),
    done: hiEn("यह जगह अब तुम्हारी है। Map पर दूसरी जगह देखो।", "This place is yours now. Look at the map for somewhere new."),
  },
};

export const STATIONS: Readonly<Record<StationId, StationDefinition>> = {
  "puddle-sun": PUDDLE_STATION,
  "roti-seesaw": SEESAW_STATION,
};

export function stationById(id: unknown): StationDefinition | null {
  return id === "puddle-sun" || id === "roti-seesaw" ? STATIONS[id] : null;
}
