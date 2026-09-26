# Decision log

## D-001 — One hero journey

**Decision:** Build only a fractions journey for ages 8–12, anchored on `3/4 ÷ 1/8 = ?`.

**Why:** A narrow journey can show diagnosis, reteaching, transfer, and return in under three minutes while leaving protected time for evaluation.

## D-002 — Diagnose before teaching

**Decision:** Bodh must ask a short, discriminating probe before revealing a procedure or solution.

**Why:** The product promise is durable understanding, not answer delivery. The probe separates plausible misconceptions and prevents generic reteaching.

## D-003 — Deterministic mathematical core

**Decision:** Models may select or populate schema-valid artifacts, but executable UI and mathematical success predicates are shipped code.

**Why:** Generated interface code and unverified arithmetic create avoidable correctness and demo risk.

## D-004 — Hindi-first, notation-stable

**Decision:** Conversational Hindi leads; the English textbook term appears alongside it. Mathematical notation is preserved exactly.

**Why:** Language access must not create a second conceptual mismatch.

## D-005 — Bounded curriculum graph

**Decision:** Commit only the canonical Marble topics needed for fraction division and its diagnostic foundations.

**Why:** A small inspectable graph is easier to attribute, validate, evaluate, and explain to judges than an unbounded retrieval surface.

## D-006 — Friendly mentor, never evaluator

**Decision:** Bodh the elephant listens, traces a path, demonstrates once, and waits. It never looks disappointed or labels a child as weak.

**Why:** Misconceptions are evidence about the next useful representation, not a deficit in the learner.

## D-007 — Matte, strong colour system

**Decision:** Use cream, Bodh blue-grey, pink, peach, and olive. Avoid dark developer-tool surfaces and decorative colour noise.

**Why:** This is a child-facing learning product. Colour must provide warmth and semantic orientation while maintaining visibility.

## D-008 — Delight is optional

**Decision:** Motion and sound are specified but excluded until the correctness and evaluation gates pass.

**Why:** Delight may enhance the demo, but it cannot consume the reliability reserve.

## D-009 — Constrained diagnostic output and private trace

**Decision:** Phase 2 uses the Responses API only for strict JSON diagnosis: a notation readback, up to three canonical Marble topic IDs, evidence-backed tentative hypotheses, and one Hindi probe. The worker validates schema, typed equation/tokens, evidence quotes, curriculum IDs, and bounded fraction notation before returning anything. Durable traces keep only a SHA-256 input fingerprint and operational metadata, never raw child text, photos, quotes, or the model response.

**Why:** Bodh must be inspectable without turning a learner's homework trail into analytics. A model can help choose the next question, but deterministic code controls what reaches the interface and whether the curated fraction artifact is available.

## D-010 — Deterministic bilingual vocabulary

**Decision:** The model selects only one to three approved vocabulary IDs. Bodh renders the Hindi term, English curriculum term, and child-facing meaning from a committed glossary.

**Why:** A learner should never be asked to bridge a concept and a shifting translation at the same time. Stable terms make Hindi/Hinglish/English behavior inspectable and make later pedagogy evaluation possible.

## D-011 — Synthetic gold before learner data

**Decision:** Build and validate a 32-case synthetic corpus before collecting any learner-specific evaluation data. Development cases are reviewable; frozen holdouts are kept separate; live reports retain case IDs and checks only.

**Why:** The build needs a credible correctness bar without treating child homework as an analytics dataset or tuning to an unseen holdout.

## D-012 — Motion must carry conceptual evidence

**Decision:** The live explainer uses learner-controlled semantic HTML/CSS motion. The same whole persists while partitions, labels, and equations change. Video renderers such as HyperFrames or Remotion remain an export path for a submission clip, not the learner interaction runtime.

**Why:** The child must be able to pause, manipulate, read, and revisit each mathematical state. A rendered video is valuable for storytelling, but it would turn the core evidence-producing interaction into pixels and remove the learner’s control.

## D-013 — Spoken depth, visual restraint

**Decision:** Keep one short mathematical anchor on screen while Bodh speaks the deeper explanation in reviewed sentence-sized beats. Every beat owns one visible pointer target; play, pause, and replay control voice and pointing together. The runtime Speech route accepts authored IDs only, never learner text, and device speech plus a transcript remain available when OpenAI narration is unavailable.

**Why:** A child should be able to listen closely without reading a paragraph and searching the artifact at the same time. Sentence-sized ownership makes the deictic language—“यह हिस्सा,” “नीचे का 4,” “यही मात्रा”—visually unambiguous, while the allowlist protects cost, privacy, mathematical correctness, and the pre-lab answer gate.

## D-014 — Understanding is shown on every Marble evidence statement

**Decision:** The Understanding Climb (`/climb`) reuses the two committed Marble slices unchanged. Each of their 18 topics keeps its three canonical evidence statements, and every check Bodh asks is anchored to exactly one `(topicId, evidenceIndex)` pair. Checks cover four facets—see it, explain why, use it somewhere new, and check it backwards. Maths checks are generated from small reviewed parameter pools and their keys are recomputed with exact rational arithmetic; science checks are authored. Every distractor carries a named misconception and a reason.

**Why:** One successful repair is evidence about one moment. The curriculum already states what understanding a topic looks like, so the grounded move is to check those statements directly rather than invent a new rubric or ask a model to write answer keys.

## D-015 — Confidence separates guessing from understanding

**Decision:** Before an answer is checked, the learner says how sure they feel. Evidence becomes *firm* only when an answer is correct, unaided by a hint, and not a guess. A correct guess or a hinted answer is *fragile* and triggers one fresh variant in the same visit. A confident miss is treated as a belief: when its misconception has a repair root lower in the Marble graph (or in a slice's diagnostic-support topic), Bodh suggests stepping down to that topic and shows the canonical dependency reasons that justify the step. A miss with no repair root steps down to the nearest unfirm hard prerequisite of the doubt's topic.

**Why:** Right/wrong alone cannot tell a lucky guess from a stable idea, or a slip from a misconception. The prerequisite edges are already reviewed curriculum data, so they—not a model—decide where repair happens.

## D-016 — Retention is measured, locally and honestly

**Decision:** Firm evidence is re-checked after 1, 3, 7, and 21 days using fresh variants, and due checks are interleaved across topics. Only a correct, confident, unaided check taken after the gap promotes evidence to *lasting*; re-answering early does not. The ledger lives in the learner's browser storage, holds only topic IDs, evidence indices, variants, booleans, confidence, and timestamps, rejects forged or unknown fields, and can be erased from the grown-up panel. Nothing from the Climb is sent to the server.

**Why:** "Truly understood" has to include "still understood later," which the single-session receipt explicitly could not claim. Keeping the evidence on the device preserves the project's privacy boundary while still letting the child and a grown-up see what has lasted.
