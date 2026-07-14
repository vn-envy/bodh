export const DIAGNOSTIC_SCHEMA_VERSION = "1.0.0";
export const PROMPT_VERSION = "p2.1";
// Kept in lockstep with data/taxonomy/fractions-division.slice.json. This
// runtime list lets the deterministic guardrail run in both the Worker and
// Node's lightweight test loader without importing a JSON module there.
export const SUPPORTED_TOPIC_IDS = new Set([
  "mt_9Y96vxG_LH",
  "mt_1PAWhRhpdg",
  "mt_ifPDOYvUqm",
  "mt_AabJisinfi",
  "mt_4Km38F4L-6",
  "mt_TgHxujL81r",
  "mt_09sySPqM9Z",
  "mt_ndGqFPWyen",
  "mt_GDG9_SZmsO",
  "mt_iNdrM2-oJf",
]);

const HYPOTHESIS_IDS = new Set([
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

const EVIDENCE_SOURCES = new Set(["problem", "reasoning", "visible_work"]);

export type DiagnosticRequestInput = {
  problemText: string;
  learnerReasoning: string;
  imageDataUrl?: string;
};

export type DiagnosticOutput = {
  schemaVersion: typeof DIAGNOSTIC_SCHEMA_VERSION;
  inputFidelity: {
    canonicalEquation: string;
    preservedTokens: string[];
    confidence: number;
  };
  candidateTopicIds: string[];
  hypotheses: Array<{
    id: string;
    labelHi: string;
    evidence: {
      source: "problem" | "reasoning" | "visible_work";
      quote: string;
    };
  }>;
  probe: {
    questionHi: string;
    optionLabelsHi: string[];
    distinction: string;
  };
};

export type FractionDivision = {
  dividendNumerator: number;
  dividendDenominator: number;
  divisorNumerator: number;
  divisorDenominator: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: string[]) {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function boundedString(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && value.length >= min && value.length <= max;
}

/**
 * Runtime twin of schemas/diagnostic-output.schema.json. The Worker runtime
 * deliberately blocks eval/new Function, so Ajv's dynamic compiler cannot run
 * there; Ajv validates the JSON Schema in CI while this explicit checker gates
 * untrusted model data at the network boundary.
 */
export function isDiagnosticOutputShape(value: unknown): value is DiagnosticOutput {
  if (!isRecord(value) || !hasOnlyKeys(value, ["schemaVersion", "inputFidelity", "candidateTopicIds", "hypotheses", "probe"])) {
    return false;
  }
  if (value.schemaVersion !== DIAGNOSTIC_SCHEMA_VERSION || !isRecord(value.inputFidelity)) return false;

  const fidelity = value.inputFidelity;
  if (
    !hasOnlyKeys(fidelity, ["canonicalEquation", "preservedTokens", "confidence"]) ||
    !boundedString(fidelity.canonicalEquation, 3, 120) ||
    !Array.isArray(fidelity.preservedTokens) ||
    fidelity.preservedTokens.length < 1 ||
    fidelity.preservedTokens.length > 12 ||
    !fidelity.preservedTokens.every((token) => boundedString(token, 1, 30)) ||
    typeof fidelity.confidence !== "number" ||
    !Number.isFinite(fidelity.confidence) ||
    fidelity.confidence < 0 ||
    fidelity.confidence > 1
  ) {
    return false;
  }

  if (
    !Array.isArray(value.candidateTopicIds) ||
    value.candidateTopicIds.length < 1 ||
    value.candidateTopicIds.length > 3 ||
    new Set(value.candidateTopicIds).size !== value.candidateTopicIds.length ||
    !value.candidateTopicIds.every((topicId) => typeof topicId === "string" && SUPPORTED_TOPIC_IDS.has(topicId))
  ) {
    return false;
  }

  if (!Array.isArray(value.hypotheses) || value.hypotheses.length < 1 || value.hypotheses.length > 3) return false;
  for (const hypothesis of value.hypotheses) {
    if (!isRecord(hypothesis) || !hasOnlyKeys(hypothesis, ["id", "labelHi", "evidence"])) return false;
    if (typeof hypothesis.id !== "string" || !HYPOTHESIS_IDS.has(hypothesis.id) || !boundedString(hypothesis.labelHi, 3, 180)) {
      return false;
    }
    if (!isRecord(hypothesis.evidence) || !hasOnlyKeys(hypothesis.evidence, ["source", "quote"])) return false;
    if (
      typeof hypothesis.evidence.source !== "string" ||
      !EVIDENCE_SOURCES.has(hypothesis.evidence.source) ||
      !boundedString(hypothesis.evidence.quote, 1, 160)
    ) {
      return false;
    }
  }

  if (!isRecord(value.probe) || !hasOnlyKeys(value.probe, ["questionHi", "optionLabelsHi", "distinction"])) return false;
  const { questionHi, optionLabelsHi, distinction } = value.probe;
  return (
    boundedString(questionHi, 6, 240) &&
    Array.isArray(optionLabelsHi) &&
    optionLabelsHi.length >= 2 &&
    optionLabelsHi.length <= 4 &&
    new Set(optionLabelsHi).size === optionLabelsHi.length &&
    optionLabelsHi.every((option) => boundedString(option, 1, 80)) &&
    boundedString(distinction, 3, 220)
  );
}

const FRACTION_DIVISION = /^\s*(\d{1,3})\s*\/\s*(\d{1,3})\s*(?:÷|\/|divided\s+by)\s*(\d{1,3})\s*\/\s*(\d{1,3})\s*(?:=\s*\?)?\s*$/i;

export function parseFractionDivision(value: string): FractionDivision | null {
  const match = value.match(FRACTION_DIVISION);
  if (!match) return null;

  const [dividendNumerator, dividendDenominator, divisorNumerator, divisorDenominator] = match
    .slice(1)
    .map(Number);

  if (
    ![dividendNumerator, dividendDenominator, divisorNumerator, divisorDenominator].every(
      (part) => Number.isInteger(part) && part > 0,
    )
  ) {
    return null;
  }

  return { dividendNumerator, dividendDenominator, divisorNumerator, divisorDenominator };
}

export function isHeroFractionDivision(value: string) {
  const parsed = parseFractionDivision(value);
  return Boolean(
    parsed &&
      parsed.dividendNumerator === 3 &&
      parsed.dividendDenominator === 4 &&
      parsed.divisorNumerator === 1 &&
      parsed.divisorDenominator === 8,
  );
}

function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b) [a, b] = [b, a % b];
  return a;
}

function finalAnswerToken(equation: string) {
  const parsed = parseFractionDivision(equation);
  if (!parsed) return null;

  const numerator = parsed.dividendNumerator * parsed.divisorDenominator;
  const denominator = parsed.dividendDenominator * parsed.divisorNumerator;
  const divisor = greatestCommonDivisor(numerator, denominator);
  const reducedNumerator = numerator / divisor;
  const reducedDenominator = denominator / divisor;
  return reducedDenominator === 1 ? String(reducedNumerator) : `${reducedNumerator}/${reducedDenominator}`;
}

function includesFinalAnswer(value: string, answer: string) {
  const devanagari = answer.replace(/\d/g, (digit) => "०१२३४५६७८९"[Number(digit)]);
  const escaped = answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedDevanagari = devanagari.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^0-9०-९])(?:${escaped}|${escapedDevanagari})(?=$|[^0-9०-९])`).test(value);
}

function hasExactQuote(source: string, quote: string) {
  return quote.trim().length > 0 && source.includes(quote);
}

export function validateDiagnosticGuardrails(
  output: DiagnosticOutput,
  input: DiagnosticRequestInput,
): { ok: true } | { ok: false; reason: string } {
  if (output.schemaVersion !== DIAGNOSTIC_SCHEMA_VERSION) {
    return { ok: false, reason: "schema_version" };
  }

  if (input.problemText.trim() && output.inputFidelity.canonicalEquation.trim() !== input.problemText.trim()) {
    return { ok: false, reason: "equation_not_preserved" };
  }

  if (
    input.problemText.trim() &&
    output.inputFidelity.preservedTokens.some((token) => !input.problemText.includes(token))
  ) {
    return { ok: false, reason: "token_not_preserved" };
  }

  if (!parseFractionDivision(output.inputFidelity.canonicalEquation)) {
    return { ok: false, reason: "unsupported_math" };
  }

  const answerToken = finalAnswerToken(output.inputFidelity.canonicalEquation);
  if (!answerToken) return { ok: false, reason: "unsupported_math" };
  const modelWords = [
    ...output.hypotheses.flatMap((hypothesis) => [hypothesis.labelHi, hypothesis.evidence.quote]),
    output.probe.questionHi,
    output.probe.distinction,
    ...output.probe.optionLabelsHi,
  ];
  if (modelWords.some((word) => includesFinalAnswer(word, answerToken))) {
    return { ok: false, reason: "direct_answer_leak" };
  }

  if (output.candidateTopicIds.some((topicId) => !SUPPORTED_TOPIC_IDS.has(topicId))) {
    return { ok: false, reason: "unsupported_taxonomy_id" };
  }

  for (const hypothesis of output.hypotheses) {
    if (hypothesis.evidence.source === "problem" && !hasExactQuote(input.problemText, hypothesis.evidence.quote)) {
      return { ok: false, reason: "problem_evidence_not_exact" };
    }
    if (hypothesis.evidence.source === "reasoning" && !hasExactQuote(input.learnerReasoning, hypothesis.evidence.quote)) {
      return { ok: false, reason: "reasoning_evidence_not_exact" };
    }
    if (hypothesis.evidence.source === "visible_work" && !input.imageDataUrl) {
      return { ok: false, reason: "missing_visible_work" };
    }
  }

  return { ok: true };
}

export function artifactForEquation(equation: string) {
  return isHeroFractionDivision(equation) ? "fraction-fit-3-4-div-1-8" : null;
}
