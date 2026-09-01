import assert from "node:assert/strict";
import test from "node:test";
import { createWorldSession, observeWorld } from "../lib/world/session.ts";

let workerPromise;

async function loadWorker() {
  if (!workerPromise) {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("tutor-test", `${process.pid}-${Date.now()}`);
    workerPromise = import(workerUrl.href).then((module) => module.default);
  }
  return workerPromise;
}

async function step(observation, env = {}) {
  const worker = await loadWorker();
  return worker.fetch(
    new Request("https://bodh.test/api/tutor/step", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ observation }),
    }),
    env,
    { waitUntil() {}, passThroughOnException() {} },
  );
}

function withFetch(t, handler) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return handler(String(url), init);
  };
  t.after(() => { globalThis.fetch = original; });
  return calls;
}

const modelStep = (object) => new Response(JSON.stringify({ output_text: JSON.stringify(object) }), { headers: { "content-type": "application/json" } });

test("the tutor route validates the model's step against the allowlist and the tool schema", async (t) => {
  const observation = observeWorld(createWorldSession("tutor", "hi"));
  let reply = { tool: "bodh_walk_to", input: { placeId: "puddle-ghat", intent: null, beatId: null }, reason: "यह जगह रोशन है।" };
  const calls = withFetch(t, async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    const body = JSON.parse(init.body);
    assert.equal(body.text.format.name, "bodh_tutor_step");
    const brief = body.input[0].content[0].text;
    assert.match(brief, /allowedTools/);
    assert.doesNotMatch(brief, /bodh_answer_probe|bodh_tinker|bodh_check/, "forbidden tools are not even offered");
    return modelStep(reply);
  });
  const env = { OPENAI_API_KEY: "k" };

  const ok = await step(observation, env);
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.deepEqual(body.step, { kind: "call", tool: "bodh_walk_to", input: { placeId: "puddle-ghat" }, reason: "यह जगह रोशन है।" });
  assert.equal(body.provider, "openai");

  reply = { tool: "bodh_answer_probe", input: { placeId: null, intent: null, beatId: null }, reason: "I will answer for you" };
  const forbidden = await step(observation, env);
  assert.equal(forbidden.status, 502);
  assert.equal((await forbidden.json()).fallback, "policy");

  reply = { tool: "bodh_walk_to", input: { placeId: "narnia", intent: null, beatId: null }, reason: "x" };
  const badInput = await step(observation, env);
  assert.equal(badInput.status, 502);

  reply = { tool: "bodh_ask_bodh", input: { placeId: null, intent: "solve-it", beatId: null }, reason: "x" };
  const badIntent = await step(observation, env);
  assert.equal(badIntent.status, 502);
  assert.equal(calls.length, 4);
});

test("without a provider the tutor route tells the client to use the local policy", async () => {
  const observation = observeWorld(createWorldSession("tutor", "en"));
  const response = await step(observation, {});
  assert.equal(response.status, 503);
  assert.equal((await response.json()).fallback, "policy");
  const invalid = await step({ nope: true }, { OPENAI_API_KEY: "k" });
  assert.equal(invalid.status, 400);
});
