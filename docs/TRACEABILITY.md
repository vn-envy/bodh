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
| BODH-R05 | The first learner-visible stage has no solution; the micro-probe must be answered correctly before the visual lab unlocks. |
| BODH-R06 | The fraction-fit lab exposes only eight rendered slots, allows placement only in the six `3/4` target slots, and requires the exact six-slot predicate. |
| BODH-R07 | The ribbon/bookmark transfer has a fixed answer (`4`) checked by shared answer-normalization code. |
| BODH-R08 | The exact source equation returns after transfer, accepts `6`, `६`, or `6/1`, and only then opens the receipt. |
| BODH-R11 | Every state uses the committed fixture and deterministic helpers; no API key or external model call is in the path. |
