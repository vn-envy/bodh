import type { RepairEntryAtomId } from "./adaptive-repair";

export const HERO_FIXTURE = {
  originalProblem: "3/4 ÷ 1/8 = ?",
  learnerReasoning: "मुझे समझ नहीं आता कि इसे उल्टा करके multiply क्यों करते हैं।",
  transferProblem: "रिया के पास 2/3 metre ribbon है। हर bookmark के लिए 1/6 metre ribbon चाहिए। कितने bookmarks बनेंगे?",
  originalAnswer: 6,
  transferAnswer: 4,
  targetSlots: 6,
  totalSlots: 8,
} as const;

export const CURATED_JOURNEY_ORDER = [
  "confirm",
  "probe",
  "path",
  "lab",
  "transfer",
  "return",
  "receipt",
] as const;

export type CuratedJourneyStep = (typeof CURATED_JOURNEY_ORDER)[number];

export function nextCuratedJourneyStep(step: CuratedJourneyStep): CuratedJourneyStep {
  const currentIndex = CURATED_JOURNEY_ORDER.indexOf(step);
  return CURATED_JOURNEY_ORDER[Math.min(currentIndex + 1, CURATED_JOURNEY_ORDER.length - 1)];
}

const devanagariDigits: Record<string, string> = {
  "०": "0",
  "१": "1",
  "२": "2",
  "३": "3",
  "४": "4",
  "५": "5",
  "६": "6",
  "७": "7",
  "८": "8",
  "९": "9",
};

export function normaliseWholeNumberAnswer(value: string) {
  const asciiDigits = value.replace(/[०-९]/g, (digit) => devanagariDigits[digit]);
  const compact = asciiDigits.trim().replace(/\s+/g, "");
  const integerFraction = compact.match(/^(\d+)\/1$/);
  return integerFraction ? integerFraction[1] : compact;
}

export function isCorrectWholeNumberAnswer(value: string, expected: number) {
  return normaliseWholeNumberAnswer(value) === String(expected);
}

export function isLabComplete(placedSlots: number[]) {
  const uniqueSlots = new Set(placedSlots);
  return (
    uniqueSlots.size === HERO_FIXTURE.targetSlots &&
    [...uniqueSlots].every((slot) => slot >= 0 && slot < HERO_FIXTURE.targetSlots)
  );
}

/**
 * Validates the two-layer picture used by the transfer and return exercises:
 * first choose the fraction's larger parts, then count only the smaller units
 * that belong to those chosen parts.
 */
export function isFractionGroupBuildComplete(
  selectedParts: readonly number[],
  countedUnits: readonly number[],
  numerator: number,
  denominator: number,
  unitDenominator: number,
) {
  if (
    !Number.isInteger(numerator) ||
    !Number.isInteger(denominator) ||
    !Number.isInteger(unitDenominator) ||
    numerator <= 0 ||
    denominator <= 0 ||
    unitDenominator <= 0 ||
    numerator > denominator ||
    unitDenominator % denominator !== 0
  ) return false;

  const subdivision = unitDenominator / denominator;
  const uniqueParts = new Set(selectedParts);
  const uniqueUnits = new Set(countedUnits);
  if (uniqueParts.size !== selectedParts.length || uniqueUnits.size !== countedUnits.length) return false;
  if (uniqueParts.size !== numerator) return false;
  if ([...uniqueParts].some((part) => !Number.isInteger(part) || part < 0 || part >= denominator)) return false;

  const validUnitIds = new Set([...uniqueParts].flatMap((part) =>
    Array.from({ length: subdivision }, (_, unitIndex) => part * subdivision + unitIndex)));
  return uniqueUnits.size === numerator * subdivision && [...uniqueUnits].every((unit) => validUnitIds.has(unit));
}

/** Build a measured length from the left edge so a ribbon never becomes disconnected scraps. */
export function toggleContiguousPart(
  selectedParts: readonly number[],
  part: number,
  totalParts: number,
) {
  if (!Number.isInteger(part) || !Number.isInteger(totalParts) || part < 0 || part >= totalParts) {
    return [...selectedParts];
  }
  const selected = new Set(selectedParts);
  let prefixLength = 0;
  while (prefixLength < totalParts && selected.has(prefixLength)) prefixLength += 1;
  const prefix = Array.from({ length: prefixLength }, (_, index) => index);
  if (part < prefixLength) return prefix.slice(0, part);
  if (part === prefixLength) return [...prefix, part];
  return prefix;
}

/**
 * A single curated response can only choose a safe place to begin. It never
 * marks an earlier concept complete or mastered.
 */
export function curatedProbeEntryAtomId(answer: unknown): RepairEntryAtomId {
  return answer === "4" ? "unit-and-denominator" : "chosen-whole";
}

/** Pure add/remove transition for the six interactive slots in the fraction lab. */
export function toggleLabTile(
  placedSlots: readonly number[],
  slot: number,
  targetSlots = HERO_FIXTURE.targetSlots,
) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= targetSlots) return [...placedSlots];
  return placedSlots.includes(slot)
    ? placedSlots.filter((placedSlot) => placedSlot !== slot)
    : [...placedSlots, slot];
}
