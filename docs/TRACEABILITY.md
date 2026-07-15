# MVP traceability

Every requirement has one owner phase, a verification method, and a visible demo beat. A requirement is not complete merely because a model can produce a plausible response.

| ID | Requirement | Owner phase | Verification | Demo beat |
|---|---|---|---|---|
| BODH-R01 | Typed problem or homework image | P2 | Input-fidelity tests; notation equality | Learner confirms `3/4 ÷ 1/8 = ?` |
| BODH-R02 | Hindi/Hinglish reasoning and voice | P3 | Transcript preservation and permission-denial tests | Original doubt remains visible verbatim |
| BODH-R03 | Bounded Marble prerequisite graph | P0/P2 | Canonical-ID and referential-integrity validation | Bodh traces the shortest relevant path |
| BODH-R04 | Evidence-backed misconception hypotheses | P2 | Golden diagnosis top-1/top-3 review | Trace cites the learner’s own words/work |
| BODH-R05 | Discriminating probe before teaching | P1/P2 | Journey-order invariant and probe rubric | One small question changes the chosen path |
| BODH-R06 | Validated interactive artifact | P1 | JSON Schema, render, keyboard/touch, predicate tests | Learner fits six eighths into three quarters |
| BODH-R07 | Verified transfer problem | P1/P2 | Deterministic solver and similarity rubric | Fresh surface problem without full scaffold |
| BODH-R08 | Return to original homework | P1 | End-to-end state test | Original problem reappears unchanged |
| BODH-R09 | Hindi-first dual terminology | P3 | Glossary consistency and meaning-preservation eval | `हर (denominator)` appears consistently |
| BODH-R10 | Inspectable reasoning trace | P2 | Trace schema and required-field tests | Input → graph → hypothesis → probe → artifact |
| BODH-R11 | Deterministic judge-demo path | P0/P1 | API-free smoke test | Clearly labelled curated demo always runs |
| BODH-R12 | License, privacy, setup, submission | P0/P6 | Notice, secret scan, fresh install, checklist | Judges can run and attribute the project |

## Phase 0 gate

- All twelve requirements have an owner, test, and demo beat.
- Taxonomy IDs and edges are checked against the committed slice.
- Eight seeds exist before prompt work.
- The visual-artifact fixture validates without a model.
- A clean install can display the curated fixture.

## Phase 1 evidence

| Requirement | Deterministic evidence now present |
|---|---|
| BODH-R05 | The first learner-visible stage has no solution; the micro-probe comes before the atomic explainer, and both must complete before the visual lab unlocks. |
| BODH-R06 | The fraction-fit lab exposes only eight rendered slots, allows placement only in the six `3/4` target slots, and requires the exact six-slot predicate. |
| BODH-R07 | The ribbon/bookmark transfer has a fixed answer (`4`) checked by shared answer-normalization code. |
| BODH-R08 | The exact source equation returns after transfer, accepts `6`, `६`, or `6/1`, and only then opens the receipt. |
| BODH-R11 | Every state uses the committed fixture and deterministic helpers; no API key or external model call is in the path. |

## Atomic pedagogy and motion evidence

| Requirement | Deterministic evidence now present |
|---|---|
| BODH-R05 | The curated journey asks the diagnostic whole/quarter probe before reteaching. The explainer then gates seven authored ideas in order: chosen whole → equal parts → unit/denominator → numerator → equivalent repartition → repeated composition → division as unknown factor. |
| BODH-R06 | One persistent semantic HTML fraction bar transforms across every idea. The final explainer frame remains `3/4 ÷ 1/8 = ?`; the answer appears only after the exact six-slot lab predicate succeeds. |
| BODH-R07 | The transfer begins without its completed strip or an answer-like placeholder. The deterministic visual hint appears only after an incorrect attempt. |
| BODH-R09 | The committed bridge now includes `हर (denominator)`, `अंश (numerator)`, and `समतुल्य भिन्न (equivalent fraction)` with fixed child meanings. |
| BODH-R02 | The seven-stage explainer has reviewed Hindi/Hinglish narration, learner-controlled pause/replay, one pointer target per spoken beat, a complete transcript, and a device Hindi voice fallback. The allowlisted Speech route never receives learner text. |

## Phase 2 implementation evidence

| Requirement | Constrained implementation now present | Remaining release evidence |
|---|---|---|
| BODH-R01 | `/diagnose` accepts a bounded typed question plus optional PNG/JPG/WebP homework photo context. Typed notation must round-trip exactly through server guardrails. | Live smoke test after the deployment secret is set; photo-only confirmation flow. |
| BODH-R03 | Model output allows only the ten canonical IDs in the committed fraction slice; worker resolves learner-visible concept names from that slice. | Expand only through a documented curriculum-slice change. |
| BODH-R04 | Hypotheses require source/quote evidence. Text quotes must be an exact substring of typed problem/reasoning. | Evaluate top-1/top-3 quality on the growing golden set. |
| BODH-R05 | The only generated learner-facing teaching-adjacent item is one 2–4 option micro-probe; no solution field exists in the schema. | Verify journey order in live end-to-end testing. |
| BODH-R10 | `/api/trace/:id` exposes privacy-minimised model/prompt/topic/status metadata stored in D1. | Confirm D1 trace persistence in the hosted environment. |

## Phases 3–5 implementation evidence

| Requirement | Release implementation now present | Remaining release evidence |
|---|---|---|
| BODH-R02 / BODH-R09 | The model can return only approved vocabulary IDs; the learner interface renders deterministic `Hindi (English)` terms and child meanings. | Review live Hindi/Hinglish register selection after the API secret is set. |
| BODH-R04 / BODH-R05 | The 32-case corpus includes conceptual, ambiguous, arithmetic, answer-seeking, and injection cases. The live runner checks acceptable concept/misconception overlap and that a probe arrives without an answer. | Run development first, then frozen holdouts exactly once for the release candidate. |
| BODH-R12 | The release adds skip navigation, keyboard-visible upload focus, mobile layouts, an Open Graph card, a demo script, and submission draft. | Record the final video and complete the Devpost submission. |
