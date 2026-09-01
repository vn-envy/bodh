import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateAtomFill, beatHash } from "../lib/atom-fill-guardrails.ts";
import { ATOM_TEMPLATES } from "../lib/atom-templates.ts";

const ROOT = new URL("../", import.meta.url);
let workerPromise;

async function loadWorker() {
  if (!workerPromise) {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("generate-test", `${process.pid}-${Date.now()}`);
    workerPromise = import(workerUrl.href).then((module) => module.default);
  }
  return workerPromise;
}

async function generate(body, env = {}, headers = {}) {
  const worker = await loadWorker();
  return worker.fetch(
    new Request("https://bodh.test/api/generate-atom", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
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

async function authoredFill(templateId, language) {
  const fills = JSON.parse(await readFile(new URL(`data/fixtures/atom-fills/${templateId}.json`, ROOT), "utf8"));
  return fills.find((fill) => fill.language === language);
}

function openAiResponse(object) {
  return new Response(JSON.stringify({ output_text: JSON.stringify(object) }), { headers: { "content-type": "application/json" } });
}

test("guardrails reject answer leakage, foreign objects, foreign targets and extra keys", async () => {
  const good = await authoredFill("fit-count", "en");
  assert.equal(validateAtomFill(good).ok, true);
  const leak = { ...good, beats: [{ ...good.beats[0], text: "Six pieces of one eighth fill three quarters exactly, so the answer is 6." }, good.beats[1]] };
  assert.deepEqual(validateAtomFill(leak), { ok: false, reason: "answer leakage" });
  const numeralInWord = { ...good, story: { ...good.story, invitation: "There are 60 children in the mela and every one of them wants a roti piece today." } };
  assert.equal(validateAtomFill(numeralInWord).ok, true, "60 is not the answer token 6");
  assert.equal(validateAtomFill({ ...good, objectId: "samosa" }).reason, "object outside the template's list");
  assert.equal(validateAtomFill({ ...good, beats: [{ ...good.beats[0], target: "sun" }, good.beats[1]] }).reason, "beat target outside template");
  assert.equal(validateAtomFill({ ...good, answer: 6 }).reason, "unexpected keys");
  assert.equal(validateAtomFill({ ...good, termIds: ["evaporation"] }).reason, "term outside template");
  assert.equal(validateAtomFill({ ...good, story: { ...good.story, title: "<b>x</b>" } }).reason, "story bounds");
  assert.equal(validateAtomFill(good, ATOM_TEMPLATES["conserve-and-track"]).reason, "template mismatch");
  assert.equal(await beatHash("fit-count", "en", "a"), await beatHash("fit-count", "en", "a"));
  assert.notEqual(await beatHash("fit-count", "en", "a"), await beatHash("fit-count", "hi", "a"));
});

test("without a model key the authored fill is served and beats are stored by hash", async (t) => {
  const inserted = [];
  const DB = {
    prepare: (sql) => ({
      bind: (...values) => ({
        run: async () => { assert.match(sql, /INSERT OR IGNORE INTO generated_beats/); inserted.push(values); return {}; },
        first: async () => null,
      }),
    }),
  };
  const calls = withFetch(t, async () => { throw new Error("no model should be called"); });
  const response = await generate({ templateId: "conserve-and-track", language: "hi" }, { DB });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.source, "authored");
  assert.equal(body.fallbackReason, "live_not_configured");
  assert.equal(body.fill.language, "hi");
  assert.equal(body.fill.templateId, "conserve-and-track");
  assert.equal(body.beats.length, body.fill.beats.length);
  assert.match(body.beats[0].narrationPath, /^\/api\/narration\/generated\/hi\/[0-9a-f]{32}\.mp3$/);
  assert.equal(inserted.length, body.fill.beats.length);
  assert.equal(inserted[0][1], "hi");
  assert.equal(inserted[0][3], body.fill.beats[0].text);
  assert.equal(calls.length, 0);
});

test("a valid OpenAI fill is accepted; a leaking one falls back to the authored fill", async (t) => {
  const good = await authoredFill("fit-count", "en");
  const fresh = { ...good, objectId: "dosa", story: { title: "Dosa at the stall", invitation: "Appa cut three quarters of a dosa for you. Pick up small 1/8 pieces and see how many settle into that space." } };
  let mode = "good";
  const calls = withFetch(t, async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    const body = JSON.parse(init.body);
    assert.equal(body.text.format.name, "bodh_atom_fill");
    assert.equal(body.store, false);
    const brief = body.input[0].content[0].text;
    assert.doesNotMatch(brief, /predicate|forbiddenAnswerTokens|balanc/i, "the predicate is never sent to the model");
    assert.match(brief, /allowedObjectIds/);
    if (mode === "good") return openAiResponse(fresh);
    if (mode === "leak") return openAiResponse({ ...fresh, beats: [{ ...fresh.beats[0], text: "You will need exactly six pieces, so place six and it balances." }, fresh.beats[1]] });
    return new Response("not json", { headers: { "content-type": "application/json" } });
  });
  const env = { OPENAI_API_KEY: "test-key" };

  const accepted = await (await generate({ templateId: "fit-count", language: "en", seedWord: "mela" }, env)).json();
  assert.equal(accepted.source, "openai");
  assert.equal(accepted.fill.objectId, "dosa");
  assert.equal(accepted.fallbackReason, null);

  mode = "leak";
  const leaked = await (await generate({ templateId: "fit-count", language: "en" }, env)).json();
  assert.equal(leaked.source, "authored");
  assert.equal(leaked.fallbackReason, "guardrail:answer leakage");
  assert.equal(leaked.fill.objectId, good.objectId);

  mode = "garbage";
  const garbage = await (await generate({ templateId: "fit-count", language: "en" }, env)).json();
  assert.equal(garbage.source, "authored");
  assert.equal(garbage.fallbackReason, "invalid_response");
  assert.equal(calls.length, 3);
});

test("BODH_LLM_PROVIDER=sarvam routes generation to Sarvam-105B", async (t) => {
  const good = await authoredFill("balance-equivalence", "hi");
  const calls = withFetch(t, async (url, init) => {
    assert.equal(url, "https://api.sarvam.ai/v1/chat/completions");
    assert.equal(init.headers["api-subscription-key"], "sarvam-key");
    const body = JSON.parse(init.body);
    assert.equal(body.model, "sarvam-105b");
    assert.equal(body.response_format.type, "json_object");
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(good) } }] }), { headers: { "content-type": "application/json" } });
  });
  const response = await generate({ templateId: "balance-equivalence", language: "hi" }, { SARVAM_API_KEY: "sarvam-key", BODH_LLM_PROVIDER: "sarvam", OPENAI_API_KEY: "ignored" });
  const body = await response.json();
  assert.equal(body.source, "sarvam");
  assert.equal(body.model, "sarvam-105b");
  assert.equal(calls.length, 1);
});

test("Tamil requests translate the authored English fill with pinned glossary, else fall back to English", async (t) => {
  const calls = withFetch(t, async (url, init) => {
    assert.equal(url, "https://api.sarvam.ai/translate");
    const body = JSON.parse(init.body);
    assert.equal(body.target_language_code, "ta-IN");
    // Echo the pinned input with a Tamil marker so placeholders survive.
    return new Response(JSON.stringify({ translated_text: `தமிழ் ${body.input}` }), { headers: { "content-type": "application/json" } });
  });
  const response = await generate({ templateId: "fit-count", language: "ta" }, { SARVAM_API_KEY: "sarvam-key" });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.fill.language, "ta");
  assert.match(body.fill.story.title, /^தமிழ் /);
  assert.ok(body.fill.beats.every((beat) => beat.text.startsWith("தமிழ் ")));
  assert.match(body.beats[0].narrationPath, /\/generated\/ta\//);
  assert.ok(calls.length >= 6);

  globalThis.fetch = async () => new Response("down", { status: 502 });
  const degraded = await (await generate({ templateId: "fit-count", language: "ta" }, { SARVAM_API_KEY: "sarvam-key" })).json();
  assert.equal(degraded.fill.language, "en", "English authored fill stands in when translation fails");
  assert.match(degraded.fallbackReason, /translation_unavailable/);
  assert.equal(degraded.beats[0].narrationPath, null);
});

test("requests are bounded and never accept learner text", async () => {
  assert.equal((await generate({ templateId: "nope", language: "hi" })).status, 400);
  assert.equal((await generate({ templateId: "fit-count", language: "fr" })).status, 400);
  assert.equal((await generate({ templateId: "fit-count", language: "hi", seedWord: "x".repeat(40) })).status, 200, "an over-long seed word is ignored, not accepted");
  const worker = await loadWorker();
  const big = await worker.fetch(
    new Request("https://bodh.test/api/generate-atom", { method: "POST", headers: { "content-type": "application/json", "content-length": "9000" }, body: "{}" }),
    {},
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(big.status, 413);
  const get = await worker.fetch(new Request("https://bodh.test/api/generate-atom"), {}, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(get.status, 405);
});
