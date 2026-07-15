import assert from "node:assert/strict";
import test from "node:test";
import { narrationBeatFor } from "../lib/fraction-concept.ts";

let workerPromise;

async function loadWorker() {
  if (!workerPromise) {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("voice-test", `${process.pid}-${Date.now()}`);
    workerPromise = import(workerUrl.href).then((module) => module.default);
  }
  return workerPromise;
}

async function requestNarration(pathname, options = {}, env = {}) {
  const worker = await loadWorker();

  return worker.fetch(
    new Request(`https://bodh.test${pathname}`, options),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
      ...env,
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("accepts only authored fraction narration IDs", async () => {
  const unavailable = await requestNarration(
    "/api/narration/fractions-v1/chosen-whole/name-the-whole.mp3",
  );
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), {
    error: "narration_unavailable",
    fallback: "device_voice",
  });

  const unknown = await requestNarration(
    "/api/narration/fractions-v1/chosen-whole/injected.mp3",
    {},
    { OPENAI_API_KEY: "unused" },
  );
  assert.equal(unknown.status, 404);

  const guarded = await requestNarration(
    "/api/narration/fractions-v1/chosen-whole/name-the-whole.mp3",
    {},
    { OPENAI_API_KEY: "present-but-runtime-disabled" },
  );
  assert.equal(guarded.status, 503, "paid runtime TTS must be opt-in");
});

test("rejects cache-busting narration queries and write methods", async () => {
  const query = await requestNarration(
    "/api/narration/fractions-v1/chosen-whole/name-the-whole.mp3?text=solve-this",
  );
  assert.equal(query.status, 400);

  const post = await requestNarration(
    "/api/narration/fractions-v1/chosen-whole/name-the-whole.mp3",
    { method: "POST", body: "arbitrary learner text" },
  );
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("allow"), "GET, HEAD");
});

test("HEAD advertises guarded runtime availability without synthesizing", async (t) => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    throw new Error("HEAD must not call OpenAI");
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const response = await requestNarration(
    "/api/narration/fractions-v1/chosen-whole/name-the-whole.mp3",
    { method: "HEAD" },
    { OPENAI_API_KEY: "test-key", BODH_TTS_RUNTIME_ENABLED: "true" },
  );
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
  assert.equal(calls, 0);
});

test("serves reviewed static narration before attempting synthesis", async () => {
  const response = await requestNarration(
    "/api/narration/fractions-v1/chosen-whole/name-the-whole.mp3",
    {},
    {
      ASSETS: {
        fetch: async () => new Response(new Uint8Array([1, 2, 3]), {
          headers: { "content-type": "audio/mpeg" },
        }),
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "audio/mpeg");
  assert.equal(response.headers.get("x-bodh-voice"), "ai-generated");
  assert.match(response.headers.get("cache-control") ?? "", /immutable/);
});

test("sends only the allowlisted beat to OpenAI speech", async (t) => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, init) => {
    captured = { url, init };
    return new Response(new Uint8Array([9, 8, 7]), {
      headers: { "content-type": "audio/mpeg" },
    });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const response = await requestNarration(
    "/api/narration/fractions-v1/chosen-whole/name-the-whole.mp3",
    {},
    {
      OPENAI_API_KEY: "test-key",
      BODH_TTS_RUNTIME_ENABLED: "true",
      BODH_TTS_MODEL: "model-snapshot",
      BODH_TTS_VOICE: "cedar",
    },
  );

  assert.equal(response.status, 200);
  assert.equal(captured.url, "https://api.openai.com/v1/audio/speech");
  assert.equal(captured.init.headers.authorization, "Bearer test-key");
  const body = JSON.parse(captured.init.body);
  assert.equal(body.input, narrationBeatFor("chosen-whole", "name-the-whole").text);
  assert.equal(body.model, "model-snapshot");
  assert.equal(body.voice, "cedar");
  assert.equal(body.response_format, "mp3");
  assert.equal(body.speed, 0.9);
  assert.doesNotMatch(body.input, /solve|answer/i);
});

test("coalesces concurrent synthesis for the same authored beat", async (t) => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 15));
    return new Response(new Uint8Array([4, 5, 6]), {
      headers: { "content-type": "audio/mpeg" },
    });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const env = {
    OPENAI_API_KEY: "test-key",
    BODH_TTS_RUNTIME_ENABLED: "true",
    BODH_TTS_MODEL: "single-flight-model",
  };
  const [first, second] = await Promise.all([
    requestNarration("/api/narration/fractions-v1/equal-parts/make-four-parts.mp3", {}, env),
    requestNarration("/api/narration/fractions-v1/equal-parts/make-four-parts.mp3", {}, env),
  ]);

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(calls, 1);
});

test("does not relabel a non-audio upstream response", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: "not audio" }), {
    headers: { "content-type": "application/json" },
  });
  t.after(() => { globalThis.fetch = originalFetch; });

  const response = await requestNarration(
    "/api/narration/fractions-v1/equal-parts/parts-must-be-equal.mp3",
    {},
    { OPENAI_API_KEY: "test-key", BODH_TTS_RUNTIME_ENABLED: "true" },
  );
  assert.equal(response.status, 503);
  assert.match(response.headers.get("content-type") ?? "", /application\/json/);
});
