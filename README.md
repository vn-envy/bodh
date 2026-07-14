# Bodh

> **That which is truly understood.**

Bodh is a Hindi-first, visual misconception tutor for mathematics learners aged 8–12. A learner brings an English homework problem, explains the doubt in Hindi or Hinglish, repairs the underlying concept through a short visual interaction, proves transfer on a fresh problem, and then returns to solve the original problem.

This repository was created during OpenAI Devpost Build Week. It contains a complete deterministic fraction journey and a constrained Phase 2 diagnostic intake that safely falls back to that journey when live intelligence is unavailable.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by the development server. No API key is required for the curated journey.

To enable the live diagnostic intake, put the following in an ignored `.env.local` file:

```bash
OPENAI_API_KEY=your_key_here
BODH_MODEL=gpt-5.6
```

The live path uses the Responses API with strict structured output and optional image input. It never receives an executable interface from the model, rejects ungrounded taxonomy IDs/evidence/notation changes, and falls back to the curated demo if validation fails.

## Validate the foundation

```bash
npm run validate:phase0
npm test
```

The Phase 0 validator checks the artifact contract, all eight seed eval cases, taxonomy referential integrity, and that every expected concept ID belongs to the committed fraction slice.

The release corpus is validated separately:

```bash
npm run validate:evals
```

It contains 32 synthetic cases: eight seeds, 16 reviewed development-gold cases, and eight frozen holdouts. See `docs/EVALUATION.md` for the secret-gated live run.

## Repository map

- `app/` — learner-facing shell and curated demo fixture
- `data/taxonomy/` — bounded Marble taxonomy extract used by the hero journey
- `data/fixtures/` — deterministic artifact and eight seed eval cases
- `schemas/` — model-output and golden-eval JSON Schemas
- `docs/` — decisions, traceability, build log, and prior-work boundary
- `data/evals/` — reviewed development-gold and frozen holdout cases
- `ROADMAP.md` — protected phase scope and release gates
- `NOTICE.md` — attribution and license obligations

## Current build boundary

Included now: product scaffold, design tokens, canonical taxonomy slice, schemas, seed eval cases, traceability, and the complete deterministic hero journey: confirmation, concept path, probe, fraction-fit lab, transfer, return, and mastery receipt.

Included in the Phase 2 code path: typed Hindi/Hinglish reasoning, optional homework-photo context, constrained model diagnosis, one pre-teaching probe, privacy-minimised inspectable traces, and safe fallback.

Still deliberately deferred: voice, open-ended teaching generation, learner accounts, long-term mastery claims, and a broad curriculum surface. The private deployment needs an `OPENAI_API_KEY` environment secret before the live path can be exercised.

## Privacy posture

The curated fixture contains no child data and sends nothing to an external service. In the live path, raw learner text, photo data, evidence quotes, and model responses are never written to the durable trace. The trace stores only a one-way input fingerprint, selected canonical topic IDs, model/prompt versions, and fallback status.
