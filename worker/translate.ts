import { protectedGlossaryForms } from "../lib/concept-bridge";
import type { NarrationLanguage } from "../lib/narration-language";
import { translateWithSarvam, type SarvamEnv } from "./sarvam";

/**
 * Server-internal helper: translate generated slot text into the learner's
 * language with every glossary term pinned. Never exposed as a public route;
 * the generation step calls it and falls back to the authored language when it
 * returns null.
 */
export async function translateForLearner(
  text: string,
  from: NarrationLanguage,
  to: NarrationLanguage,
  env: SarvamEnv,
): Promise<string | null> {
  if (from === to) return text;
  return translateWithSarvam(text, from, to, env, protectedGlossaryForms());
}
