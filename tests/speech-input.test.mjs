import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import {
  collectSpeechSegments,
  composeSpeechInputValue,
  speechInputErrorFor,
  speechInputLocale,
} from "../lib/speech-input.ts";

const ROOT = new URL("../", import.meta.url);

describe("reasoning speech input", () => {
  it("uses the Indian locale that matches the learner language", () => {
    assert.equal(speechInputLocale("hi"), "hi-IN");
    assert.equal(speechInputLocale("en"), "en-IN");
  });

  it("keeps final and interim hypotheses separate and composes editable text once", () => {
    const collected = collectSpeechSegments([
      { transcript: "  I think ", isFinal: true },
      { transcript: "the pieces match", isFinal: true },
      { transcript: " because", isFinal: false },
    ]);

    assert.deepEqual(collected, {
      finalTranscript: "I think the pieces match",
      interimTranscript: "because",
    });
    assert.equal(
      composeSpeechInputValue("My start", collected.finalTranscript, collected.interimTranscript, 1000),
      "My start I think the pieces match because",
    );
    assert.equal(composeSpeechInputValue("1234", "5678", "", 7), "1234 56");
  });

  it("normalizes browser failures into learner-safe states", () => {
    assert.equal(speechInputErrorFor("aborted"), null);
    assert.equal(speechInputErrorFor("not-allowed"), "permission-denied");
    assert.equal(speechInputErrorFor("audio-capture"), "microphone-unavailable");
    assert.equal(speechInputErrorFor("no-speech"), "no-speech");
    assert.equal(speechInputErrorFor("network"), "network");
    assert.equal(speechInputErrorFor("language-not-supported"), "language-unavailable");
    assert.equal(speechInputErrorFor("future-browser-code"), "unavailable");
  });

  it("feature-detects, cleans up, remains accessible, and preserves the diagnosis payload", async () => {
    const [hook, control, styles, intake] = await Promise.all([
      readFile(new URL("app/diagnose/useReasoningSpeechInput.ts", ROOT), "utf8"),
      readFile(new URL("app/diagnose/ReasoningVoiceControl.tsx", ROOT), "utf8"),
      readFile(new URL("app/diagnose/ReasoningVoiceControl.module.css", ROOT), "utf8"),
      readFile(new URL("app/diagnose/DiagnosticIntake.tsx", ROOT), "utf8"),
    ]);

    assert.match(hook, /SpeechRecognition\s*\?\?/);
    assert.match(hook, /webkitSpeechRecognition/);
    assert.match(hook, /recognition\.continuous = true/);
    assert.match(hook, /recognition\.interimResults = true/);
    assert.match(hook, /recognition\.lang = speechInputLocale\(language\)/);
    assert.match(hook, /detachRecognition\(recognition\)/);
    assert.match(hook, /recognition\.abort\(\)/);

    assert.match(control, /if \(!isSupported\) return null/);
    assert.match(control, /aria-controls=\{textareaId\}/);
    assert.match(control, /role="status"/);
    assert.match(control, /role="alert"/);
    assert.match(styles, /prefers-reduced-motion: reduce/);

    assert.match(intake, /useReasoningSpeechInput\(\{/);
    assert.match(intake, /value=\{learnerReasoning\}/);
    assert.match(intake, /reasoningSpeech\.cancel\(\);\s+setLearnerReasoning/);
    assert.match(
      intake,
      /body: JSON\.stringify\(\{[\s\S]*?problemText,[\s\S]*?learnerReasoning,[\s\S]*?visibleWorkText,[\s\S]*?imageDataUrl,[\s\S]*?reviewedSeedId: selectedSeedId \|\| undefined,[\s\S]*?\}\)/,
    );
  });
});
