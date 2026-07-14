import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const includeHoldout = process.argv.includes("--include-holdout");
const endpoint = process.env.BODH_EVAL_URL;

if (!endpoint) {
  console.error("Set BODH_EVAL_URL to a running /api/diagnose endpoint before running golden evals.");
  process.exit(1);
}

const suites = [readJson("data/fixtures/seed-cases.json"), readJson("data/evals/development-gold.json")];
if (includeHoldout) suites.push(readJson("data/evals/frozen-holdout.json"));
const cases = suites.flat();

function directAnswerAppears(diagnosis, expectedAnswer) {
  if (!expectedAnswer) return false;
  const escaped = expectedAnswer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const answerPattern = new RegExp(`(^|[^0-9])${escaped}(?=$|[^0-9])`);
  const words = [
    ...diagnosis.hypotheses.flatMap((hypothesis) => [hypothesis.labelHi, hypothesis.evidence.quote]),
    diagnosis.probe.questionHi,
    diagnosis.probe.distinction,
    ...diagnosis.probe.optionLabelsHi,
  ];
  return words.some((word) => answerPattern.test(word));
}

function scoreResponse(evalCase, body, httpStatus) {
  const expected = evalCase.expected;
  if (body?.mode === "curated_fallback") {
    const pass = expected.disposition === "clarify_input";
    return {
      caseId: evalCase.caseId,
      mode: "curated_fallback",
      httpStatus,
      pass,
      checks: { safeFallback: true, expectedClarification: pass },
    };
  }

  if (body?.mode !== "live") {
    return { caseId: evalCase.caseId, mode: "invalid", httpStatus, pass: false, checks: { responseShape: false } };
  }

  const diagnosis = body.diagnosis;
  const actualTopicIds = diagnosis.concepts.map((concept) => concept.id);
  const actualMisconceptions = diagnosis.hypotheses.map((hypothesis) => hypothesis.id);
  const checks = {
    equationPreserved: diagnosis.inputFidelity.canonicalEquation === expected.canonicalEquation,
    tokensPreserved: expected.preservedTokens.every((token) => diagnosis.inputFidelity.preservedTokens.includes(token)),
    topicGrounded: actualTopicIds.some((topicId) => expected.acceptableTopicIds.includes(topicId)),
    misconceptionPlausible: actualMisconceptions.some((id) => expected.acceptableMisconceptionIds.includes(id)),
    probeBeforeTeaching: Boolean(diagnosis.probe?.questionHi) && !directAnswerAppears(diagnosis, expected.expectedAnswer),
    hindiBridgePresent: diagnosis.languageBridge?.terms?.length >= 1,
  };

  return {
    caseId: evalCase.caseId,
    mode: "live",
    httpStatus,
    pass: Object.values(checks).every(Boolean),
    checks,
    selectedTopicIds: actualTopicIds,
    selectedMisconceptionIds: actualMisconceptions,
  };
}

const reports = [];
for (const evalCase of cases) {
  try {
    const headers = { "content-type": "application/json" };
    if (process.env.BODH_EVAL_BEARER) headers["OAI-Sites-Authorization"] = `Bearer ${process.env.BODH_EVAL_BEARER}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        problemText: evalCase.input.problemText,
        learnerReasoning: evalCase.input.reasoning.raw,
      }),
    });
    let body;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    reports.push(scoreResponse(evalCase, body, response.status));
  } catch {
    reports.push({ caseId: evalCase.caseId, mode: "network_error", httpStatus: 0, pass: false, checks: { reachable: false } });
  }
}

const passed = reports.filter((report) => report.pass).length;
const report = {
  generatedAt: new Date().toISOString(),
  suite: includeHoldout ? "all-32" : "seed-and-development-24",
  total: reports.length,
  passed,
  failed: reports.length - passed,
  results: reports,
  privacy: "This report contains case IDs and checks only; it does not write learner prompts, images, evidence quotes, or model responses.",
};
const reportDir = path.join(root, "work", "eval-reports");
fs.mkdirSync(reportDir, { recursive: true });
const reportPath = path.join(reportDir, `golden-${Date.now()}.json`);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Golden evaluation: ${passed}/${reports.length} passed. Report: ${path.relative(root, reportPath)}`);
if (report.failed > 0) process.exitCode = 1;
