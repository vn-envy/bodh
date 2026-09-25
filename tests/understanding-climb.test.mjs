import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  divide,
  equals,
  fraction,
  multiply,
  parseFraction,
  simplify,
} from "../lib/fraction-math.ts";
import {
  CHECKABLE_TOPIC_IDS,
  MISCONCEPTIONS,
  checkFor,
  evaluateCheck,
  variantCount,
} from "../lib/understanding-checks.ts";
import {
  CLIMB_TOPIC_COPY,
  ancestorIds,
  createCurriculumGraph,
} from "../lib/understanding-curriculum.ts";
import {
  DAY_MS,
  createUnderstandingLedger,
  dueStatements,
  nextReviewAt,
  parseUnderstandingLedger,
  recordAttempt,
  serializeUnderstandingLedger,
  statementRecord,
  statementState,
  topicEvidence,
} from "../lib/understanding-evidence.ts";
import {
  interleavedReview,
  nextClimbSuggestion,
  topicVisitPlan,
} from "../lib/understanding-path.ts";

const mathsSlice = JSON.parse(await readFile(new URL("../data/taxonomy/fractions-division.slice.json", import.meta.url), "utf8"));
const scienceSlice = JSON.parse(await readFile(new URL("../data/taxonomy/evaporation-water-cycle.slice.json", import.meta.url), "utf8"));
const maths = createCurriculumGraph("mathematics", mathsSlice);
const science = createCurriculumGraph("science", scienceSlice);
const START = Date.UTC(2026, 8, 1, 9);

function allChecks() {
  const checks = [];
  for (const topicId of CHECKABLE_TOPIC_IDS) {
    for (const index of [0, 1, 2]) {
      for (let variant = 0; variant < Math.max(variantCount(topicId, index), 6); variant += 1) {
        checks.push(checkFor(topicId, index, variant));
      }
    }
  }
  return checks;
}

function correctAnswer(check) {
  const response = check.response;
  if (response.kind === "choice") return { kind: "choice", optionId: response.options.find((option) => option.correct).id };
  if (response.kind === "shade") return { kind: "shade", shaded: Array.from({ length: response.target }, (_, index) => index) };
  if (response.kind === "hops") return { kind: "hops", hops: response.target };
  return { kind: "order", tileIds: response.tiles.map((tile) => tile.id) };
}

function firm(ledger, topicId, at = START) {
  for (const evidenceIndex of [0, 1, 2]) {
    ledger = recordAttempt(ledger, { topicId, evidenceIndex, variant: 0, correct: true, confidence: "sure", hinted: false, misconceptionId: null, at });
  }
  return ledger;
}

test("reads both Marble slices as acyclic graphs with foundations below summits", () => {
  assert.equal(maths.order.length, 10);
  assert.equal(science.order.length, 8);
  assert.equal(maths.goalTopicId, "mt_9Y96vxG_LH");
  assert.equal(science.goalTopicId, "mt_Qkewo5M3_c");
  for (const graph of [maths, science]) {
    for (const edge of graph.edges) {
      assert.ok(graph.order.indexOf(edge.from) < graph.order.indexOf(edge.to), `${edge.from} must precede ${edge.to}`);
      assert.ok(graph.tierOf.get(edge.from) < graph.tierOf.get(edge.to));
    }
    assert.deepEqual(graph.tiers.flat().sort(), [...graph.order].sort());
  }
  assert.deepEqual(maths.tiers[0], ["mt_ndGqFPWyen", "mt_iNdrM2-oJf"]);
  assert.equal(maths.tierOf.get("mt_9Y96vxG_LH"), 5);
  assert.equal(science.tiers.at(-1)[0], "mt_Qkewo5M3_c");
  assert.deepEqual(
    [...ancestorIds(maths, "mt_9Y96vxG_LH")].sort(),
    ["mt_09sySPqM9Z", "mt_4Km38F4L-6", "mt_AabJisinfi", "mt_TgHxujL81r", "mt_ifPDOYvUqm", "mt_ndGqFPWyen"],
  );
});

test("gives every Marble evidence statement bilingual child-facing copy and at least one check", () => {
  const sliceTopics = [...mathsSlice.topics, ...scienceSlice.topics];
  assert.deepEqual([...CHECKABLE_TOPIC_IDS].sort(), sliceTopics.map((topic) => topic.id).sort());
  for (const topic of sliceTopics) {
    assert.equal(topic.evidence.length, 3, `${topic.id} keeps three Marble evidence statements`);
    const copy = CLIMB_TOPIC_COPY[topic.id];
    assert.ok(copy.short.hi && copy.short.en);
    assert.equal(copy.evidence.length, 3);
    for (const index of [0, 1, 2]) {
      assert.ok(copy.evidence[index].hi.length > 8 && copy.evidence[index].en.length > 8);
      assert.ok(variantCount(topic.id, index) >= 1);
      assert.ok(checkFor(topic.id, index, 0));
    }
  }
});

test("every generated check is well formed, bilingual, and answerable only by its key", () => {
  const checks = allChecks();
  assert.ok(checks.length >= 250);
  for (const check of checks) {
    assert.ok(check, "check exists");
    for (const text of [check.prompt, check.hint, check.explanation]) {
      assert.ok(text.hi.trim().length > 0 && text.en.trim().length > 0, `${check.id} bilingual copy`);
      assert.doesNotMatch(`${text.hi}${text.en}`, /undefined|NaN|\[object/);
    }
    const response = check.response;
    if (response.kind === "choice") {
      assert.ok(response.options.length >= 3, `${check.id} offers a real choice`);
      assert.equal(response.options.filter((option) => option.correct).length, 1, `${check.id} has one key`);
      assert.equal(new Set(response.options.map((option) => option.label.en)).size, response.options.length, `${check.id} labels are distinct`);
      for (const option of response.options) {
        assert.doesNotMatch(`${option.label.hi}${option.label.en}`, /undefined|NaN/);
        if (option.correct) {
          assert.equal(option.misconceptionId, null);
        } else {
          assert.ok(option.misconceptionId in MISCONCEPTIONS, `${check.id} tags every distractor`);
          assert.ok(option.why?.hi && option.why?.en, `${check.id} explains every distractor`);
        }
      }
    }
    assert.equal(evaluateCheck(check, correctAnswer(check)).correct, true, `${check.id} accepts its key`);
    assert.equal(evaluateCheck(check, { kind: "choice", optionId: "choice-99" }).correct, false);
  }
});

test("check ids are deterministic and retries produce fresh numbers", () => {
  assert.deepEqual(checkFor("mt_9Y96vxG_LH", 1, 2), checkFor("mt_9Y96vxG_LH", 1, 2));
  assert.notDeepEqual(checkFor("mt_1PAWhRhpdg", 1, 0).prompt, checkFor("mt_1PAWhRhpdg", 1, 1).prompt);
  assert.equal(checkFor("mt_unknown", 0, 0), null);
  assert.equal(checkFor("mt_9Y96vxG_LH", 0, -1), null);
});

function numeric(label) {
  return parseFraction(label.replace(/\s+/g, " ").trim());
}

test("maths answer keys agree with an independent rational oracle", () => {
  const read = (check) => check.response.options.find((option) => option.correct).label.en;
  for (let variant = 0; variant < 10; variant += 1) {
    const unitDivisor = checkFor("mt_1PAWhRhpdg", 1, variant);
    const [n, , b] = unitDivisor.visual.text.match(/\d+/g).map(Number);
    assert.ok(equals(numeric(read(unitDivisor)), divide(fraction(n), fraction(1, b))));

    const story = checkFor("mt_9Y96vxG_LH", 2, variant);
    const [a1, b1, c1, d1] = story.visual.text.match(/\d+/g).map(Number);
    assert.ok(equals(numeric(read(story)), divide(fraction(a1, b1), fraction(c1, d1))));

    const share = checkFor("mt_4Km38F4L-6", 1, variant);
    const [n2, m2] = share.visual.text.match(/\d+/g).map(Number);
    assert.ok(equals(numeric(read(share)), fraction(n2, m2)));

    const repeated = checkFor("mt_TgHxujL81r", 0, variant);
    const [n3, a3, b3] = repeated.visual.text.match(/\d+/g).map(Number);
    assert.ok(equals(numeric(read(repeated)), multiply(fraction(n3), fraction(a3, b3))));

    const area = checkFor("mt_AabJisinfi", 0, variant);
    assert.ok(equals(
      numeric(read(area)),
      multiply(fraction(area.visual.rowsShaded, area.visual.rows), fraction(area.visual.colsShaded, area.visual.cols)),
    ));

    const simplest = checkFor("mt_AabJisinfi", 2, variant);
    const [, , , , top, bottom] = simplest.visual.text.match(/\d+/g).map(Number);
    const key = numeric(read(simplest));
    assert.deepEqual(key, simplify(fraction(top, bottom)));
    assert.equal(read(simplest), `${key.n}/${key.d}`);
    for (const option of simplest.response.options.filter((candidate) => !candidate.correct)) {
      assert.notEqual(option.label.en, `${key.n}/${key.d}`, "only the key is written in simplest form");
    }

    const unitSplit = checkFor("mt_ifPDOYvUqm", 0, variant);
    assert.ok(equals(numeric(read(unitSplit)), divide(fraction(1, unitSplit.visual.parts), fraction(unitSplit.visual.split))));
  }
});

test("maths distractors are never secretly equal to the key", () => {
  for (const check of allChecks()) {
    if (check.response.kind !== "choice" || check.topicId === "mt_AabJisinfi" && check.evidenceIndex === 2) continue;
    const key = numeric(check.response.options.find((option) => option.correct).label.en);
    if (!key) continue;
    for (const option of check.response.options.filter((candidate) => !candidate.correct)) {
      const value = numeric(option.label.en);
      if (value) assert.ok(!equals(value, key), `${check.id}: ${option.label.en} equals the key`);
    }
  }
});

test("interactive checks diagnose the classic mistakes they were built to reveal", () => {
  const shade = checkFor("mt_ndGqFPWyen", 2, 1);
  assert.equal(shade.response.kind, "shade");
  const { parts, target } = shade.response;
  const leftover = evaluateCheck(shade, { kind: "shade", shaded: Array.from({ length: parts - target }, (_, index) => index) });
  assert.equal(leftover.correct, false);
  assert.equal(leftover.misconceptionId, "counted-unshaded-parts");
  assert.equal(evaluateCheck(shade, { kind: "shade", shaded: [0, 0, 0, 99] }).correct, target === 1);

  const hops = checkFor("mt_09sySPqM9Z", 1, 0);
  const stoppedAtOne = evaluateCheck(hops, { kind: "hops", hops: hops.response.denominator });
  assert.equal(stoppedAtOne.misconceptionId, "improper-fraction-impossible");

  const order = checkFor("mt_fhqVdj4BYr", 0, 0);
  assert.notDeepEqual(order.response.display, order.response.tiles.map((tile) => tile.id));
  const reversed = evaluateCheck(order, { kind: "order", tileIds: [...order.response.tiles.map((tile) => tile.id)].reverse() });
  assert.equal(reversed.correct, false);
  assert.ok(reversed.why.en.length > 0);
});

test("every misconception repairs in a real slice topic or stays in place", () => {
  const known = new Set([...maths.order, ...science.order]);
  for (const [id, misconception] of Object.entries(MISCONCEPTIONS)) {
    assert.ok(misconception.label.hi && misconception.label.en, `${id} label`);
    if (misconception.rootTopicId) assert.ok(known.has(misconception.rootTopicId), `${id} root`);
  }
});

test("evidence becomes firm only when confident and unaided, and lasting only after a delay", () => {
  let ledger = createUnderstandingLedger();
  const base = { topicId: "mt_ndGqFPWyen", evidenceIndex: 0, variant: 0, hinted: false, misconceptionId: null };
  const state = () => statementState(statementRecord(ledger, "mt_ndGqFPWyen", 0));

  assert.equal(state(), "unseen");
  ledger = recordAttempt(ledger, { ...base, correct: false, confidence: "sure", misconceptionId: "part-to-part", at: START });
  assert.equal(state(), "emerging");
  ledger = recordAttempt(ledger, { ...base, variant: 1, correct: true, confidence: "guess", at: START + 1 });
  assert.equal(state(), "fragile");
  ledger = recordAttempt(ledger, { ...base, variant: 2, correct: true, confidence: "sure", hinted: true, at: START + 2 });
  assert.equal(state(), "fragile", "a hinted answer is supported, not firm");
  ledger = recordAttempt(ledger, { ...base, variant: 3, correct: true, confidence: "think", at: START + 3 });
  assert.equal(state(), "firm");
  assert.equal(statementRecord(ledger, "mt_ndGqFPWyen", 0).dueAt, START + 3 + DAY_MS);

  ledger = recordAttempt(ledger, { ...base, variant: 4, correct: true, confidence: "sure", at: START + 60_000 });
  assert.equal(state(), "firm", "cramming the same day does not prove retention");
  assert.equal(statementRecord(ledger, "mt_ndGqFPWyen", 0).box, 1);

  const later = START + 2 * DAY_MS;
  assert.equal(dueStatements(ledger, later).length, 1);
  ledger = recordAttempt(ledger, { ...base, variant: 5, correct: true, confidence: "sure", at: later });
  assert.equal(state(), "lasting");
  assert.equal(statementRecord(ledger, "mt_ndGqFPWyen", 0).box, 2);
  assert.equal(nextReviewAt(ledger, later), later + 3 * DAY_MS);
  assert.equal(statementRecord(ledger, "mt_ndGqFPWyen", 0).nextVariant, 6);

  ledger = recordAttempt(ledger, { ...base, variant: 6, correct: false, confidence: "sure", misconceptionId: "counted-unshaded-parts", at: later + 1 });
  assert.equal(state(), "emerging");
  assert.equal(statementRecord(ledger, "mt_ndGqFPWyen", 0).box, 0);
  assert.equal(statementRecord(ledger, "mt_ndGqFPWyen", 0).attempts.length, 7);
});

test("the ledger stores bounded identifiers only and rejects forged shapes", () => {
  let ledger = firm(createUnderstandingLedger(), "mt_TlLE4cZgOr");
  const raw = serializeUnderstandingLedger(ledger);
  assert.deepEqual(parseUnderstandingLedger(raw), ledger);
  assert.doesNotMatch(raw, /[ऀ-ॿ]|puddle|answer|reasoning/i);

  const unchanged = recordAttempt(ledger, { topicId: "mt_fake", evidenceIndex: 0, variant: 0, correct: true, confidence: "sure", hinted: false, misconceptionId: null, at: START });
  assert.equal(unchanged, ledger);
  assert.equal(recordAttempt(ledger, { topicId: "mt_TlLE4cZgOr", evidenceIndex: 3, variant: 0, correct: true, confidence: "sure", hinted: false, misconceptionId: null, at: START }), ledger);
  assert.equal(recordAttempt(ledger, { topicId: "mt_TlLE4cZgOr", evidenceIndex: 0, variant: 0, correct: false, confidence: "maybe", hinted: false, misconceptionId: null, at: START }), ledger);

  const parsed = JSON.parse(raw);
  parsed.statements["mt_TlLE4cZgOr#0"].attempts[0].note = "child text";
  parsed.statements["mt_evil#0"] = parsed.statements["mt_TlLE4cZgOr#1"];
  parsed.statements["mt_TlLE4cZgOr#2"].box = 9;
  const cleaned = parseUnderstandingLedger(JSON.stringify(parsed));
  assert.deepEqual(Object.keys(cleaned.statements), ["mt_TlLE4cZgOr#1"]);

  assert.deepEqual(parseUnderstandingLedger(JSON.stringify({ ...parsed, version: "v0" })).statements, {});
  assert.deepEqual(parseUnderstandingLedger("not json").statements, {});
  assert.deepEqual(parseUnderstandingLedger(null).statements, {});
});

test("with no evidence Bodh starts at the foundation beneath the Marble goal", () => {
  const empty = createUnderstandingLedger();
  assert.deepEqual(nextClimbSuggestion(maths, empty, START), { kind: "climb", topicId: "mt_ndGqFPWyen", because: [] });
  assert.equal(nextClimbSuggestion(science, empty, START).kind, "climb");
  assert.equal(nextClimbSuggestion(science, empty, START).topicId, "mt_TlLE4cZgOr");
  assert.deepEqual(topicVisitPlan(empty, "mt_ndGqFPWyen", START), [0, 1, 2]);
});

test("firm prerequisites unlock the next canonical foothold and name the edge", () => {
  const ledger = firm(createUnderstandingLedger(), "mt_ndGqFPWyen");
  const suggestion = nextClimbSuggestion(maths, ledger, START + 1);
  assert.equal(suggestion.kind, "climb");
  assert.equal(suggestion.topicId, "mt_09sySPqM9Z");
  assert.equal(suggestion.because[0].from, "mt_ndGqFPWyen");
  assert.match(suggestion.because[0].reason, /prerequisite/);
});

test("a confident misconception descends to the Marble topic where it is repaired", () => {
  let ledger = createUnderstandingLedger();
  ledger = recordAttempt(ledger, {
    topicId: "mt_9Y96vxG_LH", evidenceIndex: 1, variant: 0, correct: false, confidence: "sure", hinted: false,
    misconceptionId: "numerator-denominator-confused", at: START,
  });
  const suggestion = nextClimbSuggestion(maths, ledger, START + 1, "mt_9Y96vxG_LH");
  assert.equal(suggestion.kind, "repair");
  assert.equal(suggestion.topicId, "mt_ndGqFPWyen");
  assert.equal(suggestion.fromTopicId, "mt_9Y96vxG_LH");
  assert.equal(suggestion.confident, true);
  assert.equal(suggestion.path[0].from, "mt_ndGqFPWyen");
  assert.equal(suggestion.path.at(-1).to, "mt_9Y96vxG_LH");

  const support = recordAttempt(createUnderstandingLedger(), {
    topicId: "mt_1PAWhRhpdg", evidenceIndex: 1, variant: 0, correct: false, confidence: "think", hinted: false,
    misconceptionId: "division-always-makes-smaller", at: START,
  });
  const sideways = nextClimbSuggestion(maths, support, START + 1);
  assert.equal(sideways.kind, "repair");
  assert.equal(sideways.topicId, "mt_iNdrM2-oJf");
  assert.deepEqual(sideways.path, [], "a diagnostic-support topic is not presented as a canonical edge");

  const guessed = recordAttempt(createUnderstandingLedger(), {
    topicId: "mt_9Y96vxG_LH", evidenceIndex: 1, variant: 0, correct: false, confidence: "guess", hinted: false,
    misconceptionId: "numerator-denominator-confused", at: START,
  });
  assert.notEqual(nextClimbSuggestion(maths, guessed, START + 1, "mt_9Y96vxG_LH").kind, "repair", "a guess is not treated as a belief");
});

test("a miss without a repair root steps down one hard prerequisite from the focus", () => {
  const ledger = recordAttempt(createUnderstandingLedger(), {
    topicId: "mt_9Y96vxG_LH", evidenceIndex: 0, variant: 0, correct: false, confidence: "guess", hinted: false,
    misconceptionId: null, at: START,
  });
  const suggestion = nextClimbSuggestion(maths, ledger, START + 1, "mt_9Y96vxG_LH");
  assert.equal(suggestion.kind, "step-down");
  assert.equal(suggestion.fromTopicId, "mt_9Y96vxG_LH");
  assert.equal(suggestion.edge.to, "mt_9Y96vxG_LH");
  assert.equal(suggestion.edge.strength, "hard");
  assert.deepEqual(nextClimbSuggestion(maths, createUnderstandingLedger(), START, "mt_9Y96vxG_LH"), { kind: "continue", topicId: "mt_9Y96vxG_LH" });
});

test("due reviews come back interleaved across topics before new climbing", () => {
  let ledger = createUnderstandingLedger();
  for (const topicId of ["mt_ndGqFPWyen", "mt_09sySPqM9Z", "mt_TgHxujL81r"]) ledger = firm(ledger, topicId);
  const tomorrow = START + DAY_MS + 1;
  const suggestion = nextClimbSuggestion(maths, ledger, tomorrow);
  assert.equal(suggestion.kind, "review");
  assert.equal(suggestion.items.length, 4);
  assert.notEqual(suggestion.items[0].topicId, suggestion.items[1].topicId);
  assert.deepEqual(interleavedReview(science, ledger, tomorrow), []);
  assert.equal(topicEvidence(ledger, "mt_ndGqFPWyen", tomorrow).dueIndices.length, 3);
  assert.deepEqual(topicVisitPlan(ledger, "mt_ndGqFPWyen", tomorrow), [0, 1, 2]);
});

test("once every topic is firm the summit is reached", () => {
  let ledger = createUnderstandingLedger();
  for (const topicId of science.order) ledger = firm(ledger, topicId);
  assert.deepEqual(nextClimbSuggestion(science, ledger, START + 1), { kind: "summit", topicId: "mt_Qkewo5M3_c" });
});
