import { isBridgeTermId, type BridgeTermId, type LearnerRegister } from "./hindi-bridge.ts";

export const DIAGNOSTIC_SCHEMA_VERSION = "1.0.0";
export const PROMPT_VERSION = "p3.3";
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
  visibleWorkText?: string;
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
  languageBridge: {
    learnerRegister: LearnerRegister;
    termIds: BridgeTermId[];
  };
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

const PRESERVED_MATH_TOKEN = /[0-9०-९]{1,3}\s*[\/⁄∕]\s*[0-9०-९]{1,3}|[0-9०-९]+(?:\.[0-9०-९]+)?|[÷×*=？?]/gu;

/**
 * Makes typed input fidelity deterministic instead of asking the model to
 * remember its own input. Photo-only notation remains model-transcribed.
 */
export function extractPreservedMathTokens(input: DiagnosticRequestInput) {
  const source = `${input.problemText}\n${input.visibleWorkText ?? ""}`;
  const tokens: string[] = [];
  for (const match of source.matchAll(PRESERVED_MATH_TOKEN)) {
    const token = match[0];
    if (!tokens.includes(token)) tokens.push(token);
    if (tokens.length === 12) break;
  }
  return tokens;
}

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
  if (!isRecord(value) || !hasOnlyKeys(value, ["schemaVersion", "inputFidelity", "candidateTopicIds", "hypotheses", "languageBridge", "probe"])) {
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

  if (!isRecord(value.languageBridge) || !hasOnlyKeys(value.languageBridge, ["learnerRegister", "termIds"])) return false;
  const { learnerRegister, termIds } = value.languageBridge;
  if (
    !["hindi", "hinglish", "english"].includes(String(learnerRegister)) ||
    !Array.isArray(termIds) ||
    termIds.length < 1 ||
    termIds.length > 3 ||
    new Set(termIds).size !== termIds.length ||
    !termIds.every((termId) => typeof termId === "string" && isBridgeTermId(termId))
  ) {
    return false;
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

const FRACTION_DIVISION = /^\s*(\d{1,3})(?:\s*\/\s*(\d{1,3}))?\s*(?:÷|divided\s+by)\s*(\d{1,3})(?:\s*\/\s*(\d{1,3}))?\s*(?:=\s*\?)?\s*$/i;
// A plain slash is accepted only when both operands use compact fraction
// notation and the division slash is surrounded by whitespace. That keeps
// `3/4 / 1/8` useful without guessing at ambiguous chains such as `3/4/1/8`.
const SPACED_FRACTION_SLASH_DIVISION = /^\s*(\d{1,3})\/(\d{1,3})\s+\/\s+(\d{1,3})\/(\d{1,3})\s*(?:=\s*\?)?\s*$/;

export function parseFractionDivision(value: string): FractionDivision | null {
  const match = value.match(FRACTION_DIVISION) ?? value.match(SPACED_FRACTION_SLASH_DIVISION);
  if (!match) return null;

  const dividendNumerator = Number(match[1]);
  const dividendDenominator = match[2] ? Number(match[2]) : 1;
  const divisorNumerator = Number(match[3]);
  const divisorDenominator = match[4] ? Number(match[4]) : 1;

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

const ENGLISH_NUMBER_WORDS: Readonly<Record<number, readonly string[]>> = {
  0: ["zero"],
  1: ["one"],
  2: ["two"],
  3: ["three"],
  4: ["four"],
  5: ["five"],
  6: ["six"],
  7: ["seven"],
  8: ["eight"],
  9: ["nine"],
  10: ["ten"],
  11: ["eleven"],
  12: ["twelve"],
  13: ["thirteen"],
  14: ["fourteen"],
  15: ["fifteen"],
  16: ["sixteen"],
  17: ["seventeen"],
  18: ["eighteen"],
  19: ["nineteen"],
  20: ["twenty"],
};

const HINDI_NUMBER_WORDS: Readonly<Record<number, readonly string[]>> = {
  0: ["शून्य", "ज़ीरो", "जीरो"],
  1: ["एक"],
  2: ["दो"],
  3: ["तीन"],
  4: ["चार"],
  5: ["पाँच", "पांच"],
  6: ["छह", "छः", "छ:"],
  7: ["सात"],
  8: ["आठ"],
  9: ["नौ"],
  10: ["दस"],
  11: ["ग्यारह"],
  12: ["बारह"],
  13: ["तेरह"],
  14: ["चौदह"],
  15: ["पंद्रह", "पन्द्रह"],
  16: ["सोलह"],
  17: ["सत्रह"],
  18: ["अठारह"],
  19: ["उन्नीस"],
  20: ["बीस"],
};

const ENGLISH_FRACTION_WORDS: Readonly<Record<number, readonly string[]>> = {
  2: ["half", "halves"],
  3: ["third", "thirds"],
  4: ["quarter", "quarters", "fourth", "fourths"],
  5: ["fifth", "fifths"],
  6: ["sixth", "sixths"],
  7: ["seventh", "sevenths"],
  8: ["eighth", "eighths"],
  9: ["ninth", "ninths"],
  10: ["tenth", "tenths"],
  11: ["eleventh", "elevenths"],
  12: ["twelfth", "twelfths"],
  13: ["thirteenth", "thirteenths"],
  14: ["fourteenth", "fourteenths"],
  15: ["fifteenth", "fifteenths"],
  16: ["sixteenth", "sixteenths"],
  17: ["seventeenth", "seventeenths"],
  18: ["eighteenth", "eighteenths"],
  19: ["nineteenth", "nineteenths"],
  20: ["twentieth", "twentieths"],
};

const HINDI_FRACTION_WORDS: Readonly<Record<number, readonly string[]>> = {
  2: ["आधा", "आधी", "आधे", "अर्ध"],
  3: ["तिहाई", "तिहाइयाँ", "तिहाइयां"],
  4: ["चौथाई", "चौथाइयाँ", "चौथाइयां"],
};

const HINDI_SPECIAL_FRACTIONS: Readonly<Record<string, readonly string[]>> = {
  "1/2": ["आधा", "आधी", "अर्ध"],
  "1/4": ["चौथाई"],
  "3/4": ["पौन"],
  "3/2": ["डेढ़", "डेढ"],
  "5/2": ["ढाई"],
};

function normalizeAnswerText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\p{Cf}/gu, "")
    .replace(/[०-९]/g, (digit) => String("०१२३४५६७८९".indexOf(digit)))
    .replace(/[⁄∕]/g, "/")
    .toLocaleLowerCase("en");
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function numberForms(value: number) {
  return [
    String(value),
    ...(ENGLISH_NUMBER_WORDS[value] ?? []),
    ...(HINDI_NUMBER_WORDS[value] ?? []),
  ];
}

function alternativesPattern(values: readonly string[]) {
  const alternatives = [...new Set(values.map(normalizeAnswerText))]
    .sort((left, right) => right.length - left.length)
    .map(escapeRegex)
    .join("|");
  return alternatives ? `(?:${alternatives})` : "";
}

function hasUnicodeBoundedPattern(value: string, pattern: string) {
  if (!pattern) return false;
  const tokenCharacters = "\\p{L}\\p{M}\\p{N}_/";
  return new RegExp(`(^|[^${tokenCharacters}])(?:${pattern})(?=$|[^${tokenCharacters}])`, "iu").test(value);
}

/**
 * Detects a final answer in model-authored text without treating a digit inside
 * another number or fraction as that answer. Besides ASCII/Devanagari notation,
 * this covers English and Hindi number words through 20 and common spoken
 * fraction forms such as “five halves”, “पाँच बटे दो”, and “ढाई”.
 */
export function includesFinalAnswerToken(value: string, answer: string) {
  const normalizedValue = normalizeAnswerText(value);
  const normalizedAnswer = normalizeAnswerText(answer).trim();
  const match = normalizedAnswer.match(/^(\d+)(?:\s*\/\s*(\d+))?$/);
  if (!match) return false;

  let numerator = Number(match[1]);
  let denominator = match[2] ? Number(match[2]) : 1;
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator === 0) return false;

  const divisor = greatestCommonDivisor(numerator, denominator);
  numerator /= divisor;
  denominator /= divisor;

  if (denominator === 1) {
    return hasUnicodeBoundedPattern(normalizedValue, alternativesPattern(numberForms(numerator)));
  }

  const numeratorPattern = alternativesPattern(numberForms(numerator));
  const denominatorPattern = alternativesPattern(numberForms(denominator));
  const separator = "[\\s\\p{Pd}]+";
  const patterns = [
    `${escapeRegex(String(numerator))}\\s*\/\\s*${escapeRegex(String(denominator))}`,
    `${numeratorPattern}${separator}(?:over|divided${separator}by|बटे|बटा|भाग)${separator}${denominatorPattern}`,
  ];

  const denominatorWords = [
    ...(ENGLISH_FRACTION_WORDS[denominator] ?? []),
    ...(HINDI_FRACTION_WORDS[denominator] ?? []),
  ];
  if (denominatorWords.length > 0) {
    const denominatorWordPattern = alternativesPattern(denominatorWords);
    patterns.push(`${numeratorPattern}${separator}(?:${denominatorWordPattern})`);
    if (numerator === 1) patterns.push(denominatorWordPattern);
  }

  const reducedKey = `${numerator}/${denominator}`;
  const specialHindiForms = HINDI_SPECIAL_FRACTIONS[reducedKey] ?? [];
  if (specialHindiForms.length > 0) patterns.push(alternativesPattern(specialHindiForms));

  const whole = Math.floor(numerator / denominator);
  const remainder = numerator % denominator;
  if (whole > 0 && remainder > 0) {
    const wholePattern = alternativesPattern(numberForms(whole));
    const remainderPattern = alternativesPattern(numberForms(remainder));
    if (denominatorWords.length > 0) {
      const denominatorWordPattern = alternativesPattern(denominatorWords);
      const englishRemainder = remainder === 1 ? `(?:a|${remainderPattern})` : remainderPattern;
      patterns.push(`${wholePattern}${separator}and${separator}${englishRemainder}${separator}(?:${denominatorWordPattern})`);
      patterns.push(`${wholePattern}${separator}और${separator}(?:${remainderPattern}${separator})?(?:${denominatorWordPattern})`);
    }
    patterns.push(
      `${wholePattern}${separator}(?:and|और)${separator}${remainderPattern}${separator}(?:over|divided${separator}by|बटे|बटा|भाग)${separator}${denominatorPattern}`,
    );
    if (denominator === 2 && remainder === 1) {
      const hindiWholeWords = HINDI_NUMBER_WORDS[whole] ?? [];
      if (hindiWholeWords.length > 0) {
        patterns.push(`साढ़े${separator}(?:${alternativesPattern(hindiWholeWords)})`);
      }
    }
  }

  return patterns.some((pattern) => hasUnicodeBoundedPattern(normalizedValue, pattern));
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

  if (
    output.languageBridge.termIds.length < 1 ||
    output.languageBridge.termIds.length > 3 ||
    new Set(output.languageBridge.termIds).size !== output.languageBridge.termIds.length ||
    output.languageBridge.termIds.some((termId) => !isBridgeTermId(termId))
  ) {
    return { ok: false, reason: "unsupported_bridge_term" };
  }

  if (input.problemText.trim() && output.inputFidelity.canonicalEquation.trim() !== input.problemText.trim()) {
    return { ok: false, reason: "equation_not_preserved" };
  }

  const inspectableInput = `${input.problemText}\n${input.visibleWorkText ?? ""}`;
  if (inspectableInput.trim() && output.inputFidelity.preservedTokens.some((token) => !inspectableInput.includes(token))) {
    return { ok: false, reason: "token_not_preserved" };
  }

  if (!parseFractionDivision(output.inputFidelity.canonicalEquation)) {
    return { ok: false, reason: "unsupported_math" };
  }

  const answerToken = finalAnswerToken(output.inputFidelity.canonicalEquation);
  if (!answerToken) return { ok: false, reason: "unsupported_math" };
  const modelWords = [
    ...output.hypotheses.map((hypothesis) => hypothesis.labelHi),
    output.probe.questionHi,
    output.probe.distinction,
    ...output.probe.optionLabelsHi,
  ];
  if (modelWords.some((word) => includesFinalAnswerToken(word, answerToken))) {
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
    if (hypothesis.evidence.source === "visible_work" && !input.imageDataUrl && !input.visibleWorkText) {
      return { ok: false, reason: "missing_visible_work" };
    }
    if (
      hypothesis.evidence.source === "visible_work" &&
      input.visibleWorkText &&
      !hasExactQuote(input.visibleWorkText, hypothesis.evidence.quote)
    ) {
      return { ok: false, reason: "visible_work_evidence_not_exact" };
    }
  }

  return { ok: true };
}

export function artifactForEquation(equation: string) {
  return isHeroFractionDivision(equation) ? "fraction-fit-3-4-div-1-8" : null;
}
