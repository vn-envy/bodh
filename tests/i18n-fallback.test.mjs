import assert from "node:assert/strict";
import test from "node:test";
import {
  authoredLanguageFor,
  isNarrationLanguage,
  localized,
  localizedFrom,
  NARRATION_LANGUAGES,
  NARRATION_SPEECH_LOCALE,
} from "../lib/narration-language.ts";
import { tamilOverlayFor, tamilOverlayIsReviewed, tamilOverlaySize } from "../lib/tamil-overlay.ts";
import {
  BRIDGE_TERM_IDS,
  CONCEPT_BRIDGE_TERMS,
  inferLearnerRegister,
  protectedGlossaryForms,
} from "../lib/concept-bridge.ts";
import { HINDI_BRIDGE_TERMS, inferLearnerRegister as inferDiagnosticRegister } from "../lib/hindi-bridge.ts";
import { narrationBeatFor } from "../lib/fraction-concept.ts";
import { narrationBeatForEvaporation } from "../lib/evaporation-concept.ts";
import { speechInputLocale } from "../lib/speech-input.ts";

test("Tamil is a first-class learner language with an Indian locale", () => {
  assert.deepEqual([...NARRATION_LANGUAGES], ["hi", "en", "ta"]);
  assert.equal(isNarrationLanguage("ta"), true);
  assert.equal(isNarrationLanguage("fr"), false);
  assert.equal(NARRATION_SPEECH_LOCALE.ta, "ta-IN");
  assert.equal(speechInputLocale("ta"), "ta-IN");
  assert.equal(authoredLanguageFor("ta"), "en");
  assert.equal(authoredLanguageFor("hi"), "hi");
});

test("Tamil copy falls back to English, never to a blank, and uses the overlay when present", () => {
  const authored = { hi: "हर", en: "Bodh will point here" };
  assert.equal(localized(authored, "hi"), "हर");
  assert.equal(localized(authored, "en"), "Bodh will point here");
  assert.equal(localized(authored, "ta"), tamilOverlayFor("Bodh will point here"));
  assert.match(localized(authored, "ta"), /[\u0B80-\u0BFF]/, "overlay entry must be Tamil script");

  const unmapped = { hi: "कुछ", en: "An unmapped sentence for the fallback test" };
  assert.equal(localized(unmapped, "ta"), unmapped.en);

  assert.equal(localizedFrom({ hi: "अ", en: "b", ta: "த" }, "ta"), "த");
  assert.equal(localizedFrom({ hi: "अ", en: "b" }, "ta"), "b");
  assert.ok(tamilOverlaySize() > 20);
  assert.equal(tamilOverlayIsReviewed("Bodh Van"), true);
  assert.equal(tamilOverlayIsReviewed("never-authored"), false);
});

test("authored narration resolves for Tamil through the same fallback rule", () => {
  const fraction = narrationBeatFor("chosen-whole", "name-the-whole", "ta");
  const english = narrationBeatFor("chosen-whole", "name-the-whole", "en");
  assert.ok(fraction && english);
  assert.equal(fraction.text, tamilOverlayFor(english.text) ?? english.text);

  const science = narrationBeatForEvaporation("invisible-vapour", "vapour-is-invisible", "ta");
  assert.ok(science);
  assert.equal(typeof science.text, "string");
  assert.ok(science.text.length > 0);
});

test("the concept bridge carries every term in all three languages", () => {
  for (const id of BRIDGE_TERM_IDS) {
    const term = CONCEPT_BRIDGE_TERMS[id];
    assert.equal(term.id, id);
    for (const language of NARRATION_LANGUAGES) {
      assert.ok(term.term[language].length > 0, `${id} term ${language}`);
      assert.ok(term.childMeaning[language].length > 0, `${id} meaning ${language}`);
    }
    assert.match(term.term.ta, /[\u0B80-\u0BFF]/, `${id} Tamil term must be Tamil script`);
    // The diagnostic contract keeps the frozen Hindi shape derived from the same source.
    assert.equal(HINDI_BRIDGE_TERMS[id].hindi, term.term.hi);
    assert.equal(HINDI_BRIDGE_TERMS[id].english, term.term.en);
    assert.equal(HINDI_BRIDGE_TERMS[id].childMeaningHi, term.childMeaning.hi);
  }
  assert.ok(protectedGlossaryForms().includes("பகுதி"));
  assert.ok(protectedGlossaryForms().includes("denominator"));
});

test("register inference recognises Tamil and Tanglish without changing the diagnostic register", () => {
  assert.equal(inferLearnerRegister("எனக்கு புரியவில்லை"), "tamil");
  assert.equal(inferLearnerRegister("எனக்கு fraction புரியவில்லை"), "tanglish");
  assert.equal(inferLearnerRegister("मुझे unit fraction समझ नहीं आता"), "hinglish");
  assert.equal(inferLearnerRegister("plain english"), "english");
  assert.equal(inferDiagnosticRegister("எனக்கு fraction புரியவில்லை"), "english");
  assert.equal(inferDiagnosticRegister("मुझे unit fraction समझ नहीं आता"), "hinglish");
});
