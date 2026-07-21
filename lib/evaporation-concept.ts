import {
  DEFAULT_NARRATION_LANGUAGE,
  type LocalizedText,
  type NarrationLanguage,
} from "./narration-language.ts";

export const EVAPORATION_NARRATION_VERSION = "evaporation-v1" as const;

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
    screenKey: hiEn("Puddle = liquid water", "Puddle = liquid water"),
    action: hiEn("Puddle को track करें", "Track the puddle"),
    evidence: hiEn("पानी की सीमा mark हो गई", "The water boundary is marked"),
    narration: [
      {
        id: "name-liquid-water",
        text: hiEn(
          "इस puddle को ध्यान से देखो। अभी पानी liquid है: उसके छोटे-छोटे कण पास हैं, बह सकते हैं, और जमीन पर एक साफ़ सीमा बनाते हैं।",
          "Look closely at this puddle. The water is liquid: its tiny particles stay close, can flow, and make a clear boundary on the ground.",
        ),
        key: hiEn("अभी: liquid water", "Now: liquid water"),
        target: "puddle",
      },
      {
        id: "mark-the-amount",
        text: hiEn(
          "Bodh ने puddle के किनारे को mark किया है। थोड़ी देर बाद आकार छोटा दिखे, तो हम पूछेंगे कि वही पानी किस state और किस जगह गया।",
          "Bodh has marked the puddle's edge. If it looks smaller later, we will ask which state and location that same water moved into.",
        ),
        key: hiEn("किनारा याद रखो", "Remember the edge"),
        target: "water-boundary",
      },
      {
        id: "matter-does-not-vanish",
        text: hiEn(
          "हम शुरुआत में पानी के खत्म होने का अनुमान नहीं लगाएंगे। Science में पहले evidence track करते हैं: amount बदली दिखी, पर matter कहाँ गया यह अभी जाँचना है।",
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
    title: hiEn("Sun पानी को गर्म करता है", "Sunlight warms the water"),
    screenKey: hiEn("Heat → particles move faster", "Heat → particles move faster"),
    action: hiEn("धूप आने दें", "Let the sunshine in"),
    evidence: hiEn("Surface particles को energy मिली", "Surface particles gained energy"),
    narration: [
      {
        id: "sun-transfers-energy",
        text: hiEn(
          "Sun पानी को पीता नहीं है। धूप energy देती है, जिससे puddle और उसके आस-पास की जमीन धीरे-धीरे गर्म होती है।",
          "The Sun does not drink the water. Sunlight transfers energy, slowly warming the puddle and the ground around it.",
        ),
        key: hiEn("Sun energy देता है", "Sunlight transfers energy"),
        target: "sun",
      },
      {
        id: "surface-particles-speed-up",
        text: hiEn(
          "Energy मिलने पर water particles तेज़ चलने लगते हैं। Surface पर कुछ particles के पास liquid से निकलकर हवा में जाने जितनी energy हो जाती है।",
          "With more energy, water particles move faster. At the surface, some gain enough energy to leave the liquid and enter the air.",
        ),
        key: hiEn("Surface से निकलते particles", "Particles leave at the surface"),
        target: "surface",
      },
      {
        id: "no-boiling-needed",
        text: hiEn(
          "इसे evaporation कहते हैं, और इसके लिए puddle का boil करना ज़रूरी नहीं। Evaporation सामान्य तापमान पर भी surface से हो सकती है; ज़्यादा warmth बस इसे तेज़ कर सकती है।",
          "This is evaporation, and the puddle does not need to boil. Evaporation can happen from the surface at ordinary temperatures; extra warmth can simply make it faster.",
        ),
        key: hiEn("Boiling ज़रूरी नहीं", "Boiling is not required"),
        target: "surface",
      },
    ],
  },
  {
    id: "invisible-vapour",
    eyebrow: hiEn("State और जगह बदली", "New state, new location"),
    title: hiEn("Liquid अब invisible vapour है", "Liquid becomes invisible water vapour"),
    screenKey: hiEn("Liquid → invisible gas", "Liquid → invisible gas"),
    action: hiEn("Bodh tracker चालू करें", "Turn on Bodh's tracker"),
    evidence: hiEn("पानी हवा में फैला—खत्म नहीं हुआ", "Water spread into the air—it was not destroyed"),
    narration: [
      {
        id: "change-to-gas",
        text: hiEn(
          "Liquid से निकले water particles अब gas हैं, जिसे water vapour कहते हैं। वे हवा के particles के बीच फैल जाते हैं, इसलिए puddle छोटा दिखता है।",
          "The water particles that left the liquid are now a gas called water vapour. They spread among the particles in the air, so the puddle looks smaller.",
        ),
        key: hiEn("Water vapour हवा में", "Water vapour in the air"),
        target: "vapour-tracker",
      },
      {
        id: "vapour-is-invisible",
        text: hiEn(
          "असल water vapour दिखाई नहीं देता। Screen पर उठते dots केवल Bodh का tracker हैं, ताकि हम invisible particles की यात्रा सोच सकें; वे दिखाई देने वाला steam नहीं हैं।",
          "Real water vapour is invisible. The rising dots on screen are only Bodh's tracker for imagining the invisible particles; they are not visible steam.",
        ),
        key: hiEn("Dots = tracker, vapour नहीं", "Dots = tracker, not visible vapour"),
        target: "invisible-note",
      },
      {
        id: "conserve-the-water",
        text: hiEn(
          "अब evidence जोड़ो: नीचे liquid water कम है और वही water gas बनकर हवा में फैला है। Matter नष्ट नहीं हुआ; उसकी state और location बदली है।",
          "Now connect the evidence: there is less liquid below because that same water has spread through the air as a gas. The matter was not destroyed; its state and location changed.",
        ),
        key: hiEn("वही पानी, नई state", "Same water, new state"),
        target: "cycle",
      },
    ],
  },
  {
    id: "cooling-cloud",
    eyebrow: hiEn("फिर liquid", "Liquid again"),
    title: hiEn("Cooling से droplets बनती हैं", "Cooling makes liquid droplets"),
    screenKey: hiEn("Vapour + cooling → droplets", "Vapour + cooling → droplets"),
    action: hiEn("हवा को ठंडा करें", "Cool the air"),
    evidence: hiEn("Condensation: gas फिर liquid बनी", "Condensation: gas became liquid again"),
    narration: [
      {
        id: "vapour-meets-cool-air",
        text: hiEn(
          "ऊपर जाते हुए water vapour ठंडी हवा से मिल सकती है। Cooling होने पर particles energy खोते हैं, धीमे होते हैं, और फिर पास आने लगते हैं।",
          "As it moves upward, water vapour can meet cooler air. With cooling, the particles lose energy, slow down, and begin coming closer together.",
        ),
        key: hiEn("ठंडी हवा में energy कम", "Less energy in cooler air"),
        target: "cool-air",
      },
      {
        id: "condense-to-droplets",
        text: hiEn(
          "Gas का tiny liquid droplets में बदलना condensation है। यही puddle वाले water particles हैं—उन्होंने फिर से state बदली है।",
          "The change from gas into tiny liquid droplets is condensation. These are the same water particles from the puddle, changing state again.",
        ),
        key: hiEn("Condensation = gas से liquid", "Condensation = gas to liquid"),
        target: "droplets",
      },
      {
        id: "cloud-is-droplets",
        text: hiEn(
          "बहुत सारी tiny droplets साथ हों तो हमें cloud दिखाई देता है। Cloud और दिखाई देने वाली सफ़ेद भाप liquid droplets हैं; invisible water vapour नहीं।",
          "When many tiny droplets gather, we can see a cloud. Clouds and visible white mist are liquid droplets, not invisible water vapour.",
        ),
        key: hiEn("Cloud = tiny liquid drops", "Cloud = tiny liquid drops"),
        target: "cloud",
      },
    ],
  },
  {
    id: "returning-rain",
    eyebrow: hiEn("चक्र पूरा", "Complete the cycle"),
    title: hiEn("Droplets जुड़कर rain बनती हैं", "Droplets join and return as rain"),
    screenKey: hiEn("Cloud → rain → ground", "Cloud → rain → ground"),
    action: hiEn("बारिश वापस लाएँ", "Bring the rain back"),
    evidence: hiEn("पानी घूमकर धरती पर लौटा", "Water travelled back to Earth"),
    narration: [
      {
        id: "droplets-grow",
        text: hiEn(
          "Cloud की tiny liquid droplets आपस में टकराकर जुड़ सकती हैं। जब drops भारी हो जाती हैं, हवा उन्हें ऊपर नहीं रख पाती।",
          "Tiny liquid droplets in a cloud can collide and join. When the drops become heavy enough, the air can no longer hold them up.",
        ),
        key: hiEn("Tiny drops बड़ी होती हैं", "Tiny drops grow"),
        target: "cloud",
      },
      {
        id: "fall-as-rain",
        text: hiEn(
          "तब पानी precipitation के रूप में नीचे आता है—यहाँ rain बनकर। वह मिट्टी, rivers, lakes और नए puddles में लौट सकता है।",
          "The water then falls as precipitation—here, as rain. It can return to soil, rivers, lakes, and new puddles.",
        ),
        key: hiEn("Precipitation नीचे लौटती है", "Precipitation returns water"),
        target: "rain",
      },
      {
        id: "cycle-keeps-moving",
        text: hiEn(
          "अब पूरी कहानी देखो: heating, evaporation, cooling, condensation और rain। पानी खत्म नहीं हुआ; water cycle में state और जगह बदलते हुए चलता रहा।",
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
    ? { id: beat.id, text: beat.text[language], key: beat.key[language], target: beat.target }
    : null;
}
