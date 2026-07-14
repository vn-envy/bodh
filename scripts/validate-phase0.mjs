import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const artifactSchema = readJson("schemas/artifact.schema.json");
const evalSchema = readJson("schemas/golden-eval-case.schema.json");
const artifact = readJson("data/fixtures/hero-artifact.json");
const cases = readJson("data/fixtures/seed-cases.json");
const taxonomy = readJson("data/taxonomy/fractions-division.slice.json");

const errors = [];
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateArtifact = ajv.compile(artifactSchema);
const validateCase = ajv.compile(evalSchema);

if (!validateArtifact(artifact)) {
  errors.push(`hero artifact: ${ajv.errorsText(validateArtifact.errors, { separator: "\n  " })}`);
}

if (!Array.isArray(cases) || cases.length !== 8) {
  errors.push(`seed suite must contain exactly 8 cases; found ${Array.isArray(cases) ? cases.length : "non-array"}`);
} else {
  for (const evalCase of cases) {
    if (!validateCase(evalCase)) {
      errors.push(`${evalCase.caseId ?? "unknown case"}: ${ajv.errorsText(validateCase.errors, { separator: "\n  " })}`);
    }
  }
}

const topicIds = taxonomy.topics.map((topic) => topic.id);
const topicIdSet = new Set(topicIds);
if (topicIdSet.size !== topicIds.length) errors.push("taxonomy topic IDs must be unique");
if (!topicIdSet.has(taxonomy.selection.targetTopicId)) errors.push("taxonomy target topic is missing from the slice");

for (const edge of taxonomy.dependencies) {
  if (!topicIdSet.has(edge.topicId)) errors.push(`dependency topic is outside slice: ${edge.topicId}`);
  if (!topicIdSet.has(edge.prerequisiteId)) errors.push(`dependency prerequisite is outside slice: ${edge.prerequisiteId}`);
  if (edge.topicId === edge.prerequisiteId) errors.push(`self dependency is not allowed: ${edge.topicId}`);
}

for (const conceptId of artifact.conceptIds) {
  if (!topicIdSet.has(conceptId)) errors.push(`artifact concept is outside taxonomy slice: ${conceptId}`);
}

for (const evalCase of cases) {
  for (const conceptId of evalCase.expected.acceptableTopicIds) {
    if (!topicIdSet.has(conceptId)) errors.push(`${evalCase.caseId} expects unsupported topic: ${conceptId}`);
  }
}

const caseIds = cases.map((evalCase) => evalCase.caseId);
if (new Set(caseIds).size !== caseIds.length) errors.push("seed case IDs must be unique");

const { dividend, divisor, expectedQuotient } = artifact.equation;
const computedNumerator = dividend.numerator * divisor.denominator;
const computedDenominator = dividend.denominator * divisor.numerator;
if (computedNumerator * expectedQuotient.denominator !== expectedQuotient.numerator * computedDenominator) {
  errors.push("hero artifact expected quotient does not match its dividend and divisor");
}

if (
  expectedQuotient.denominator === 1 &&
  artifact.successPredicate.expectedCount !== expectedQuotient.numerator
) {
  errors.push("hero artifact success count must equal the integer quotient");
}

if (taxonomy.source.commit !== "96a7933754af672e1bfdbf7ecb05c325860c6e0d") {
  errors.push("taxonomy source commit changed without updating the Phase 0 evidence record");
}

if (errors.length > 0) {
  console.error("Phase 0 validation failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Phase 0 validation passed: 1 artifact, ${cases.length} seeds, ${taxonomy.topics.length} topics, ${taxonomy.dependencies.length} edges.`,
);
