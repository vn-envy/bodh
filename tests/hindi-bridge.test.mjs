import assert from "node:assert/strict";
import test from "node:test";
import { inferLearnerRegister, resolveBridgeTerms } from "../lib/hindi-bridge.ts";

test("Bodh keeps the same bilingual teaching terms across learner registers", () => {
  const terms = resolveBridgeTerms(["unit-fraction", "equal-groups"]);
  assert.deepEqual(
    terms.map((term) => [term.hindi, term.english]),
    [["इकाई भिन्न", "unit fraction"], ["बराबर समूह", "equal groups"]],
  );
  assert.equal(inferLearnerRegister("मुझे समझ नहीं आता"), "hindi");
  assert.equal(inferLearnerRegister("Mujhe fraction ka meaning nahi samajh aata"), "english");
  assert.equal(inferLearnerRegister("मुझे unit fraction समझ नहीं आता"), "hinglish");
});
