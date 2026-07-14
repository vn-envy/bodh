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
