# Bodh Build Roadmap

> **Bodh — “That which is truly understood.”**

## Scope contract

Bring an English maths doubt. Ask in Hindi. Bodh finds the concept beneath the confusion, teaches it visually, and returns the learner to the original problem ready to solve it independently.

### Build Week MVP

1. Accept a typed or photographed fractions problem.
2. Preserve typed or spoken Hindi/Hinglish reasoning.
3. Confirm extracted notation before diagnosis.
4. Ground the doubt in a bounded Marble prerequisite graph.
5. Form evidence-backed misconception hypotheses.
6. Ask one discriminating probe before teaching.
7. Render a deterministic fraction artifact from validated data.
8. Verify transfer on a structurally similar problem.
9. Return to the original homework problem.
10. Produce an inspectable reasoning trace and mastery receipt.

### Non-goals

No subjects beyond mathematics; no ages outside 8–12; no languages beyond Hindi/Hinglish plus source English; no accounts, payments, dashboards, social features, native app, realtime avatar, arbitrary generated UI code, or long-term mastery claims.

## Protected phases

| Phase | Window (IST) | Outcome | Exit gate |
|---|---|---|---|
| P0 — Contract and evidence spine | 14 Jul | Repo, scope, traceability, taxonomy slice, schemas, eight seeds | Clean install runs the fixture and all contracts validate |
| P1 — Deterministic vertical slice | 14–15 Jul | Complete `3/4 ÷ 1/8` journey without a model | Seeded journey works end to end and math is deterministic |
| P2 — Diagnostic intelligence | 15–17 Jul | Image/reasoning path grounded in taxonomy | Eight seed cases are schema-valid; failures fall back safely |
| P3 — Hindi bridge | 17–18 Jul | Hindi/Hinglish pedagogy and dual terminology | Concept mapping is invariant across English/Hindi/Hinglish |
| P4 — Product and demo polish | 18–19 Jul | Accessible, mobile-responsive judged journey | Feature freeze 19 Jul, 2 p.m. IST |
| P5 — Golden evals and hardening | 19–20 Jul | 32-case measured release candidate | No critical correctness, privacy, install, or demo failure |
| P6 — Submission package | 21 Jul | Video, README, deployment, Devpost entry | Submit by 21 Jul, 11 p.m. IST |
| P7 — Emergency buffer | Until 22 Jul, 5:30 a.m. | Submission failures only | No product changes |

## Phase 0 deliverables

- [x] New repository and runnable product scaffold
- [x] Scope contract and protected phase gates
- [x] `docs/TRACEABILITY.md`
- [x] `docs/DECISIONS.md`
- [x] `docs/BUILD_LOG.md`
- [x] `docs/PRIOR_WORK.md`
- [x] Marble attribution and licenses in `NOTICE.md`
- [x] Bounded fraction-division taxonomy slice with canonical IDs
- [x] Artifact and golden-eval schemas
- [x] Eight seed cases created before prompt tuning
- [x] Learner-facing fixture shell with no model dependency

## Phase 1 deliverables

- [x] Curated `3/4 ÷ 1/8 = ?` journey runs end to end without an API key
- [x] Learner confirms the original question and Hindi reasoning before diagnosis
- [x] One discriminating micro-probe appears before any solution
- [x] Tap/select/tap fraction-fit artifact places six `1/8` tiles inside `3/4`
- [x] Artifact completion is guarded by a deterministic six-tile predicate
- [x] Transfer problem uses a different ribbon/bookmark surface with verified answer `4`
- [x] Original problem returns unchanged and accepts English or Devanagari whole-number answers
- [x] Mastery receipt reports concept evidence rather than score, XP, or streak

### Phase 1 exit gate

The curated journey runs from beginning to end without a model call. The source problem is not solved before the probe, the visual predicate controls progress, and transfer plus return are checked deterministically.

## Phase 2 deliverables

- [x] `/diagnose` intake for a typed fraction question, Hindi/Hinglish reasoning, and optional homework-photo context
- [x] Server-side Responses API request with strict JSON Schema; output has no answer or generated interface field
- [x] Bounded Marble topic-ID selection, exact typed-notation preservation, evidence-quote, and fraction-parser guardrails
- [x] One generated Hindi micro-probe displayed before a learning artifact
- [x] Privacy-minimised D1 trace contract plus inspectable `GET /api/trace/:id`
- [x] Curated-demo fallback for missing key, unsupported maths, unavailable model, and invalid model output
- [x] Unit checks for hero-artifact selection, equation mutation, unsupported taxonomy, evidence fabrication, and unsupported notation
- [x] Add hosted `OPENAI_API_KEY` secret and run a live smoke test
- [x] Expand the eight seeds into the reviewed 32-case diagnostic set

### Phase 2 exit gate

The hosted live path must process every reviewed seed with schema-valid, equation-preserving output or fall back without leaking a raw input. A deployment without the secret remains a functioning curated product, but does not satisfy the live-intelligence exit gate.

## Phases 3–6 release work

- [x] P3: Deterministic Hindi/English teaching terms selected by bounded term ID, with register and term validation
- [x] P3: Hindi/Hinglish/English bridge checks added to the test suite
- [x] P4: Mobile-responsive learner intake, skip link, focus return after diagnosis, keyboard-visible photo control, and judge-readable `how-it-works` route
- [x] P5: 32-case synthetic corpus: 8 seed, 16 reviewed development-gold, 8 frozen holdout
- [x] P5: Corpus validator and privacy-minimised live evaluation runner
- [x] P6: Open Graph card, submission draft, and 90-second demo script
- [x] P2/P5: Configure `OPENAI_API_KEY` and record a live 32-case evaluation report (32/32; frozen holdout 8/8)
- [ ] P6: Record final video, complete Devpost form, and submit

## Evaluation reserve

The golden set grows from 8 seed cases to 16 development-gold cases and finally 8 frozen holdouts. Feature work stops before the concentrated evaluation window. Required release invariants are 100% equation preservation, schema validity, deterministic mathematical correctness, and supported taxonomy-ID validity.
