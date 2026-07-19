import assert from "node:assert/strict";
import test from "node:test";
import { selectStableSpeechVoice } from "../lib/narration-voice.ts";

const voice = (voiceURI, lang, options = {}) => ({
  default: false,
  lang,
  name: voiceURI,
  voiceURI,
  ...options,
});

test("pins an exact Indian locale regardless of browser voice-list order", () => {
  const indian = voice("bodh-indian-english", "en-IN");
  const candidates = [
    voice("z-us", "en-US", { default: true }),
    indian,
    voice("a-gb", "en-GB"),
  ];

  assert.equal(selectStableSpeechVoice(candidates, "en-IN"), indian);
  assert.equal(selectStableSpeechVoice([...candidates].reverse(), "en-IN"), indian);
});

test("uses a deterministic same-language fallback and never crosses languages", () => {
  const alphabeticFallback = voice("a-hindi", "hi");
  const candidates = [
    voice("z-hindi", "hi"),
    voice("english", "en-IN", { default: true }),
    alphabeticFallback,
  ];

  assert.equal(selectStableSpeechVoice(candidates, "hi-IN"), alphabeticFallback);
  assert.equal(selectStableSpeechVoice([...candidates].reverse(), "hi_IN"), alphabeticFallback);
  assert.equal(selectStableSpeechVoice([voice("english", "en-IN")], "hi-IN"), null);
  assert.equal(selectStableSpeechVoice([], "hi-IN"), null);
});
