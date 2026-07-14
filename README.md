# Bodh

> **That which is truly understood.**

Bodh is a Hindi-first, visual misconception tutor for mathematics learners aged 8–12. A learner brings an English homework problem, explains the doubt in Hindi or Hinglish, repairs the underlying concept through a short visual interaction, proves transfer on a fresh problem, and then returns to solve the original problem.

This repository was created during OpenAI Devpost Build Week. Phase 1 contains a complete, runnable, deterministic vertical slice rather than live model calls.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by the development server. No API key is required for the curated journey.

## Validate the foundation

```bash
npm run validate:phase0
npm test
```

The Phase 0 validator checks the artifact contract, all eight seed eval cases, taxonomy referential integrity, and that every expected concept ID belongs to the committed fraction slice.

## Repository map

- `app/` — learner-facing shell and curated demo fixture
- `data/taxonomy/` — bounded Marble taxonomy extract used by the hero journey
- `data/fixtures/` — deterministic artifact and eight seed eval cases
- `schemas/` — model-output and golden-eval JSON Schemas
- `docs/` — decisions, traceability, build log, and prior-work boundary
- `ROADMAP.md` — protected phase scope and release gates
- `NOTICE.md` — attribution and license obligations

## Current build boundary

Included now: product scaffold, design tokens, canonical taxonomy slice, schemas, seed eval cases, traceability, and the complete deterministic hero journey: confirmation, concept path, probe, fraction-fit lab, transfer, return, and mastery receipt.

Not included yet: image parsing, model diagnosis, speech, live Hindi generation, persistence, or learner-specific storage. Those enter only in their owner phases in `ROADMAP.md`.

## Privacy posture

The Phase 0 fixture contains no child data and sends nothing to an external service. Later phases must keep raw learner inputs out of analytics and logs by default.
