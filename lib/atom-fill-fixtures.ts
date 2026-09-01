import fitCount from "../data/fixtures/atom-fills/fit-count.json";
import balanceEquivalence from "../data/fixtures/atom-fills/balance-equivalence.json";
import conserveAndTrack from "../data/fixtures/atom-fills/conserve-and-track.json";
import type { AtomTemplateId } from "./atom-templates.ts";
import type { AuthoredLanguage } from "./narration-language.ts";

/**
 * Reviewed slot fills bundled with the worker. JSON stays the source of truth
 * (validated by `scripts/validate-phase0.mjs`); this module gives the worker a
 * typed handle without a runtime file read.
 */
const FIXTURES: Readonly<Record<AtomTemplateId, readonly unknown[]>> = {
  "fit-count": fitCount,
  "balance-equivalence": balanceEquivalence,
  "conserve-and-track": conserveAndTrack,
};

export function authoredFillFor(templateId: AtomTemplateId, language: AuthoredLanguage): unknown | null {
  return FIXTURES[templateId].find((fill) => (fill as { language?: unknown }).language === language) ?? null;
}
