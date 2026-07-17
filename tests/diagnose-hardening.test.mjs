import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

let workerPromise;

async function loadWorker() {
  if (!workerPromise) {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("diagnose-hardening-test", `${process.pid}-${Date.now()}`);
    workerPromise = import(workerUrl.href).then((module) => module.default);
  }
  return workerPromise;
}

const validInput = {
  problemText: "3/4 ÷ 1/8 = ?",
  learnerReasoning: "मुझे समझ नहीं आता कि इसे उल्टा करके multiply क्यों करते हैं।",
};

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

function diagnosisRequest(headers = {}) {
  return new Request("https://bodh.test/api/diagnose", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(validInput),
  });
}

function streamedRequest(bytes, headers = {}) {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  return new Request("https://bodh.test/api/diagnose", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
    duplex: "half",
  });
}

function executionContext() {
  return { waitUntil() {}, passThroughOnException() {} };
}

class TestD1Statement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    this.database.boundValues.push(values);
    return this;
  }

  async first() {
    if (!this.sql.includes("INSERT INTO diagnosis_rate_limits")) {
      throw new Error(`Unexpected first() statement: ${this.sql}`);
    }

    const [clientHash, windowStart] = this.values;
    const previous = this.database.rateLimits.get(clientHash);
    const requestCount = previous?.windowStart === windowStart ? previous.requestCount + 1 : 1;
    this.database.rateLimits.set(clientHash, { windowStart, requestCount });
    this.database.clientHashes.add(clientHash);
    return { request_count: requestCount };
  }

  async run() {
    if (!this.sql.includes("INSERT INTO diagnostic_traces")) {
      throw new Error(`Unexpected run() statement: ${this.sql}`);
    }
    return { success: true };
  }
}

class TestD1Database {
  constructor() {
    this.statements = [];
    this.boundValues = [];
    this.rateLimits = new Map();
    this.clientHashes = new Set();
  }

  prepare(sql) {
    this.statements.push(sql);
    return new TestD1Statement(this, sql);
  }
}

test("rejects non-JSON and oversized declared bodies before calling OpenAI", async (t) => {
  const originalFetch = globalThis.fetch;
  let openAiCalls = 0;
  globalThis.fetch = async () => {
    openAiCalls += 1;
    throw new Error("OpenAI should not be called");
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const worker = await loadWorker();
  const env = {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    OPENAI_API_KEY: "test-key",
  };

  const nonJson = await worker.fetch(
    diagnosisRequest({ "content-type": "text/plain" }),
    env,
    executionContext(),
  );
  assert.equal(nonJson.status, 415);
  assert.equal((await nonJson.json()).error, "unsupported_media_type");

  const oversized = await worker.fetch(
    diagnosisRequest({ "content-length": String(6 * 1024 * 1024 + 1) }),
    env,
    executionContext(),
  );
  assert.equal(oversized.status, 413);
  assert.equal((await oversized.json()).error, "payload_too_large");
  assert.equal(oversized.headers.get("cache-control"), "no-store");
  assert.equal(oversized.headers.get("x-content-type-options"), "nosniff");
  assert.equal(openAiCalls, 0);
});

test("accepts the declared size boundary and application +json media types", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    diagnosisRequest({
      "content-length": String(6 * 1024 * 1024),
      "content-type": "application/problem+json; charset=utf-8",
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    executionContext(),
  );

  assert.equal(response.status, 200);
  assert.equal((await response.json()).reason, "live_not_configured");
});

test("enforces the body limit while streaming when content length is absent or dishonest", async (t) => {
  const originalFetch = globalThis.fetch;
  let openAiCalls = 0;
  globalThis.fetch = async () => {
    openAiCalls += 1;
    throw new Error("OpenAI should not be called");
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const worker = await loadWorker();
  const env = {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    OPENAI_API_KEY: "test-key",
  };
  const oversizedBytes = new Uint8Array(6 * 1024 * 1024 + 1);

  const withoutLength = await worker.fetch(
    streamedRequest(oversizedBytes),
    env,
    executionContext(),
  );
  assert.equal(withoutLength.status, 413);
  assert.equal((await withoutLength.json()).error, "payload_too_large");

  const dishonestLength = await worker.fetch(
    streamedRequest(oversizedBytes, { "content-length": "128" }),
    env,
    executionContext(),
  );
  assert.equal(dishonestLength.status, 413);
  assert.equal((await dishonestLength.json()).error, "payload_too_large");
  assert.equal(openAiCalls, 0);
});

test("editing learner input invalidates and aborts a stale diagnosis", async () => {
  const source = await readFile(
    new URL("../app/diagnose/DiagnosticIntake.tsx", import.meta.url),
    "utf8",
  );
  const invalidation = source.slice(
    source.indexOf("const invalidateDiagnosis"),
    source.indexOf("const chooseImage"),
  );
  assert.match(invalidation, /requestAbortRef\.current\?\.abort\(\)/);
  assert.match(invalidation, /setResult\(null\)/);
  assert.match(invalidation, /setSelectedProbe\(null\)/);
  assert.match(invalidation, /setNotationConfirmed\(false\)/);
  assert.equal((source.match(/onChange=\{\(event\) => \{[\s\S]*?invalidateDiagnosis\(\);[\s\S]*?\}\}/g) ?? []).length >= 2, true);
  assert.match(source, /const editNotation = \(\) => \{\s+invalidateDiagnosis\(\);/);
  assert.match(source, /let didTimeout = false;/);
  assert.match(source, /didTimeout = true;\s+controller\.abort\(\);/);
  assert.match(source, /if \(didTimeout\) \{\s+setError\(ui\(INTAKE_COPY\.timeoutError, language\)\);/);
});

test("accepts an exact 4 MiB image and rejects the next byte", async () => {
  const worker = await loadWorker();
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const imageRequest = (bytes) => new Request("https://bodh.test/api/diagnose", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      problemText: "",
      learnerReasoning: "",
      imageDataUrl: `data:image/png;base64,${Buffer.alloc(bytes).toString("base64")}`,
    }),
  });

  const exact = await worker.fetch(imageRequest(4 * 1024 * 1024), env, executionContext());
  assert.equal(exact.status, 200);

  const oneByteOver = await worker.fetch(imageRequest(4 * 1024 * 1024 + 1), env, executionContext());
  assert.equal(oneByteOver.status, 400);
  assert.equal((await oneByteOver.json()).error, "invalid_input");
});

test("limits the 41st hourly diagnosis per client, separates clients, and never stores a raw IP", async (t) => {
  const originalFetch = globalThis.fetch;
  let openAiCalls = 0;
  globalThis.fetch = async () => {
    openAiCalls += 1;
    return new Response(JSON.stringify({ output_text: JSON.stringify(validOutput) }), {
      headers: { "content-type": "application/json" },
    });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const worker = await loadWorker();
  const database = new TestD1Database();
  const env = {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    DB: database,
    OPENAI_API_KEY: "test-key",
    BODH_RATE_LIMIT_SALT: "independent-test-salt",
  };
  const firstIp = "203.0.113.7";
  const secondIp = "2001:db8::8";

  for (let index = 0; index < 40; index += 1) {
    const response = await worker.fetch(
      diagnosisRequest({ "cf-connecting-ip": firstIp }),
      env,
      executionContext(),
    );
    assert.equal(response.status, 200, `request ${index + 1} should be allowed`);
  }

  const limited = await worker.fetch(
    diagnosisRequest({ "cf-connecting-ip": firstIp }),
    env,
    executionContext(),
  );
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).error, "rate_limited");
  assert.equal(limited.headers.get("x-ratelimit-limit"), "40");
  assert.equal(limited.headers.get("x-ratelimit-remaining"), "0");
  assert.ok(Number(limited.headers.get("retry-after")) >= 1);
  assert.ok(Number(limited.headers.get("retry-after")) <= 3600);
  assert.ok(Number(limited.headers.get("x-ratelimit-reset")) > Date.now() / 1000);
  assert.equal(openAiCalls, 40, "a rate-limited request must not call OpenAI");

  const separateClient = await worker.fetch(
    diagnosisRequest({ "cf-connecting-ip": secondIp }),
    env,
    executionContext(),
  );
  assert.equal(separateClient.status, 200);
  assert.equal(openAiCalls, 41);
  assert.equal(database.clientHashes.size, 2);
  for (const hash of database.clientHashes) assert.match(hash, /^[a-f0-9]{64}$/);

  const databaseText = JSON.stringify({
    statements: database.statements,
    boundValues: database.boundValues,
  });
  assert.doesNotMatch(databaseText, new RegExp(firstIp.replaceAll(".", "\\.")));
  assert.doesNotMatch(databaseText, new RegExp(secondIp.replaceAll(":", "\\:")));
  assert.equal(database.statements.some((sql) => /CREATE\s+(?:TABLE|INDEX)/i.test(sql)), false);
});

test("falls back without model spend when rate-limit state is unavailable", async (t) => {
  const originalFetch = globalThis.fetch;
  let openAiCalls = 0;
  globalThis.fetch = async () => {
    openAiCalls += 1;
    return new Response(JSON.stringify({ output_text: JSON.stringify(validOutput) }), {
      headers: { "content-type": "application/json" },
    });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const worker = await loadWorker();
  const response = await worker.fetch(
    diagnosisRequest({ "cf-connecting-ip": "198.51.100.14" }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
      DB: { prepare() { throw new Error("D1 unavailable"); } },
      OPENAI_API_KEY: "test-key",
    },
    executionContext(),
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.mode, "curated_fallback");
  assert.equal(body.reason, "rate_limit_unavailable");
  assert.equal(openAiCalls, 0);
});

test("falls back without a connecting IP and does not touch rate-limit state", async (t) => {
  const originalFetch = globalThis.fetch;
  let openAiCalls = 0;
  globalThis.fetch = async () => {
    openAiCalls += 1;
    return new Response(JSON.stringify({ output_text: JSON.stringify(validOutput) }), {
      headers: { "content-type": "application/json" },
    });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const worker = await loadWorker();
  const database = new TestD1Database();
  const response = await worker.fetch(
    diagnosisRequest(),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
      DB: database,
      OPENAI_API_KEY: "test-key",
      BODH_RATE_LIMIT_SALT: "independent-test-salt",
      BODH_RATE_LIMIT_PER_HOUR: "1",
    },
    executionContext(),
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.mode, "curated_fallback");
  assert.equal(body.reason, "rate_limit_unavailable");
  assert.equal(openAiCalls, 0);
  assert.equal(database.statements.some((sql) => sql.includes("diagnosis_rate_limits")), false);
});

test("keeps loopback development explicit when Cloudflare headers are absent", async (t) => {
  const originalFetch = globalThis.fetch;
  let openAiCalls = 0;
  globalThis.fetch = async () => {
    openAiCalls += 1;
    return new Response(JSON.stringify({ output_text: JSON.stringify(validOutput) }), {
      headers: { "content-type": "application/json" },
    });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const worker = await loadWorker();
  const database = new TestD1Database();
  const response = await worker.fetch(
    new Request("http://localhost:3002/api/diagnose", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": "127.0.0.1",
      },
      body: JSON.stringify(validInput),
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
      DB: database,
      OPENAI_API_KEY: "test-key",
      BODH_RATE_LIMIT_SALT: "independent-test-salt",
    },
    executionContext(),
  );

  assert.equal(response.status, 200);
  assert.equal((await response.json()).mode, "live");
  assert.equal(openAiCalls, 1);
  assert.equal(database.statements.some((sql) => sql.includes("diagnosis_rate_limits")), false);
});
