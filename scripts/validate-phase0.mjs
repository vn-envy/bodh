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
const evaporationTaxonomy = readJson("data/taxonomy/evaporation-water-cycle.slice.json");

const errors = [];
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateArtifact = ajv.compile(artifactSchema);
const validateCase = ajv.compile(evalSchema);

if (!validateArtifact(artifact)) {
  errors.push(`hero artifact: ${ajv.errorsText(validateArtifact.errors, { separator: "\n  " })}`);
}

if (!Array.isArray(cases) || cases.length !== 9) {
  errors.push(`seed suite must contain exactly 9 cases; found ${Array.isArray(cases) ? cases.length : "non-array"}`);
} else {
  for (const evalCase of cases) {
    if (!validateCase(evalCase)) {
      errors.push(`${evalCase.caseId ?? "unknown case"}: ${ajv.errorsText(validateCase.errors, { separator: "\n  " })}`);
    }
  }
}

const taxonomies = [taxonomy, evaporationTaxonomy];
const topicIds = taxonomies.flatMap((slice) => slice.topics.map((topic) => topic.id));
const topicIdSet = new Set(topicIds);
if (topicIdSet.size !== topicIds.length) errors.push("taxonomy topic IDs must be unique");
for (const slice of taxonomies) {
  const sliceTopicIds = new Set(slice.topics.map((topic) => topic.id));
  const dependencyKeys = new Set();
  if (!sliceTopicIds.has(slice.selection.targetTopicId)) errors.push("taxonomy target topic is missing from its slice");
  for (const edge of slice.dependencies) {
    const dependencyKey = `${edge.prerequisiteId}:${edge.topicId}`;
    if (dependencyKeys.has(dependencyKey)) errors.push(`duplicate dependency is not allowed: ${dependencyKey}`);
    dependencyKeys.add(dependencyKey);
    if (!sliceTopicIds.has(edge.topicId)) errors.push(`dependency topic is outside slice: ${edge.topicId}`);
    if (!sliceTopicIds.has(edge.prerequisiteId)) errors.push(`dependency prerequisite is outside slice: ${edge.prerequisiteId}`);
    if (edge.topicId === edge.prerequisiteId) errors.push(`self dependency is not allowed: ${edge.topicId}`);
  }
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

for (const slice of taxonomies) {
  if (slice.source.commit !== "96a7933754af672e1bfdbf7ecb05c325860c6e0d") {
    errors.push("taxonomy source commit changed without updating the Phase 0 evidence record");
  }
}

// Bodh Van: reviewed atom slot fills must satisfy the same schema a model output must.
const atomFillSchema = readJson("schemas/atom-slot-fill.schema.json");
const validateFill = ajv.compile(atomFillSchema);
const { validateAtomFill } = await import("../lib/atom-fill-guardrails.ts");
const { ATOM_TEMPLATE_IDS } = await import("../lib/atom-templates.ts");
let fillCount = 0;
for (const templateId of ATOM_TEMPLATE_IDS) {
  const fills = readJson(`data/fixtures/atom-fills/${templateId}.json`);
  if (!Array.isArray(fills) || fills.length < 2) errors.push(`${templateId}: expected authored fills for hi and en`);
  const languages = new Set();
  for (const fill of fills ?? []) {
    fillCount += 1;
    languages.add(fill.language);
    if (!validateFill(fill)) errors.push(`${templateId} fill (${fill.language}): ${ajv.errorsText(validateFill.errors, { separator: "\n  " })}`);
    const verdict = validateAtomFill(fill);
    if (!verdict.ok) errors.push(`${templateId} fill (${fill.language}) rejected by guardrails: ${verdict.reason}`);
    if (fill.templateId !== templateId) errors.push(`${templateId} fill declares template ${fill.templateId}`);
  }
  for (const language of ["hi", "en"]) {
    if (!languages.has(language)) errors.push(`${templateId}: missing authored fill for ${language}`);
  }
}
const growthGraphSchema = readJson("schemas/growth-graph.schema.json");
ajv.compile(growthGraphSchema);

if (errors.length > 0) {
  console.error("Phase 0 validation failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Phase 0 validation passed: 1 artifact, ${cases.length} seeds, ${topicIds.length} topics, ${taxonomies.reduce((total, slice) => total + slice.dependencies.length, 0)} edges, ${fillCount} atom fills.`,
);
