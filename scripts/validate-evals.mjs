import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const schema = readJson("schemas/golden-eval-case.schema.json");
const taxonomy = readJson("data/taxonomy/fractions-division.slice.json");
const suites = [
  { name: "seed", cases: readJson("data/fixtures/seed-cases.json"), expectedCount: 8, reviewStatus: "seed" },
  { name: "development", cases: readJson("data/evals/development-gold.json"), expectedCount: 16, reviewStatus: "reviewed" },
  { name: "holdout", cases: readJson("data/evals/frozen-holdout.json"), expectedCount: 8, reviewStatus: "frozen" },
];
const errors = [];
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validate = ajv.compile(schema);
const topicIds = new Set(taxonomy.topics.map((topic) => topic.id));
const allCaseIds = new Set();

for (const suite of suites) {
  if (!Array.isArray(suite.cases) || suite.cases.length !== suite.expectedCount) {
    errors.push(`${suite.name} suite must contain ${suite.expectedCount} cases`);
    continue;
  }
  for (const evalCase of suite.cases) {
    if (!validate(evalCase)) errors.push(`${evalCase.caseId ?? suite.name}: ${ajv.errorsText(validate.errors)}`);
    if (evalCase.reviewStatus !== suite.reviewStatus) errors.push(`${evalCase.caseId}: wrong review status for ${suite.name}`);
    if (allCaseIds.has(evalCase.caseId)) errors.push(`${evalCase.caseId}: duplicate case ID`);
    allCaseIds.add(evalCase.caseId);
    for (const topicId of evalCase.expected?.acceptableTopicIds ?? []) {
      if (!topicIds.has(topicId)) errors.push(`${evalCase.caseId}: unsupported taxonomy ID ${topicId}`);
    }
    if (evalCase.expected?.directSolutionBeforeProbe !== false) errors.push(`${evalCase.caseId}: must forbid a direct solution before the probe`);
  }
}

if (errors.length) {
  console.error("Golden evaluation validation failed:\n" + errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`Golden evaluation validation passed: ${allCaseIds.size} cases (8 seed, 16 development, 8 frozen holdout).`);
