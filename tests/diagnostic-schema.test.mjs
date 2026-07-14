import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";

const schema = JSON.parse(
  await readFile(new URL("../schemas/diagnostic-output.schema.json", import.meta.url), "utf8"),
);

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

test("strict diagnostic schema permits the bounded contract and rejects answer fields", () => {
  const validate = new Ajv2020({ strict: false }).compile(schema);
  assert.equal(validate(validOutput), true, JSON.stringify(validate.errors));
  assert.equal(validate({ ...validOutput, answer: 6 }), false);
});
