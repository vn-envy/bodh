import {
  DEFAULT_NARRATION_LANGUAGE,
  localized,
  type LocalizedText,
  type NarrationLanguage,
} from "./narration-language.ts";

// Bump the public URL whenever authored narration changes. These files are
// intentionally immutable in browsers, so a new version prevents a child from
// hearing stale copy after a language or script refinement.
export const EVAPORATION_NARRATION_VERSION = "evaporation-v2" as const;

export type EvaporationCueTarget =
  | "puddle"
  | "water-boundary"
  | "sun"
  | "surface"
  | "vapour-tracker"
  | "invisible-note"
  | "cool-air"
  | "droplets"
  | "cloud"
  | "rain"
  | "cycle";

export type EvaporationNarrationBeat = Readonly<{
  id: string;
  text: LocalizedText;
  key: LocalizedText;
  target: EvaporationCueTarget;
}>;

export type ResolvedEvaporationNarrationBeat = Readonly<{
  id: string;
  text: string;
  key: string;
  target: EvaporationCueTarget;
}>;

const hiEn = (hi: string, en: string): LocalizedText => ({ hi, en });

export const EVAPORATION_CONCEPT_STAGES = [
  {
    id: "notice-puddle",
    eyebrow: hiEn("पहला सुराग", "First clue"),
    title: hiEn("पानी को जाने से पहले पहचानो", "Notice the water before it moves"),
    screenKey: hiEn("पानी का छोटा गड्ढा = तरल पानी", "Puddle = liquid water"),
    action: hiEn("पानी को खोजना शुरू करें", "Track the puddle"),
    evidence: hiEn("पानी की सीमा पर निशान लग गया", "The water boundary is marked"),
    narration: [
      {
        id: "name-liquid-water",
        text: hiEn(
          "पानी के इस छोटे गड्ढे को ध्यान से देखो। अभी पानी तरल है: उसके छोटे-छोटे कण पास हैं, बह सकते हैं, और जमीन पर एक साफ़ सीमा बनाते हैं।",
          "Look closely at this puddle. The water is liquid: its tiny particles stay close, can flow, and make a clear boundary on the ground.",
        ),
        key: hiEn("अभी: तरल पानी", "Now: liquid water"),
        target: "puddle",
      },
      {
        id: "mark-the-amount",
        text: hiEn(
          "Bodh ने पानी के किनारे पर निशान लगाया है। थोड़ी देर बाद आकार छोटा दिखे, तो हम पूछेंगे कि वही पानी किस अवस्था और किस जगह गया।",
          "Bodh has marked the puddle's edge. If it looks smaller later, we will ask which state and location that same water moved into.",
        ),
        key: hiEn("किनारा याद रखो", "Remember the edge"),
        target: "water-boundary",
      },
      {
        id: "matter-does-not-vanish",
        text: hiEn(
          "हम शुरुआत में पानी के खत्म होने का अनुमान नहीं लगाएंगे। विज्ञान में पहले सबूत खोजते हैं: दिखाई देने वाली मात्रा बदली, पर पदार्थ कहाँ गया यह अभी जाँचना है।",
          "We will not begin by assuming the water was destroyed. In science we track evidence first: the visible amount changed, but we still need to test where the matter went.",
        ),
        key: hiEn("गायब मानना अभी जल्दी है", "Too soon to call it gone"),
        target: "puddle",
      },
    ],
  },
  {
    id: "sun-heat",
    eyebrow: hiEn("ऊर्जा का धक्का", "An energy push"),
    title: hiEn("सूरज पानी को गर्म करता है", "Sunlight warms the water"),
    screenKey: hiEn("गर्मी → कण और तेज़ चलते हैं", "Heat → particles move faster"),
    action: hiEn("धूप आने दें", "Let the sunshine in"),
    evidence: hiEn("सतह के कणों को ऊर्जा मिली", "Surface particles gained energy"),
    narration: [
      {
        id: "sun-transfers-energy",
        text: hiEn(
          "सूरज पानी को पीता नहीं है। धूप ऊर्जा देती है, जिससे पानी और उसके आस-पास की जमीन धीरे-धीरे गर्म होती है।",
          "The Sun does not drink the water. Sunlight transfers energy, slowly warming the puddle and the ground around it.",
        ),
        key: hiEn("सूरज ऊर्जा देता है", "Sunlight transfers energy"),
        target: "sun",
      },
      {
        id: "surface-particles-speed-up",
        text: hiEn(
          "ऊर्जा मिलने पर पानी के कण तेज़ चलने लगते हैं। सतह पर कुछ कणों के पास तरल से निकलकर हवा में जाने जितनी ऊर्जा हो जाती है।",
          "With more energy, water particles move faster. At the surface, some gain enough energy to leave the liquid and enter the air.",
        ),
        key: hiEn("सतह से निकलते कण", "Particles leave at the surface"),
        target: "surface",
      },
      {
        id: "no-boiling-needed",
        text: hiEn(
          "इसे वाष्पीकरण कहते हैं, और इसके लिए पानी का उबलना ज़रूरी नहीं। वाष्पीकरण सामान्य तापमान पर भी सतह से हो सकता है; ज़्यादा गर्मी बस इसे तेज़ कर सकती है।",
          "This is evaporation, and the puddle does not need to boil. Evaporation can happen from the surface at ordinary temperatures; extra warmth can simply make it faster.",
        ),
        key: hiEn("उबलना ज़रूरी नहीं", "Boiling is not required"),
        target: "surface",
      },
    ],
  },
  {
    id: "invisible-vapour",
    eyebrow: hiEn("नई अवस्था, नई जगह", "New state, new location"),
    title: hiEn("तरल अब अदृश्य जलवाष्प है", "Liquid becomes invisible water vapour"),
    screenKey: hiEn("तरल → अदृश्य गैस", "Liquid → invisible gas"),
    action: hiEn("Bodh का खोजी नक्शा चलाएँ", "Turn on Bodh's tracker"),
    evidence: hiEn("पानी हवा में फैला—खत्म नहीं हुआ", "Water spread into the air—it was not destroyed"),
    narration: [
      {
        id: "change-to-gas",
        text: hiEn(
          "तरल से निकले पानी के कण अब गैस हैं, जिसे जलवाष्प कहते हैं। वे हवा के कणों के बीच फैल जाते हैं, इसलिए नीचे पानी छोटा दिखता है।",
          "The water particles that left the liquid are now a gas called water vapour. They spread among the particles in the air, so the puddle looks smaller.",
        ),
        key: hiEn("जलवाष्प हवा में", "Water vapour in the air"),
        target: "vapour-tracker",
      },
      {
        id: "vapour-is-invisible",
        text: hiEn(
          "असल जलवाष्प दिखाई नहीं देता। पर्दे पर उठते बिंदु केवल Bodh का खोजी नक्शा हैं, ताकि हम अदृश्य कणों की यात्रा सोच सकें; वे दिखाई देने वाली भाप नहीं हैं।",
          "Real water vapour is invisible. The rising dots on screen are only Bodh's tracker for imagining the invisible particles; they are not visible steam.",
        ),
        key: hiEn("बिंदु = नक्शा, जलवाष्प नहीं", "Dots = tracker, not visible vapour"),
        target: "invisible-note",
      },
      {
        id: "conserve-the-water",
        text: hiEn(
          "अब सबूत जोड़ो: नीचे तरल पानी कम है और वही पानी गैस बनकर हवा में फैला है। पदार्थ नष्ट नहीं हुआ; उसकी अवस्था और जगह बदली है।",
          "Now connect the evidence: there is less liquid below because that same water has spread through the air as a gas. The matter was not destroyed; its state and location changed.",
        ),
        key: hiEn("वही पानी, नई अवस्था", "Same water, new state"),
        target: "cycle",
      },
    ],
  },
  {
    id: "cooling-cloud",
    eyebrow: hiEn("फिर से तरल", "Liquid again"),
    title: hiEn("ठंडक से तरल बूँदें बनती हैं", "Cooling makes liquid droplets"),
    screenKey: hiEn("जलवाष्प + ठंडक → बूँदें", "Vapour + cooling → droplets"),
    action: hiEn("हवा को ठंडा करें", "Cool the air"),
    evidence: hiEn("संघनन: गैस फिर तरल बनी", "Condensation: gas became liquid again"),
    narration: [
      {
        id: "vapour-meets-cool-air",
        text: hiEn(
          "ऊपर जाते हुए जलवाष्प ठंडी हवा से मिल सकती है। ठंडा होने पर कण ऊर्जा खोते हैं, धीमे होते हैं, और फिर पास आने लगते हैं।",
          "As it moves upward, water vapour can meet cooler air. With cooling, the particles lose energy, slow down, and begin coming closer together.",
        ),
        key: hiEn("ठंडी हवा में ऊर्जा कम", "Less energy in cooler air"),
        target: "cool-air",
      },
      {
        id: "condense-to-droplets",
        text: hiEn(
          "गैस का छोटी तरल बूँदों में बदलना संघनन है। यही नीचे वाले पानी के कण हैं—उन्होंने फिर से अवस्था बदली है।",
          "The change from gas into tiny liquid droplets is condensation. These are the same water particles from the puddle, changing state again.",
        ),
        key: hiEn("संघनन = गैस से तरल", "Condensation = gas to liquid"),
        target: "droplets",
      },
      {
        id: "cloud-is-droplets",
        text: hiEn(
          "बहुत सारी छोटी बूँदें साथ हों तो हमें बादल दिखाई देता है। बादल और दिखाई देने वाली सफ़ेद धुंध तरल बूँदें हैं; अदृश्य जलवाष्प नहीं।",
          "When many tiny droplets gather, we can see a cloud. Clouds and visible white mist are liquid droplets, not invisible water vapour.",
        ),
        key: hiEn("बादल = छोटी तरल बूँदें", "Cloud = tiny liquid drops"),
        target: "cloud",
      },
    ],
  },
  {
    id: "returning-rain",
    eyebrow: hiEn("चक्र पूरा", "Complete the cycle"),
    title: hiEn("बूँदें जुड़कर बारिश बनती हैं", "Droplets join and return as rain"),
    screenKey: hiEn("बादल → बारिश → धरती", "Cloud → rain → ground"),
    action: hiEn("बारिश वापस लाएँ", "Bring the rain back"),
    evidence: hiEn("पानी घूमकर धरती पर लौटा", "Water travelled back to Earth"),
    narration: [
      {
        id: "droplets-grow",
        text: hiEn(
          "बादल की छोटी तरल बूँदें आपस में टकराकर जुड़ सकती हैं। जब बूँदें भारी हो जाती हैं, हवा उन्हें ऊपर नहीं रख पाती।",
          "Tiny liquid droplets in a cloud can collide and join. When the drops become heavy enough, the air can no longer hold them up.",
        ),
        key: hiEn("छोटी बूँदें बड़ी होती हैं", "Tiny drops grow"),
        target: "cloud",
      },
      {
        id: "fall-as-rain",
        text: hiEn(
          "तब पानी वर्षण के रूप में नीचे आता है—यहाँ बारिश बनकर। वह मिट्टी, नदियों, झीलों और पानी के नए छोटे गड्ढों में लौट सकता है।",
          "The water then falls as precipitation—here, as rain. It can return to soil, rivers, lakes, and new puddles.",
        ),
        key: hiEn("वर्षण पानी नीचे लौटाता है", "Precipitation returns water"),
        target: "rain",
      },
      {
        id: "cycle-keeps-moving",
        text: hiEn(
          "अब पूरी कहानी देखो: गर्म होना, वाष्पीकरण, ठंडा होना, संघनन और बारिश। पानी खत्म नहीं हुआ; जल-चक्र में अवस्था और जगह बदलते हुए चलता रहा।",
          "Now see the whole story: heating, evaporation, cooling, condensation, and rain. The water was never destroyed; it kept moving through the water cycle by changing state and location.",
        ),
        key: hiEn("वही पानी घूमता रहता है", "The same water keeps moving"),
        target: "cycle",
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
  narration: ReadonlyArray<EvaporationNarrationBeat>;
}>;

export type EvaporationConceptStage = (typeof EVAPORATION_CONCEPT_STAGES)[number];
export type EvaporationStageId = EvaporationConceptStage["id"];

export function narrationBeatForEvaporation(
  stageId: string,
  beatId: string,
  language: NarrationLanguage = DEFAULT_NARRATION_LANGUAGE,
): ResolvedEvaporationNarrationBeat | null {
  const stage = EVAPORATION_CONCEPT_STAGES.find((candidate) => candidate.id === stageId);
  const beat = stage?.narration.find((candidate) => candidate.id === beatId);
  return beat
    ? { id: beat.id, text: localized(beat.text, language), key: localized(beat.key, language), target: beat.target }
    : null;
}
