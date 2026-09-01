/**
 * Compatibility surface for the recorded diagnostic contract (prompt `p3.7`,
 * `schemas/diagnostic-output.schema.json`). Terms are derived from
 * `concept-bridge.ts` so there is one vocabulary, but the shape sent to the
 * model and the three-way register are frozen here so the recorded 32-case
 * evaluation remains reproducible.
 */
import {
  BRIDGE_TERM_IDS,
  CONCEPT_BRIDGE_TERMS,
  isBridgeTermId,
  type BridgeTermId,
} from "./concept-bridge.ts";

export { BRIDGE_TERM_IDS, isBridgeTermId };
export type { BridgeTermId };

export type LearnerRegister = "hindi" | "hinglish" | "english";

export type HindiBridgeTerm = Readonly<{
  id: BridgeTermId;
  hindi: string;
  english: string;
  childMeaningHi: string;
}>;

export const HINDI_BRIDGE_TERMS: Readonly<Record<BridgeTermId, HindiBridgeTerm>> = Object.fromEntries(
  BRIDGE_TERM_IDS.map((id) => {
    const term = CONCEPT_BRIDGE_TERMS[id];
    return [id, { id, hindi: term.term.hi, english: term.term.en, childMeaningHi: term.childMeaning.hi }];
  }),
) as Record<BridgeTermId, HindiBridgeTerm>;

export function resolveBridgeTerms(termIds: string[]) {
  return termIds.filter(isBridgeTermId).map((termId) => HINDI_BRIDGE_TERMS[termId]);
}

export function inferLearnerRegister(value: string): LearnerRegister {
  const hasDevanagari = /[\u0900-\u097F]/.test(value);
  const hasLatinWords = /[A-Za-z]{2,}/.test(value);
  if (hasDevanagari && hasLatinWords) return "hinglish";
  if (hasDevanagari) return "hindi";
  return "english";
}
