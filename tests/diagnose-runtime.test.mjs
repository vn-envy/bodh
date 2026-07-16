import assert from "node:assert/strict";
import test from "node:test";

let workerPromise;

async function loadWorker() {
  if (!workerPromise) {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("diagnose-test", `${process.pid}-${Date.now()}`);
    workerPromise = import(workerUrl.href).then((module) => module.default);
  }
  return workerPromise;
}

function schemaKeys(value, keys = new Set()) {
  if (Array.isArray(value)) {
    for (const child of value) schemaKeys(child, keys);
    return keys;
  }
  if (!value || typeof value !== "object") return keys;
  for (const [key, child] of Object.entries(value)) {
    keys.add(key);
    schemaKeys(child, keys);
  }
  return keys;
}

const validOutput = {
  schemaVersion: "1.0.0",
  inputFidelity: {
    canonicalEquation: "3/4 ÷ 1/8 = ?",
    preservedTokens: ["3/4", "÷", "1/8", "?"],
    confidence: 1,
  },
  candidateTopicIds: ["mt_9Y96vxG_LH"],
  hypotheses: [{
    id: "reciprocal-rule-without-meaning",
    labelHi: "Rule के पीछे groups का meaning अभी साफ़ नहीं है।",
    evidence: { source: "reasoning", quote: "उल्टा करके multiply" },
  }],
  languageBridge: {
    learnerRegister: "hinglish",
    termIds: ["unit-fraction", "equal-groups"],
  },
  probe: {
    questionHi: "एक whole में कितने 1/4 होते हैं?",
    optionLabelsHi: ["2", "3", "4", "8"],
    distinction: "unit fraction की size और group-count समझना",
  },
};

test("sends an OpenAI-compatible structured-output schema and accepts a guarded diagnosis", async (t) => {
  const originalFetch = globalThis.fetch;
  let capturedBody;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    capturedBody = JSON.parse(init.body);
    return new Response(JSON.stringify({ output_text: JSON.stringify(validOutput) }), {
      headers: { "content-type": "application/json" },
    });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://bodh.test/api/diagnose", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        problemText: "3/4 ÷ 1/8 = ?",
        learnerReasoning: "मुझे समझ नहीं आता कि इसे उल्टा करके multiply क्यों करते हैं।",
      }),
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
      OPENAI_API_KEY: "test-key",
      BODH_MODEL: "gpt-5.6",
    },
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 200);
  assert.equal((await response.json()).mode, "live");
  assert.equal(capturedBody.model, "gpt-5.6");
  assert.equal(capturedBody.text.format.type, "json_schema");
  assert.equal(capturedBody.text.format.strict, true);
  assert.deepEqual(
    capturedBody.text.format.schema.properties.schemaVersion.enum,
    ["1.0.0"],
  );

  const outboundKeys = schemaKeys(capturedBody.text.format.schema);
  for (const unsupported of [
    "$schema",
    "$id",
    "title",
    "const",
    "minLength",
    "maxLength",
    "uniqueItems",
  ]) {
    assert.equal(outboundKeys.has(unsupported), false, `${unsupported} must not reach OpenAI`);
  }
});
