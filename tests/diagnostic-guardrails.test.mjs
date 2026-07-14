import assert from "node:assert/strict";
import test from "node:test";
import {
  artifactForEquation,
  parseFractionDivision,
  validateDiagnosticGuardrails,
} from "../lib/diagnostic-guardrails.ts";

const input = {
  problemText: "3/4 ÷ 1/8 = ?",
  learnerReasoning: "मुझे समझ नहीं आता कि इसे उल्टा करके multiply क्यों करते हैं।",
};

function validOutput() {
  return {
    schemaVersion: "1.0.0",
    inputFidelity: {
      canonicalEquation: "3/4 ÷ 1/8 = ?",
      preservedTokens: ["3/4", "÷", "1/8", "?"],
      confidence: 1,
    },
    candidateTopicIds: ["mt_9Y96vxG_LH", "mt_GDG9_SZmsO"],
    hypotheses: [
      {
        id: "reciprocal-rule-without-meaning",
        labelHi: "Rule के पीछे groups का meaning अभी साफ़ नहीं है।",
        evidence: { source: "reasoning", quote: "उल्टा करके multiply" },
      },
    ],
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
}

test("parses bounded fraction division and recognizes the curated hero artifact", () => {
  assert.deepEqual(parseFractionDivision("3/4 ÷ 1/8 = ?"), {
    dividendNumerator: 3,
    dividendDenominator: 4,
    divisorNumerator: 1,
    divisorDenominator: 8,
  });
  assert.equal(artifactForEquation("3/4 ÷ 1/8 = ?"), "fraction-fit-3-4-div-1-8");
  assert.equal(artifactForEquation("2/3 ÷ 1/6 = ?"), null);
});

test("rejects equation mutation before a diagnosis can reach the learner", () => {
  const output = validOutput();
  output.inputFidelity.canonicalEquation = "3/4 ÷ 1/4 = ?";
  assert.deepEqual(validateDiagnosticGuardrails(output, input), {
    ok: false,
    reason: "equation_not_preserved",
  });
});

test("rejects curriculum IDs outside the committed Marble slice", () => {
  const output = validOutput();
  output.candidateTopicIds = ["made-up-topic"];
  assert.deepEqual(validateDiagnosticGuardrails(output, input), {
    ok: false,
    reason: "unsupported_taxonomy_id",
  });
});

test("rejects evidence that was not actually supplied by the learner", () => {
  const output = validOutput();
  output.hypotheses[0].evidence.quote = "I know the answer";
  assert.deepEqual(validateDiagnosticGuardrails(output, input), {
    ok: false,
    reason: "reasoning_evidence_not_exact",
  });
});

test("rejects a model response that leaks the original final answer into a probe", () => {
  const output = validOutput();
  output.probe.optionLabelsHi = ["4", "5", "6", "8"];
  assert.deepEqual(validateDiagnosticGuardrails(output, input), {
    ok: false,
    reason: "direct_answer_leak",
  });
});

test("rejects malformed or unbounded mathematical notation", () => {
  assert.equal(parseFractionDivision("3/4 + 1/8 = ?"), null);
  assert.equal(parseFractionDivision("3/0 ÷ 1/8 = ?"), null);
  assert.equal(parseFractionDivision("1000/4 ÷ 1/8 = ?"), null);
});

test("rejects invented Hindi bridge terms", () => {
  const output = validOutput();
  output.languageBridge.termIds = ["new-made-up-label"];
  assert.deepEqual(validateDiagnosticGuardrails(output, input), {
    ok: false,
    reason: "unsupported_bridge_term",
  });
});
