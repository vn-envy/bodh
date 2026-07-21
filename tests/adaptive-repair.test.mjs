import assert from "node:assert/strict";
import test from "node:test";
import {
  ADAPTIVE_PROBE_CATALOG,
  EVIDENCE_MEANING_CHOICE_ID,
  MEANING_CHOICES,
  adaptiveReceiptSupport,
  canIssueAdaptiveReceipt,
  createAdaptiveEvidenceState,
  entryAtomIdForOption,
  parseAdaptiveSessionPayload,
  reduceAdaptiveEvidence,
  REPAIR_ENTRY_ATOM_IDS,
  requiredRepairAtomIds,
  selectAdaptiveProbe,
  serializeAdaptiveSessionPayload,
  sessionPayloadForSelection,
} from "../lib/adaptive-repair.ts";

function reduce(state, ...events) {
  return events.reduce(reduceAdaptiveEvidence, state);
}

function startAndCompleteRoute(state, entryAtomId) {
  return reduce(
    state,
    { type: "journey-started", entryAtomId },
    ...requiredRepairAtomIds(entryAtomId).map((atomId) => ({ type: "atom-completed", atomId })),
    { type: "lab-completed" },
  );
}

test("keeps three bilingual allowlisted maths probes and all seven authored repair stages", () => {
  assert.deepEqual(REPAIR_ENTRY_ATOM_IDS, [
    "chosen-whole",
    "equal-parts",
    "unit-and-denominator",
    "numerator-count",
    "equivalent-repartition",
    "repeated-composition",
    "division-unknown-factor",
  ]);
  assert.equal(ADAPTIVE_PROBE_CATALOG.length, 3);
  const optionIds = ADAPTIVE_PROBE_CATALOG.flatMap((probe) => {
    assert.ok(probe.question.hi.length > 0);
    assert.ok(probe.question.en.length > 0);
    return probe.options.map((option) => {
      assert.ok(option.label.hi.length > 0);
      assert.ok(option.label.en.length > 0);
      assert.ok(REPAIR_ENTRY_ATOM_IDS.includes(option.entryAtomId));
      return option.id;
    });
  });
  assert.equal(new Set(optionIds).size, optionIds.length);

  assert.equal(entryAtomIdForOption("whole-entire-strip"), "equal-parts");
  assert.equal(entryAtomIdForOption("whole-one-piece"), "chosen-whole");
  assert.equal(entryAtomIdForOption("unit-eighth-smaller"), "numerator-count");
  assert.equal(entryAtomIdForOption("unit-quarter-smaller"), "unit-and-denominator");
  assert.equal(entryAtomIdForOption("amount-stays-same"), "repeated-composition");
  assert.equal(entryAtomIdForOption("amount-grows"), "equivalent-repartition");
  assert.equal(entryAtomIdForOption("amount-shrinks"), "equivalent-repartition");
  assert.equal(entryAtomIdForOption("invented-option"), null);
  assert.equal(MEANING_CHOICES.length, 3);
  assert.equal(EVIDENCE_MEANING_CHOICE_ID, "meaning-groups-fit");
});

test("selects a probe deterministically from hypothesis IDs", () => {
  const first = selectAdaptiveProbe([
    "unknown-factor-not-connected",
    "fraction-as-two-whole-numbers",
  ]);
  const reordered = selectAdaptiveProbe([
    "fraction-as-two-whole-numbers",
    "unknown-factor-not-connected",
  ]);
  assert.equal(first.id, "probe-whole-identity");
  assert.equal(reordered.id, first.id);
  assert.equal(selectAdaptiveProbe(["unit-fraction-size-confusion"]).id, "probe-unit-size");
  assert.equal(selectAdaptiveProbe(["reciprocal-rule-without-meaning"]).id, "probe-same-amount");
  assert.equal(selectAdaptiveProbe(["invented-hypothesis"]).id, "probe-whole-identity");
});

test("round-trips only allowlisted session IDs", () => {
  const payload = sessionPayloadForSelection("probe-whole-identity", "whole-one-piece");
  assert.deepEqual(payload, {
    version: "adaptive-repair-v1",
    probeId: "probe-whole-identity",
    optionId: "whole-one-piece",
    entryAtomId: "chosen-whole",
  });
  const serialised = serializeAdaptiveSessionPayload(payload);
  assert.equal(typeof serialised, "string");
  assert.deepEqual(parseAdaptiveSessionPayload(serialised), payload);
  assert.doesNotMatch(serialised, /चित्र|picture|learner|hypothesis/i);

  assert.equal(sessionPayloadForSelection("probe-unit-size", "whole-one-piece"), null);
  assert.equal(parseAdaptiveSessionPayload("not-json"), null);
  assert.equal(parseAdaptiveSessionPayload(JSON.stringify({ ...payload, learnerText: "private" })), null);
  assert.equal(parseAdaptiveSessionPayload(JSON.stringify({ ...payload, entryAtomId: "equal-parts" })), null);
  assert.equal(serializeAdaptiveSessionPayload({ ...payload, label: "unreviewed" }), null);
});

test("records the actual journey entry before accepting ordered stage evidence", () => {
  const initial = createAdaptiveEvidenceState();
  const probed = reduceAdaptiveEvidence(initial, {
    type: "probe-answered",
    probeId: "probe-whole-identity",
    optionId: "whole-one-piece",
  });
  assert.equal(initial.session, null);
  assert.equal(probed.session.entryAtomId, "chosen-whole");
  assert.equal(probed.journeyEntryAtomId, null);
  assert.deepEqual(requiredRepairAtomIds(probed.session.entryAtomId), REPAIR_ENTRY_ATOM_IDS);

  const beforeStart = reduceAdaptiveEvidence(probed, {
    type: "atom-completed",
    atomId: "chosen-whole",
  });
  assert.equal(beforeStart, probed);

  const started = reduceAdaptiveEvidence(probed, {
    type: "journey-started",
    entryAtomId: "chosen-whole",
  });
  const outOfOrder = reduceAdaptiveEvidence(started, {
    type: "atom-completed",
    atomId: "equivalent-repartition",
  });
  assert.equal(outOfOrder, started);

  let state = startAndCompleteRoute(probed, "chosen-whole");
  assert.equal(state.labComplete, true);
  assert.equal(state.completedAtomIds.length, 7);
  assert.equal(reduceAdaptiveEvidence(state, { type: "transfer-hint-shown" }), state);

  state = reduce(
    state,
    { type: "transfer-attempted", correct: false },
    { type: "transfer-hint-shown" },
    { type: "transfer-attempted", correct: true },
    { type: "meaning-chosen", choiceId: "meaning-rule-only" },
  );
  assert.equal(canIssueAdaptiveReceipt(state), false);
  state = reduce(
    state,
    { type: "meaning-chosen", choiceId: "meaning-groups-fit" },
    { type: "return-attempted", correct: false },
    { type: "return-attempted", correct: true },
  );
  assert.equal(canIssueAdaptiveReceipt(state), true);
  assert.equal(adaptiveReceiptSupport(state), "supported");
  assert.deepEqual(state.supportHistory, ["transfer-hint"]);
  assert.equal(state.transfer.attempts, 2);
  assert.equal(state.returnCheck.attempts, 2);
});

test("classifies a correct unhinted transfer as independent evidence", () => {
  const session = sessionPayloadForSelection("probe-whole-identity", "whole-entire-strip");
  let state = createAdaptiveEvidenceState(session);
  assert.deepEqual(requiredRepairAtomIds(session.entryAtomId), [
    "equal-parts",
    "unit-and-denominator",
    "numerator-count",
    "equivalent-repartition",
    "repeated-composition",
    "division-unknown-factor",
  ]);
  state = startAndCompleteRoute(state, session.entryAtomId);
  state = reduce(
    state,
    { type: "transfer-attempted", correct: true },
    { type: "meaning-chosen", choiceId: "meaning-groups-fit" },
    { type: "return-attempted", correct: true },
  );
  assert.equal(canIssueAdaptiveReceipt(state), true);
  assert.equal(adaptiveReceiptSupport(state), "independent");
  assert.deepEqual(state.supportHistory, []);
  assert.equal(reduceAdaptiveEvidence(state, { type: "transfer-hint-shown" }), state);
});

test("Review everything retains all seven checkpoints instead of the recommended suffix", () => {
  const session = sessionPayloadForSelection("probe-same-amount", "amount-stays-same");
  assert.equal(session.entryAtomId, "repeated-composition");
  let state = startAndCompleteRoute(createAdaptiveEvidenceState(session), "chosen-whole");
  assert.equal(state.journeyEntryAtomId, "chosen-whole");
  assert.deepEqual(state.completedAtomIds, REPAIR_ENTRY_ATOM_IDS);
  state = reduce(
    state,
    { type: "transfer-attempted", correct: true },
    { type: "meaning-chosen", choiceId: "meaning-groups-fit" },
    { type: "return-attempted", correct: true },
  );
  assert.equal(canIssueAdaptiveReceipt(state), true);
  assert.equal(adaptiveReceiptSupport(state), "independent");
});

test("a conceptual repair permanently makes the receipt supported", () => {
  const session = sessionPayloadForSelection("probe-same-amount", "amount-stays-same");
  let state = startAndCompleteRoute(createAdaptiveEvidenceState(session), session.entryAtomId);
  state = reduce(
    state,
    { type: "transfer-attempted", correct: true },
    { type: "meaning-chosen", choiceId: "meaning-rule-only" },
    { type: "conceptual-repair-started", atomId: "equivalent-repartition" },
    { type: "meaning-chosen", choiceId: "meaning-groups-fit" },
    { type: "return-attempted", correct: true },
  );
  assert.equal(state.transfer.correctBeforeHint, true);
  assert.deepEqual(state.repairHistory, ["equivalent-repartition"]);
  assert.deepEqual(state.supportHistory, ["conceptual-repair"]);
  assert.equal(canIssueAdaptiveReceipt(state), true);
  assert.equal(adaptiveReceiptSupport(state), "supported");
  assert.equal(
    reduceAdaptiveEvidence(state, { type: "journey-started", entryAtomId: "chosen-whole" }),
    state,
  );
});

test("keeps an unhinted self-correction independent when no conceptual repair occurred", () => {
  const session = sessionPayloadForSelection("probe-same-amount", "amount-grows");
  let state = startAndCompleteRoute(createAdaptiveEvidenceState(session), session.entryAtomId);
  state = reduce(
    state,
    { type: "transfer-attempted", correct: false },
    { type: "transfer-attempted", correct: true },
    { type: "meaning-chosen", choiceId: "meaning-groups-fit" },
    { type: "return-attempted", correct: true },
  );
  assert.equal(canIssueAdaptiveReceipt(state), true);
  assert.equal(adaptiveReceiptSupport(state), "independent");
  assert.deepEqual(state.supportHistory, []);
});
