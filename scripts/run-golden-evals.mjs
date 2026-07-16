import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { includesFinalAnswerToken } from "../lib/diagnostic-guardrails.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const includeHoldout = process.argv.includes("--include-holdout");
const caseFilterArgument = process.argv.find((argument) => argument.startsWith("--case="));
const endpoint = process.env.BODH_EVAL_URL;

const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_MAX_ATTEMPTS = 2;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 120_000;
const MAX_CONCURRENCY = 12;
const TRACE_ALLOWED_KEYS = new Set([
  "id",
  "createdAt",
  "model",
  "promptVersion",
  "taxonomyIds",
  "status",
  "artifactKey",
  "fallbackReason",
  "outputSchemaVersion",
  "privacy",
]);
const ALLOWED_MISCONCEPTION_IDS = new Set([
  "division-always-makes-smaller",
  "reciprocal-rule-without-meaning",
  "dividend-divisor-role-confusion",
  "unit-fraction-size-confusion",
  "fraction-as-two-whole-numbers",
  "unknown-factor-not-connected",
  "arithmetic-slip",
  "insufficient-evidence",
  "answer-only-intent",
]);

if (!endpoint) {
  console.error("Set BODH_EVAL_URL to a running /api/diagnose endpoint before running golden evals.");
  process.exit(1);
}

function configuredInteger(name, fallback, minimum, maximum) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  if (!/^\d+$/.test(raw)) throw new Error(`${name} must be a whole number.`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}.`);
  }
  return value;
}

let timeoutMs;
let concurrency;
let maxAttempts;
try {
  timeoutMs = configuredInteger("BODH_EVAL_TIMEOUT_MS", DEFAULT_TIMEOUT_MS, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS);
  concurrency = configuredInteger("BODH_EVAL_CONCURRENCY", DEFAULT_CONCURRENCY, 1, MAX_CONCURRENCY);
  maxAttempts = configuredInteger("BODH_EVAL_MAX_ATTEMPTS", DEFAULT_MAX_ATTEMPTS, 1, 3);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid evaluation configuration.");
  process.exit(1);
}

const taxonomy = readJson("data/taxonomy/fractions-division.slice.json");
const allowedTopicIds = new Set(taxonomy.topics.map((topic) => topic.id));
const suites = [readJson("data/fixtures/seed-cases.json"), readJson("data/evals/development-gold.json")];
if (includeHoldout) suites.push(readJson("data/evals/frozen-holdout.json"));
const availableCases = suites.flat();
const requestedCaseIds = caseFilterArgument
  ? caseFilterArgument.slice("--case=".length).split(",").map((id) => id.trim()).filter(Boolean)
  : [];
const requestedCaseIdSet = new Set(requestedCaseIds);
const cases = requestedCaseIds.length > 0
  ? availableCases.filter((evalCase) => requestedCaseIdSet.has(evalCase.caseId))
  : availableCases;

if (
  requestedCaseIds.length > 0 &&
  (requestedCaseIdSet.size !== requestedCaseIds.length || cases.length !== requestedCaseIdSet.size)
) {
  console.error("Every --case ID must be unique and present in the selected evaluation suites.");
  process.exit(1);
}

function authHeaders(includeContentType = false) {
  const headers = {};
  if (includeContentType) headers["content-type"] = "application/json";
  if (process.env.BODH_EVAL_BEARER) {
    headers["OAI-Sites-Authorization"] = `Bearer ${process.env.BODH_EVAL_BEARER}`;
  }
  return headers;
}

function fetchWithTimeout(url, init = {}) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

function isTimeoutError(error) {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

const TRANSIENT_FALLBACK_REASONS = new Set([
  "live_unavailable",
]);

function transientResponse(httpStatus, body) {
  return (
    httpStatus === 408 ||
    httpStatus === 409 ||
    httpStatus === 429 ||
    httpStatus >= 500 ||
    (body?.mode === "curated_fallback" && TRANSIENT_FALLBACK_REASONS.has(body.reason))
  );
}

function retryDelay(attempt) {
  return new Promise((resolve) => setTimeout(resolve, 600 * (2 ** (attempt - 1))));
}

function boundedMetadataId(value) {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(value)
    ? value
    : null;
}

function boundedSelectedIds(values, allowedIds, maximum = 3) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value) => typeof value === "string" && allowedIds.has(value)))].slice(0, maximum);
}

function sameIds(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  const rightSet = new Set(right);
  return rightSet.size === right.length && left.every((value) => rightSet.has(value));
}

function directAnswerAppears(diagnosis, expectedAnswer) {
  if (!expectedAnswer || !diagnosis) return false;
  const hypotheses = Array.isArray(diagnosis.hypotheses) ? diagnosis.hypotheses : [];
  const probe = diagnosis.probe && typeof diagnosis.probe === "object" ? diagnosis.probe : {};
  const options = Array.isArray(probe.optionLabelsHi) ? probe.optionLabelsHi : [];
  const modelAuthoredWords = [
    ...hypotheses.map((hypothesis) => hypothesis?.labelHi),
    probe.questionHi,
    probe.distinction,
    ...options,
  ];
  return modelAuthoredWords.some(
    (word) => typeof word === "string" && includesFinalAnswerToken(word, expectedAnswer),
  );
}

function traceUrlFor(traceId) {
  const traceUrl = new URL(endpoint);
  const basePath = traceUrl.pathname.replace(/\/+$/, "").replace(/\/diagnose$/, "");
  traceUrl.pathname = `${basePath}/trace/${encodeURIComponent(traceId)}`;
  traceUrl.search = "";
  traceUrl.hash = "";
  return traceUrl;
}

function emptyTraceChecks() {
  return {
    traceEnvelopeValid: false,
    tracePersisted: false,
    traceReadable: false,
    traceAllowedFieldsOnly: false,
    traceValuesBounded: false,
    traceFingerprintWithheld: false,
    traceMetadataMatched: false,
    tracePrivacyDeclared: false,
  };
}

async function inspectTrace(trace, expectedStatus) {
  const model = boundedMetadataId(trace?.model);
  const promptVersion = boundedMetadataId(trace?.promptVersion);
  const traceId = typeof trace?.id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trace.id)
    ? trace.id
    : null;
  const envelopeTaxonomyIds = boundedSelectedIds(trace?.taxonomyIds, allowedTopicIds);
  const checks = emptyTraceChecks();
  checks.traceEnvelopeValid = Boolean(
    traceId &&
    model &&
    promptVersion &&
    typeof trace?.persisted === "boolean" &&
    Array.isArray(trace?.taxonomyIds) &&
    envelopeTaxonomyIds.length === trace.taxonomyIds.length,
  );
  checks.tracePersisted = checks.traceEnvelopeValid && trace.persisted === true;

  const reproducibility = checks.traceEnvelopeValid
    ? { model, promptVersion }
    : { model: null, promptVersion: null };
  if (!checks.tracePersisted || !traceId) return { checks, reproducibility };

  let response;
  try {
    response = await fetchWithTimeout(traceUrlFor(traceId), { headers: authHeaders() });
  } catch {
    return { checks, reproducibility };
  }
  checks.traceReadable = response.ok;
  if (!response.ok) return { checks, reproducibility };

  let body;
  try {
    body = await response.json();
  } catch {
    return { checks, reproducibility };
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return { checks, reproducibility };

  checks.traceAllowedFieldsOnly = Object.keys(body).every((key) => TRACE_ALLOWED_KEYS.has(key));
  const bodyTaxonomyIds = boundedSelectedIds(body.taxonomyIds, allowedTopicIds);
  checks.traceValuesBounded =
    Number.isSafeInteger(body.createdAt) &&
    body.createdAt > 0 &&
    boundedMetadataId(body.model) !== null &&
    boundedMetadataId(body.promptVersion) !== null &&
    boundedMetadataId(body.artifactKey) !== null &&
    (body.fallbackReason === null || boundedMetadataId(body.fallbackReason) !== null) &&
    boundedMetadataId(body.outputSchemaVersion) !== null &&
    Array.isArray(body.taxonomyIds) &&
    bodyTaxonomyIds.length === body.taxonomyIds.length;
  checks.traceFingerprintWithheld = !("inputFingerprint" in body);
  checks.traceMetadataMatched =
    body.id === traceId &&
    body.model === model &&
    body.promptVersion === promptVersion &&
    body.status === expectedStatus &&
    sameIds(body.taxonomyIds, trace.taxonomyIds);
  checks.tracePrivacyDeclared =
    typeof body.privacy === "string" &&
    /no raw learner text, images, evidence quotes, or model response are stored/i.test(body.privacy);

  return { checks, reproducibility };
}

async function scoreResponse(evalCase, body, httpStatus) {
  const expected = evalCase.expected;
  if (body?.mode === "curated_fallback") {
    const traceAudit = await inspectTrace(body.trace, "curated_fallback");
    const checks = {
      safeFallback: httpStatus >= 200 && httpStatus < 300,
      expectedClarification: expected.disposition === "clarify_input",
      ...traceAudit.checks,
    };
    return {
      report: {
        caseId: evalCase.caseId,
        mode: "curated_fallback",
        httpStatus,
        pass: Object.values(checks).every(Boolean),
        checks,
      },
      reproducibility: traceAudit.reproducibility,
    };
  }

  if (body?.mode !== "live" || !body.diagnosis) {
    return {
      report: {
        caseId: evalCase.caseId,
        mode: "invalid",
        httpStatus,
        pass: false,
        checks: { responseShape: false },
      },
      reproducibility: { model: null, promptVersion: null },
    };
  }

  const diagnosis = body.diagnosis;
  const concepts = Array.isArray(diagnosis.concepts) ? diagnosis.concepts : [];
  const hypotheses = Array.isArray(diagnosis.hypotheses) ? diagnosis.hypotheses : [];
  const actualTopicIds = concepts.map((concept) => concept?.id).filter((id) => typeof id === "string");
  const actualMisconceptions = hypotheses.map((hypothesis) => hypothesis?.id).filter((id) => typeof id === "string");
  const traceAudit = await inspectTrace(body.trace, "live");
  const checks = {
    responseOk: httpStatus >= 200 && httpStatus < 300,
    equationPreserved: diagnosis.inputFidelity?.canonicalEquation === expected.canonicalEquation,
    tokensPreserved:
      Array.isArray(diagnosis.inputFidelity?.preservedTokens) &&
      expected.preservedTokens.every((token) => diagnosis.inputFidelity.preservedTokens.includes(token)),
    topicGrounded: actualTopicIds.some((topicId) => expected.acceptableTopicIds.includes(topicId)),
    misconceptionPlausible: actualMisconceptions.some((id) => expected.acceptableMisconceptionIds.includes(id)),
    probeBeforeTeaching: Boolean(diagnosis.probe?.questionHi) && !directAnswerAppears(diagnosis, expected.expectedAnswer),
    hindiBridgePresent: Array.isArray(diagnosis.languageBridge?.terms) && diagnosis.languageBridge.terms.length >= 1,
    ...traceAudit.checks,
  };

  return {
    report: {
      caseId: evalCase.caseId,
      mode: "live",
      httpStatus,
      pass: Object.values(checks).every(Boolean),
      checks,
      selectedTopicIds: boundedSelectedIds(actualTopicIds, allowedTopicIds),
      selectedMisconceptionIds: boundedSelectedIds(actualMisconceptions, ALLOWED_MISCONCEPTION_IDS),
    },
    reproducibility: traceAudit.reproducibility,
  };
}

async function evaluateCase(evalCase) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response;
    try {
      response = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          problemText: evalCase.input.problemText,
          learnerReasoning: evalCase.input.reasoning.raw,
          visibleWorkText: evalCase.input.visibleWork ?? undefined,
        }),
      });
    } catch (error) {
      if (attempt < maxAttempts) {
        await retryDelay(attempt);
        continue;
      }
      const timedOut = isTimeoutError(error);
      return {
        report: {
          caseId: evalCase.caseId,
          mode: timedOut ? "timeout" : "network_error",
          httpStatus: 0,
          attempts: attempt,
          pass: false,
          checks: { diagnosisCompleted: false, withinTimeout: !timedOut },
        },
        reproducibility: { model: null, promptVersion: null },
      };
    }

    let body;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    if (attempt < maxAttempts && transientResponse(response.status, body)) {
      await retryDelay(attempt);
      continue;
    }
    const evaluation = await scoreResponse(evalCase, body, response.status);
    evaluation.report.attempts = attempt;
    return evaluation;
  }
  throw new Error("Evaluation retry loop ended unexpectedly.");
}

function incrementCount(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function reproducibilitySummary(evaluations) {
  const models = new Map();
  const prompts = new Map();
  const pairs = new Map();
  let tracedCases = 0;

  for (const evaluation of evaluations) {
    const { model, promptVersion } = evaluation.reproducibility;
    if (!model || !promptVersion) continue;
    tracedCases += 1;
    incrementCount(models, model);
    incrementCount(prompts, promptVersion);
    incrementCount(pairs, `${model}\n${promptVersion}`);
  }

  return {
    tracedCases,
    untracedCases: evaluations.length - tracedCases,
    consistentModelAndPrompt: tracedCases === evaluations.length && pairs.size === 1,
    models: [...models].map(([id, count]) => ({ id, count })),
    promptVersions: [...prompts].map(([id, count]) => ({ id, count })),
    pairs: [...pairs].map(([key, count]) => {
      const [modelId, promptVersionId] = key.split("\n");
      return { modelId, promptVersionId, count };
    }),
  };
}

const evaluations = new Array(cases.length);
let nextCaseIndex = 0;
let completedCases = 0;

async function runWorker() {
  while (true) {
    const caseIndex = nextCaseIndex;
    nextCaseIndex += 1;
    if (caseIndex >= cases.length) return;

    const evalCase = cases[caseIndex];
    const startedAt = Date.now();
    console.log(`[start ${caseIndex + 1}/${cases.length}] ${evalCase.caseId}`);
    const evaluation = await evaluateCase(evalCase);
    evaluations[caseIndex] = evaluation;
    completedCases += 1;
    const outcome = evaluation.report.pass ? "PASS" : "FAIL";
    console.log(
      `[done ${completedCases}/${cases.length}] ${evalCase.caseId} ${outcome} ` +
      `(${evaluation.report.mode}, ${Date.now() - startedAt}ms)`,
    );
  }
}

console.log(
  `Golden evaluation starting: ${cases.length} cases, concurrency ${Math.min(concurrency, cases.length)}, ` +
  `timeout ${timeoutMs}ms per request, up to ${maxAttempts} attempts for transient failures.`,
);
await Promise.all(
  Array.from({ length: Math.min(concurrency, cases.length) }, () => runWorker()),
);

const reports = evaluations.map((evaluation) => evaluation.report);
const passed = reports.filter((report) => report.pass).length;
const report = {
  generatedAt: new Date().toISOString(),
  suite: requestedCaseIds.length > 0
    ? `case-filter:${requestedCaseIds.join(",")}`
    : includeHoldout ? "all-32" : "seed-and-development-24",
  configuration: { timeoutMs, maxAttempts, concurrency: Math.min(concurrency, cases.length) },
  total: reports.length,
  passed,
  failed: reports.length - passed,
  reproducibility: reproducibilitySummary(evaluations),
  results: reports,
  privacy:
    "This report contains case IDs, bounded selected IDs, checks, and reproducibility metadata only; " +
    "it does not write learner prompts, images, evidence quotes, or model responses.",
};
const reportDir = path.join(root, "work", "eval-reports");
fs.mkdirSync(reportDir, { recursive: true });
const reportPath = path.join(reportDir, `golden-${Date.now()}.json`);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Golden evaluation: ${passed}/${reports.length} passed. Report: ${path.relative(root, reportPath)}`);
if (report.failed > 0) process.exitCode = 1;
