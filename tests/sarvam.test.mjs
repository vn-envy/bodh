import assert from "node:assert/strict";
import test from "node:test";
import { narrationBeatForEvaporation } from "../lib/evaporation-concept.ts";
import { tamilOverlayFor } from "../lib/tamil-overlay.ts";

let workerPromise;

async function loadWorker() {
  if (!workerPromise) {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("sarvam-test", `${process.pid}-${Date.now()}`);
    workerPromise = import(workerUrl.href).then((module) => module.default);
  }
  return workerPromise;
}

async function call(pathname, options = {}, env = {}) {
  const worker = await loadWorker();
  return worker.fetch(
    new Request(`https://bodh.test${pathname}`, options),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) }, ...env },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

function withFetch(t, handler) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return handler(String(url), init, calls.length);
  };
  t.after(() => { globalThis.fetch = original; });
  return calls;
}

function fakeMp3Base64() {
  return Buffer.from([0xff, 0xfb, 0x90, 0x00, 1, 2, 3, 4]).toString("base64");
}

test("Tamil narration is routed and Sarvam is preferred for runtime voice when configured", async (t) => {
  const calls = withFetch(t, async (url) => {
    assert.match(url, /^https:\/\/api\.sarvam\.ai\/text-to-speech$/);
    return new Response(JSON.stringify({ audios: [fakeMp3Base64()] }), { headers: { "content-type": "application/json" } });
  });
  const response = await call(
    "/api/narration/evaporation-v2/ta/notice-puddle/name-liquid-water.mp3",
    {},
    { SARVAM_API_KEY: "sarvam-test", OPENAI_API_KEY: "openai-test", BODH_TTS_RUNTIME_ENABLED: "true", BODH_SARVAM_SPEAKER_TA: "kavitha" },
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-bodh-voice-source"), "sarvam");
  assert.equal(response.headers.get("content-language"), "ta-IN");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.headers["api-subscription-key"], "sarvam-test");
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.model, "bulbul:v3");
  assert.equal(body.target_language_code, "ta-IN");
  assert.equal(body.speaker, "kavitha");
  assert.equal(body.pace, 0.9);
  const english = narrationBeatForEvaporation("notice-puddle", "name-liquid-water", "en").text;
  assert.equal(body.text, tamilOverlayFor(english) ?? english, "the exact authored beat, overlay or English fallback");
  assert.doesNotMatch(body.text, /solve|answer/i);
});

test("without a Sarvam key the OpenAI runtime path is unchanged", async (t) => {
  const calls = withFetch(t, async (url) => {
    assert.equal(url, "https://api.openai.com/v1/audio/speech");
    return new Response(new Uint8Array([9, 9, 9]), { headers: { "content-type": "audio/mpeg" } });
  });
  const response = await call(
    "/api/narration/fractions-v2/en/chosen-whole/name-the-whole.mp3",
    {},
    { OPENAI_API_KEY: "openai-test", BODH_TTS_RUNTIME_ENABLED: "true" },
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-bodh-voice-source"), "openai");
  assert.equal(calls.length, 1);
});

test("a Sarvam failure degrades to the device-voice fallback, never a 500", async (t) => {
  withFetch(t, async () => new Response("upstream down", { status: 502 }));
  const response = await call(
    "/api/narration/fractions-v2/hi/chosen-whole/trace-the-whole.mp3",
    {},
    { SARVAM_API_KEY: "sarvam-test", BODH_TTS_RUNTIME_ENABLED: "true" },
  );
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "narration_unavailable", fallback: "device_voice" });
});

test("generated narration speaks only text stored under its hash", async (t) => {
  const stored = new Map([["abcdef12", { text: "यह पानी अभी भी है।", language: "hi" }]]);
  const DB = {
    prepare: (sql) => ({
      bind: (hash, language) => ({
        first: async () => {
          assert.match(sql, /FROM generated_beats/);
          const row = stored.get(hash);
          return row && row.language === language ? { text: row.text } : null;
        },
      }),
    }),
  };
  const calls = withFetch(t, async () => new Response(JSON.stringify({ audios: [fakeMp3Base64()] }), { headers: { "content-type": "application/json" } }));
  const env = { DB, SARVAM_API_KEY: "sarvam-test", BODH_TTS_RUNTIME_ENABLED: "true" };

  const known = await call("/api/narration/generated/hi/abcdef12.mp3", {}, env);
  assert.equal(known.status, 200);
  assert.equal(known.headers.get("x-bodh-narration-version"), "generated-v1");
  assert.equal(JSON.parse(calls[0].init.body).text, "यह पानी अभी भी है।");

  const unknown = await call("/api/narration/generated/hi/0000000000.mp3", {}, env);
  assert.equal(unknown.status, 404);
  const wrongLanguage = await call("/api/narration/generated/ta/abcdef12.mp3", {}, env);
  assert.equal(wrongLanguage.status, 404);
  const injected = await call("/api/narration/generated/hi/solve-this.mp3", {}, env);
  assert.equal(injected.status, 404);
  const query = await call("/api/narration/generated/hi/abcdef12.mp3?text=x", {}, env);
  assert.equal(query.status, 400);
  assert.equal(calls.length, 1, "only the stored text was ever synthesised");
});

test("speech capabilities advertise the configured provider", async () => {
  const browser = await call("/api/speech/capabilities");
  assert.deepEqual((await browser.json()).provider, "browser");
  const sarvam = await call("/api/speech/capabilities", {}, { SARVAM_API_KEY: "k", BODH_STT_PROVIDER: "sarvam" });
  const body = await sarvam.json();
  assert.equal(body.provider, "sarvam");
  assert.deepEqual(body.languages, ["hi", "en", "ta"]);
  const unconfigured = await call("/api/speech/capabilities", {}, { BODH_STT_PROVIDER: "sarvam" });
  assert.equal((await unconfigured.json()).provider, "browser", "provider needs a key");
});

test("transcription is bounded, code-mixed, and stores nothing", async (t) => {
  const calls = withFetch(t, async (url, init) => {
    assert.equal(url, "https://api.sarvam.ai/speech-to-text");
    assert.equal(init.headers["api-subscription-key"], "k");
    const form = init.body;
    assert.equal(form.get("model"), "saaras:v3");
    assert.equal(form.get("mode"), "codemix");
    assert.equal(form.get("language_code"), "ta-IN");
    return new Response(JSON.stringify({ transcript: "  எனக்கு   fraction புரியவில்லை ", language_code: "ta-IN" }), { headers: { "content-type": "application/json" } });
  });
  const env = { SARVAM_API_KEY: "k", BODH_STT_PROVIDER: "sarvam" };
  const form = new FormData();
  form.append("audio", new Blob([new Uint8Array(2048)], { type: "audio/webm" }), "speech");
  form.append("language", "ta");
  const response = await call("/api/speech/transcribe", { method: "POST", body: form }, env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { transcript: "எனக்கு fraction புரியவில்லை", languageCode: "ta-IN" });
  assert.equal(calls.length, 1);

  const disabled = await call("/api/speech/transcribe", { method: "POST", body: form }, {});
  assert.equal(disabled.status, 503);
  assert.equal((await disabled.json()).fallback, "browser");

  const tooBig = new FormData();
  tooBig.append("audio", new Blob([new Uint8Array(2 * 1024 * 1024 + 1)], { type: "audio/webm" }), "speech");
  tooBig.append("language", "hi");
  assert.equal((await call("/api/speech/transcribe", { method: "POST", body: tooBig }, env)).status, 413);

  const wrongType = new FormData();
  wrongType.append("audio", new Blob([new Uint8Array(10)], { type: "text/plain" }), "speech");
  wrongType.append("language", "hi");
  assert.equal((await call("/api/speech/transcribe", { method: "POST", body: wrongType }, env)).status, 415);

  const badLanguage = new FormData();
  badLanguage.append("audio", new Blob([new Uint8Array(10)], { type: "audio/webm" }), "speech");
  badLanguage.append("language", "fr");
  assert.equal((await call("/api/speech/transcribe", { method: "POST", body: badLanguage }, env)).status, 400);
  assert.equal((await call("/api/speech/transcribe", { method: "GET" }, env)).status, 405);
  assert.equal(calls.length, 1, "rejected requests never reach Sarvam");
});

test("hosted transcription without limiter state never spends", async (t) => {
  const calls = withFetch(t, async () => new Response("{}"));
  const form = new FormData();
  form.append("audio", new Blob([new Uint8Array(10)], { type: "audio/webm" }), "speech");
  form.append("language", "hi");
  const response = await call(
    "/api/speech/transcribe",
    { method: "POST", body: form, headers: { "cf-connecting-ip": "203.0.113.9" } },
    { SARVAM_API_KEY: "k", BODH_STT_PROVIDER: "sarvam" },
  );
  assert.equal(response.status, 503);
  assert.equal(calls.length, 0);
});
