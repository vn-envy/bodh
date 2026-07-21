import {
  adaptiveProbeById,
  selectAdaptiveProbe,
  sessionPayloadForSelection,
} from "./adaptive-repair.ts";

export const SCIENCE_PROBE_CATALOG = [
  {
    id: "probe-water-still-exists",
    question: {
      hi: "Puddle छोटा हुआ, तो पानी के साथ क्या सम्भव है?",
      en: "The puddle became smaller. What could have happened to its water?",
    },
    options: [
      {
        id: "water-invisible-vapour",
        label: {
          hi: "पानी अभी भी है—हवा में invisible vapour बनकर",
          en: "It still exists as invisible water vapour in the air",
        },
      },
      {
        id: "water-destroyed-by-sun",
        label: { hi: "Sun ने पानी खत्म कर दिया", en: "The Sun destroyed the water" },
      },
      {
        id: "water-only-underground",
        label: {
          hi: "सारा पानी liquid बनकर जमीन के नीचे चला गया",
          en: "All of it stayed liquid and went underground",
        },
      },
    ],
  },
] as const;

const SCIENCE_HYPOTHESIS_IDS = new Set([
  "water-disappears-when-dry",
  "evaporation-requires-boiling",
  "vapour-is-visible-steam",
  "condensation-link-missing",
]);

export function reviewedProbeById(id: unknown) {
  return adaptiveProbeById(id)
    ?? SCIENCE_PROBE_CATALOG.find((probe) => probe.id === id)
    ?? null;
}

export function reviewedProbeSelectionIsValid(probeId: unknown, optionId: unknown) {
  if (sessionPayloadForSelection(probeId, optionId)) return true;
  const probe = SCIENCE_PROBE_CATALOG.find((candidate) => candidate.id === probeId);
  return Boolean(probe?.options.some((option) => option.id === optionId));
}

export function selectReviewedProbe(hypothesisIds: readonly unknown[]) {
  if (hypothesisIds.some((id) => typeof id === "string" && SCIENCE_HYPOTHESIS_IDS.has(id))) {
    return SCIENCE_PROBE_CATALOG[0];
  }
  return selectAdaptiveProbe(hypothesisIds);
}
