import { CHECKABLE_TOPIC_IDS, isMisconceptionId, type MisconceptionId } from "./understanding-checks.ts";
import type { EvidenceIndex } from "./understanding-curriculum";

/**
 * A device-local evidence ledger for the Understanding Climb.
 *
 * It stores only bounded identifiers, booleans, and timestamps: which Marble
 * evidence statement was checked, whether the answer held, how sure the learner
 * felt, and whether a hint was used. No learner text, answer content, or model
 * output is ever written, and nothing here is sent to the server.
 */

export const UNDERSTANDING_LEDGER_VERSION = "understanding-ledger-v1" as const;
export const UNDERSTANDING_STORAGE_KEY = "bodh:understanding-ledger:v1" as const;

export const CONFIDENCE_LEVELS = ["sure", "think", "guess"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export const DAY_MS = 86_400_000;
/** Spaced-retrieval gaps (days) after each successful delayed check. */
export const REVIEW_INTERVAL_DAYS = [0, 1, 3, 7, 21] as const;
export const MAX_BOX = REVIEW_INTERVAL_DAYS.length - 1;
export const MAX_ATTEMPTS_KEPT = 8;

export type EvidenceAttempt = Readonly<{
  at: number;
  variant: number;
  correct: boolean;
  confidence: Confidence;
  hinted: boolean;
  misconceptionId: MisconceptionId | null;
}>;

export type StatementRecord = Readonly<{
  attempts: readonly EvidenceAttempt[];
  /** Leitner box: 0 = not yet firm, 1 = firm today, 2+ = survived a delayed check. */
  box: number;
  /** When the next spaced check is due; null until the statement is first firm. */
  dueAt: number | null;
  nextVariant: number;
}>;

export type UnderstandingLedger = Readonly<{
  version: typeof UNDERSTANDING_LEDGER_VERSION;
  statements: Readonly<Record<string, StatementRecord>>;
}>;

export type StatementState = "unseen" | "emerging" | "fragile" | "firm" | "lasting";

export function statementKey(topicId: string, evidenceIndex: EvidenceIndex) {
  return `${topicId}#${evidenceIndex}`;
}

const CHECKABLE = new Set(CHECKABLE_TOPIC_IDS);

function parseStatementKey(key: string): Readonly<{ topicId: string; evidenceIndex: EvidenceIndex }> | null {
  const match = /^(.+)#([012])$/.exec(key);
  if (!match || !CHECKABLE.has(match[1])) return null;
  return { topicId: match[1], evidenceIndex: Number(match[2]) as EvidenceIndex };
}

export function createUnderstandingLedger(): UnderstandingLedger {
  return { version: UNDERSTANDING_LEDGER_VERSION, statements: {} };
}

function isConfidence(value: unknown): value is Confidence {
  return CONFIDENCE_LEVELS.some((level) => level === value);
}

function isTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isVariant(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value < 10_000;
}

/** A confident, unaided correct answer: the only kind that makes evidence firm. */
export function isFirmAttempt(attempt: EvidenceAttempt) {
  return attempt.correct && attempt.confidence !== "guess" && !attempt.hinted;
}

export type AttemptInput = Readonly<{
  topicId: string;
  evidenceIndex: EvidenceIndex;
  variant: number;
  correct: boolean;
  confidence: Confidence;
  hinted: boolean;
  misconceptionId: MisconceptionId | null;
  at: number;
}>;

export function recordAttempt(ledger: UnderstandingLedger, input: AttemptInput): UnderstandingLedger {
  if (!CHECKABLE.has(input.topicId) || ![0, 1, 2].includes(input.evidenceIndex)) return ledger;
  if (!isVariant(input.variant) || !isTimestamp(input.at) || !isConfidence(input.confidence)) return ledger;
  if (typeof input.correct !== "boolean" || typeof input.hinted !== "boolean") return ledger;
  if (input.misconceptionId !== null && !isMisconceptionId(input.misconceptionId)) return ledger;

  const key = statementKey(input.topicId, input.evidenceIndex);
  const previous = ledger.statements[key];
  const attempt: EvidenceAttempt = {
    at: input.at,
    variant: input.variant,
    correct: input.correct,
    confidence: input.confidence,
    hinted: input.hinted,
    misconceptionId: input.correct ? null : input.misconceptionId,
  };

  let box = previous?.box ?? 0;
  let dueAt = previous?.dueAt ?? null;
  if (!attempt.correct) {
    box = 0;
    dueAt = null;
  } else if (isFirmAttempt(attempt)) {
    if (box === 0) {
      box = 1;
    } else if (dueAt !== null && input.at >= dueAt) {
      // Only a check taken after the gap counts as retention; cramming early does not.
      box = Math.min(box + 1, MAX_BOX);
    }
    dueAt = input.at + REVIEW_INTERVAL_DAYS[box] * DAY_MS;
  }
  // A correct guess or a hinted answer keeps the box but earns no promotion.

  const attempts = [...(previous?.attempts ?? []), attempt].slice(-MAX_ATTEMPTS_KEPT);
  return {
    version: UNDERSTANDING_LEDGER_VERSION,
    statements: {
      ...ledger.statements,
      [key]: { attempts, box, dueAt, nextVariant: Math.max(previous?.nextVariant ?? 0, input.variant + 1) },
    },
  };
}

export function statementRecord(ledger: UnderstandingLedger, topicId: string, evidenceIndex: EvidenceIndex) {
  return ledger.statements[statementKey(topicId, evidenceIndex)] ?? null;
}

export function statementState(record: StatementRecord | null): StatementState {
  const last = record?.attempts.at(-1);
  if (!record || !last) return "unseen";
  if (!last.correct) return "emerging";
  if (!isFirmAttempt(last)) return "fragile";
  return record.box >= 2 ? "lasting" : "firm";
}

export function isStatementDue(record: StatementRecord | null, now: number) {
  return Boolean(record && record.box >= 1 && record.dueAt !== null && record.dueAt <= now);
}

export type TopicLevel = "unseen" | "started" | "firm" | "lasting";

export type TopicEvidence = Readonly<{
  topicId: string;
  states: readonly [StatementState, StatementState, StatementState];
  level: TopicLevel;
  dueIndices: readonly EvidenceIndex[];
  /** Latest unresolved misses, newest first, with how sure the learner felt. */
  misses: readonly Readonly<{ evidenceIndex: EvidenceIndex; misconceptionId: MisconceptionId | null; confidence: Confidence; at: number }>[];
}>;

export function topicEvidence(ledger: UnderstandingLedger, topicId: string, now: number): TopicEvidence {
  const records = ([0, 1, 2] as const).map((index) => statementRecord(ledger, topicId, index));
  const states = records.map(statementState) as [StatementState, StatementState, StatementState];
  const level: TopicLevel = states.every((state) => state === "lasting")
    ? "lasting"
    : states.every((state) => state === "firm" || state === "lasting")
      ? "firm"
      : states.some((state) => state !== "unseen")
        ? "started"
        : "unseen";
  const dueIndices = ([0, 1, 2] as const).filter((index) => isStatementDue(records[index], now));
  const misses = ([0, 1, 2] as const)
    .flatMap((index) => {
      const last = records[index]?.attempts.at(-1);
      return last && !last.correct
        ? [{ evidenceIndex: index, misconceptionId: last.misconceptionId, confidence: last.confidence, at: last.at }]
        : [];
    })
    .sort((left, right) => right.at - left.at);
  return { topicId, states, level, dueIndices, misses };
}

export function isTopicFirm(ledger: UnderstandingLedger, topicId: string, now: number) {
  const level = topicEvidence(ledger, topicId, now).level;
  return level === "firm" || level === "lasting";
}

export function nextVariantFor(ledger: UnderstandingLedger, topicId: string, evidenceIndex: EvidenceIndex) {
  return statementRecord(ledger, topicId, evidenceIndex)?.nextVariant ?? 0;
}

/** Every statement whose spaced check is due, oldest due first. */
export function dueStatements(ledger: UnderstandingLedger, now: number, topicIds?: ReadonlySet<string>) {
  return Object.entries(ledger.statements)
    .flatMap(([key, record]) => {
      const parsed = parseStatementKey(key);
      if (!parsed || (topicIds && !topicIds.has(parsed.topicId)) || !isStatementDue(record, now)) return [];
      return [{ ...parsed, dueAt: record.dueAt! }];
    })
    .sort((left, right) => left.dueAt - right.dueAt || left.topicId.localeCompare(right.topicId) || left.evidenceIndex - right.evidenceIndex);
}

/** The earliest future review, so the interface can say when Bodh will check again. */
export function nextReviewAt(ledger: UnderstandingLedger, now: number, topicIds?: ReadonlySet<string>) {
  let earliest: number | null = null;
  for (const [key, record] of Object.entries(ledger.statements)) {
    const parsed = parseStatementKey(key);
    if (!parsed || (topicIds && !topicIds.has(parsed.topicId))) continue;
    if (record.box >= 1 && record.dueAt !== null && record.dueAt > now && (earliest === null || record.dueAt < earliest)) {
      earliest = record.dueAt;
    }
  }
  return earliest;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).sort().join("|") === [...keys].sort().join("|");
}

function normaliseAttempt(value: unknown): EvidenceAttempt | null {
  if (!isRecord(value) || !hasExactKeys(value, ["at", "confidence", "correct", "hinted", "misconceptionId", "variant"])) return null;
  if (!isTimestamp(value.at) || !isVariant(value.variant) || !isConfidence(value.confidence)) return null;
  if (typeof value.correct !== "boolean" || typeof value.hinted !== "boolean") return null;
  if (value.misconceptionId !== null && !isMisconceptionId(value.misconceptionId)) return null;
  if (value.correct && value.misconceptionId !== null) return null;
  return {
    at: value.at,
    variant: value.variant,
    correct: value.correct,
    confidence: value.confidence,
    hinted: value.hinted,
    misconceptionId: value.misconceptionId as MisconceptionId | null,
  };
}

function normaliseStatement(value: unknown): StatementRecord | null {
  if (!isRecord(value) || !hasExactKeys(value, ["attempts", "box", "dueAt", "nextVariant"])) return null;
  if (!Array.isArray(value.attempts) || value.attempts.length === 0 || value.attempts.length > MAX_ATTEMPTS_KEPT) return null;
  if (typeof value.box !== "number" || !Number.isInteger(value.box) || value.box < 0 || value.box > MAX_BOX) return null;
  if (value.dueAt !== null && !isTimestamp(value.dueAt)) return null;
  if ((value.box === 0) !== (value.dueAt === null)) return null;
  if (!isVariant(value.nextVariant)) return null;
  const attempts = value.attempts.map(normaliseAttempt);
  if (attempts.some((attempt) => attempt === null)) return null;
  return {
    attempts: attempts as EvidenceAttempt[],
    box: value.box,
    dueAt: value.dueAt as number | null,
    nextVariant: value.nextVariant,
  };
}

/** Rejects unknown versions or shapes; drops individual statements that fail validation. */
export function parseUnderstandingLedger(raw: unknown): UnderstandingLedger {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 64_000) return createUnderstandingLedger();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return createUnderstandingLedger();
  }
  if (!isRecord(value) || !hasExactKeys(value, ["statements", "version"]) || value.version !== UNDERSTANDING_LEDGER_VERSION) {
    return createUnderstandingLedger();
  }
  if (!isRecord(value.statements)) return createUnderstandingLedger();
  const statements: Record<string, StatementRecord> = {};
  for (const [key, record] of Object.entries(value.statements)) {
    if (!parseStatementKey(key)) continue;
    const normalised = normaliseStatement(record);
    if (normalised) statements[key] = normalised;
  }
  return { version: UNDERSTANDING_LEDGER_VERSION, statements };
}

export function serializeUnderstandingLedger(ledger: UnderstandingLedger) {
  return JSON.stringify(parseUnderstandingLedger(JSON.stringify(ledger)));
}
