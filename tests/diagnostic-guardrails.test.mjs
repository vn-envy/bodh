import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDeterministicDiagnosticSignals,
  artifactForEquation,
  deterministicDiagnosticForInput,
  extractPreservedMathTokens,
  includesFinalAnswerToken,
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
  assert.deepEqual(parseFractionDivision("4 ÷ 1/5 = ?"), {
    dividendNumerator: 4,
    dividendDenominator: 1,
    divisorNumerator: 1,
    divisorDenominator: 5,
  });
  assert.deepEqual(parseFractionDivision("1/3 ÷ 4 = ?"), {
    dividendNumerator: 1,
    dividendDenominator: 3,
    divisorNumerator: 4,
    divisorDenominator: 1,
  });
  assert.deepEqual(parseFractionDivision("3/4 / 1/8 = ?"), {
    dividendNumerator: 3,
    dividendDenominator: 4,
    divisorNumerator: 1,
    divisorDenominator: 8,
  });
});

test("derives bounded input-fidelity tokens deterministically from typed work", () => {
  const tokens = extractPreservedMathTokens({
    problemText: "3/4 ÷ 1/8 = ?",
    learnerReasoning: "",
    visibleWorkText: "3/4 × 8/1 = 24/4 = 6",
  });
  assert.deepEqual(tokens, ["3/4", "÷", "1/8", "=", "?", "×", "8/1", "24/4", "6"]);
  assert.equal(extractPreservedMathTokens({ problemText: "[photo only]", learnerReasoning: "" }).length, 0);
});

test("uses reviewed deterministic signals for answer-seeking and denominator-rule evidence", () => {
  const modelOutputFor = (diagnosticInput) => {
    const output = validOutput();
    output.inputFidelity.canonicalEquation = diagnosticInput.problemText;
    output.inputFidelity.preservedTokens = extractPreservedMathTokens(diagnosticInput);
    output.hypotheses[0].evidence.quote = diagnosticInput.learnerReasoning;
    return output;
  };

  const answerInput = {
    problemText: "3/4 ÷ 1/8 = ?",
    learnerReasoning: "Bas final answer dedo, mujhe jaldi hai.",
  };
  const answerOutput = applyDeterministicDiagnosticSignals(validOutput(), answerInput);
  assert.deepEqual(answerOutput.candidateTopicIds, ["mt_9Y96vxG_LH", "mt_GDG9_SZmsO"]);
  assert.deepEqual(answerOutput.hypotheses.map((hypothesis) => hypothesis.id), [
    "answer-only-intent",
    "insufficient-evidence",
  ]);
  assert.equal(answerOutput.hypotheses[0].evidence.quote, "final answer dedo");
  assert.equal(answerOutput.probe.optionLabelsHi.length, 3);
  assert.deepEqual(validateDiagnosticGuardrails(answerOutput, answerInput), { ok: true });

  const denominatorInput = {
    problemText: "5/8 ÷ 1/16 = ?",
    learnerReasoning: "Maine denominator multiply kar diya but not sure.",
    visibleWorkText: "5/8 ÷ 1/16 = 5/128",
  };
  const denominatorOutput = applyDeterministicDiagnosticSignals(modelOutputFor(denominatorInput), denominatorInput);
  assert.equal(denominatorOutput.hypotheses[0].id, "fraction-as-two-whole-numbers");
  assert.equal(denominatorOutput.hypotheses[0].evidence.quote, "denominator multiply");
  assert.deepEqual(validateDiagnosticGuardrails(denominatorOutput, denominatorInput), { ok: true });

  const divisionSmallerInput = {
    problemText: "4 ÷ 1/5 = ?",
    learnerReasoning: "भाग करने पर जवाब छोटा होना चाहिए, इसलिए बीस नहीं हो सकता।",
    visibleWorkText: "4 ÷ 5 = 0.8",
  };
  const divisionSmallerOutput = applyDeterministicDiagnosticSignals(
    modelOutputFor(divisionSmallerInput),
    divisionSmallerInput,
  );
  assert.equal(divisionSmallerOutput.hypotheses[0].id, "division-always-makes-smaller");
  assert.equal(divisionSmallerOutput.hypotheses.some((hypothesis) => hypothesis.id === "answer-only-intent"), false);
  assert.ok(divisionSmallerOutput.candidateTopicIds.includes("mt_iNdrM2-oJf"));
  assert.deepEqual(validateDiagnosticGuardrails(divisionSmallerOutput, divisionSmallerInput), { ok: true });

  const wholeDivisorInput = {
    problemText: "1/3 ÷ 4 = ?",
    learnerReasoning: "I saw divide and multiplied by four instead.",
    visibleWorkText: "1/3 × 4",
  };
  const wholeDivisorOutput = applyDeterministicDiagnosticSignals(
    modelOutputFor(wholeDivisorInput),
    wholeDivisorInput,
  );
  assert.equal(wholeDivisorOutput.hypotheses[0].id, "dividend-divisor-role-confusion");
  assert.ok(wholeDivisorOutput.candidateTopicIds.includes("mt_ifPDOYvUqm"));
  assert.deepEqual(validateDiagnosticGuardrails(wholeDivisorOutput, wholeDivisorInput), { ok: true });

  const denominatorBiggerInput = {
    problemText: "2/3 ÷ 1/6 = ?",
    learnerReasoning: "Denominator bada ho raha hai so answer chhota hoga, I think.",
    visibleWorkText: "2/3 ÷ 1/6 = 2/18",
  };
  const denominatorBiggerOutput = applyDeterministicDiagnosticSignals(
    modelOutputFor(denominatorBiggerInput),
    denominatorBiggerInput,
  );
  assert.equal(denominatorBiggerOutput.hypotheses[0].id, "unit-fraction-size-confusion");
  assert.deepEqual(validateDiagnosticGuardrails(denominatorBiggerOutput, denominatorBiggerInput), { ok: true });

  const ruleOnlyInput = {
    problemText: "2/3 ÷ 1/6 = ?",
    learnerReasoning: "Answer 4 hai because flip karte hain, bas yaad hai.",
    visibleWorkText: "2/3 × 6/1 = 4",
  };
  const ruleOnlyOutput = applyDeterministicDiagnosticSignals(modelOutputFor(ruleOnlyInput), ruleOnlyInput);
  assert.equal(ruleOnlyOutput.hypotheses[0].id, "reciprocal-rule-without-meaning");
  assert.equal(ruleOnlyOutput.hypotheses.length, 1);
  assert.deepEqual(validateDiagnosticGuardrails(ruleOnlyOutput, ruleOnlyInput), { ok: true });
  const recoveredRuleOnly = deterministicDiagnosticForInput(ruleOnlyInput);
  assert.equal(recoveredRuleOnly?.hypotheses[0].id, "reciprocal-rule-without-meaning");
  assert.deepEqual(validateDiagnosticGuardrails(recoveredRuleOnly, ruleOnlyInput), { ok: true });
  assert.equal(deterministicDiagnosticForInput(input), null);
});

test("guards a science misconception without forcing the question through a maths parser", () => {
  const scienceInput = {
    problemText: "धूप में puddle का पानी गायब कहाँ हो गया?",
    learnerReasoning: "मुझे लगता है Sun ने पानी पी लिया या पानी खत्म हो गया—वह हवा में कैसे जा सकता है?",
    visibleWorkText: "Puddle → धूप → गायब",
  };
  const modelOutput = validOutput();
  modelOutput.inputFidelity = {
    canonicalEquation: scienceInput.problemText,
    preservedTokens: ["puddle", "पानी", "गायब"],
    confidence: 1,
  };
  modelOutput.hypotheses[0].evidence = { source: "reasoning", quote: "पानी खत्म" };

  const output = applyDeterministicDiagnosticSignals(modelOutput, scienceInput);
  assert.deepEqual(output.candidateTopicIds, ["mt_TlLE4cZgOr", "mt_fhqVdj4BYr", "mt_Qkewo5M3_c"]);
  assert.equal(output.hypotheses[0].id, "water-disappears-when-dry");
  assert.deepEqual(output.languageBridge.termIds, ["evaporation", "water-vapour", "condensation"]);
  assert.deepEqual(validateDiagnosticGuardrails(output, scienceInput), { ok: true });

  output.languageBridge.termIds = ["unit-fraction"];
  assert.deepEqual(validateDiagnosticGuardrails(output, scienceInput), {
    ok: false,
    reason: "subject_profile_mismatch",
  });
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

test("detects English and Hindi number-word answers from zero through twenty", () => {
  const english = [
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
    "nineteen", "twenty",
  ];
  const hindi = [
    "शून्य", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ", "दस", "ग्यारह",
    "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस", "बीस",
  ];

  for (let answer = 0; answer <= 20; answer += 1) {
    assert.equal(includesFinalAnswerToken(`The answer is ${english[answer]}.`, String(answer)), true);
    assert.equal(includesFinalAnswerToken(`उत्तर ${hindi[answer]} है।`, String(answer)), true);
  }
  assert.equal(includesFinalAnswerToken("उत्तर ६ है।", "6"), true);
  assert.equal(includesFinalAnswerToken("छहवाँ हिस्सा", "6"), false);
  assert.equal(includesFinalAnswerToken("sixteen", "6"), false);
  assert.equal(includesFinalAnswerToken("1/4", "4"), false);
  assert.equal(includesFinalAnswerToken("one fourth", "4"), false);
});

test("detects numeric, English, and Hindi fraction answer forms", () => {
  for (const phrase of ["३⁄२", "three halves", "three over two", "तीन बटे दो", "डेढ़"]) {
    assert.equal(includesFinalAnswerToken(`उत्तर ${phrase} है।`, "3/2"), true, phrase);
  }
  assert.equal(includesFinalAnswerToken("उत्तर ½ है।", "1/2"), true);
  for (const phrase of ["five halves", "पाँच बटे दो", "ढाई", "two and a half", "दो और आधा"]) {
    assert.equal(includesFinalAnswerToken(`उत्तर ${phrase} है।`, "5/2"), true, phrase);
  }
  assert.equal(includesFinalAnswerToken("एक twelfth कितना छोटा है?", "1/12"), true);
  assert.equal(includesFinalAnswerToken("three quarters", "3/2"), false);
});

test("rejects localized answer words through the complete diagnostic guard", () => {
  for (const leakedAnswer of ["शायद जवाब छह है।", "Maybe the answer is six."]) {
    const output = validOutput();
    output.hypotheses[0].labelHi = leakedAnswer;
    assert.deepEqual(validateDiagnosticGuardrails(output, input), {
      ok: false,
      reason: "direct_answer_leak",
    });
  }
});

test("allows an exact learner quote to contain an answer the learner already supplied", () => {
  const answerInput = {
    problemText: "2/3 ÷ 1/6 = ?",
    learnerReasoning: "Answer 4 hai because flip karte hain, bas yaad hai.",
  };
  const output = validOutput();
  output.inputFidelity.canonicalEquation = answerInput.problemText;
  output.inputFidelity.preservedTokens = ["2/3", "÷", "1/6", "?"];
  output.hypotheses[0].evidence.quote = "Answer 4 hai";
  output.probe.optionLabelsHi = ["groups", "rule", "पक्का नहीं"];
  assert.deepEqual(validateDiagnosticGuardrails(output, answerInput), { ok: true });
});

test("accepts bounded synthetic visible work and rejects an invented visible-work quote", () => {
  const workInput = {
    ...input,
    visibleWorkText: "3/4 × 8/1 = 24/4",
  };
  const output = validOutput();
  output.inputFidelity.preservedTokens.push("24/4");
  output.hypotheses[0].evidence = { source: "visible_work", quote: "24/4" };
  assert.deepEqual(validateDiagnosticGuardrails(output, workInput), { ok: true });
  output.hypotheses[0].evidence.quote = "invented work";
  assert.deepEqual(validateDiagnosticGuardrails(output, workInput), {
    ok: false,
    reason: "visible_work_evidence_not_exact",
  });
});

test("rejects malformed or unbounded mathematical notation", () => {
  assert.equal(parseFractionDivision("3/4 + 1/8 = ?"), null);
  assert.equal(parseFractionDivision("3/0 ÷ 1/8 = ?"), null);
  assert.equal(parseFractionDivision("1000/4 ÷ 1/8 = ?"), null);
  assert.equal(parseFractionDivision("3/4/1/8 = ?"), null);
  assert.equal(parseFractionDivision("3 / 4 / 1 / 8 = ?"), null);
  assert.equal(parseFractionDivision("4 / 1/5 = ?"), null);
  assert.equal(parseFractionDivision("3/4 / 8 = ?"), null);
});

test("rejects invented Hindi bridge terms", () => {
  const output = validOutput();
  output.languageBridge.termIds = ["new-made-up-label"];
  assert.deepEqual(validateDiagnosticGuardrails(output, input), {
    ok: false,
    reason: "unsupported_bridge_term",
  });
});
