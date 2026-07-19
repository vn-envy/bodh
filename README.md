# Bodh

> **That which is truly understood.**

Bodh is a Hindi-first, visual misconception tutor for mathematics learners aged 8–12. A learner brings an English homework problem, types or speaks the doubt in Hindi or Hinglish, repairs the underlying concept through a short visual interaction, proves transfer on a fresh problem, and then returns to solve the original problem.

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
BODH_TTS_MODEL=gpt-4o-mini-tts-2025-12-15
BODH_TTS_VOICE=marin
BODH_TTS_RUNTIME_ENABLED=true
```

The live diagnostic path uses the Responses API with strict structured output and optional image input. It never receives an executable interface from the model, rejects ungrounded taxonomy IDs/evidence/notation changes, and falls back to the curated demo if validation fails.

On browsers that expose speech recognition, the reasoning field also offers Hindi (`hi-IN`) and Indian English (`en-IN`) voice input. Recognition stays a learner-editable text draft and enters the exact same bounded diagnostic pipeline; unsupported browsers simply keep the typed field.

The deterministic fraction explainer also offers learner-triggered Bodh narration. Each reviewed Hindi/Hinglish sentence is allowlisted, paired with exactly one artifact pointer, and sent to the Speech API only after the learner asks to prepare it. Runtime synthesis is opt-in, canonical edge-cached, and single-flight protected. Without that runtime setting, the same script and arrow sequence use the device speech voice; the complete transcript remains available either way.

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

It contains 32 synthetic cases: eight seeds, 16 reviewed development-gold cases, and eight frozen holdouts. The release run passed 32/32 cases with the frozen holdout passing 8/8; see `docs/EVALUATION_RELEASE.md` for the exact model, prompt, source commit, and claim boundary.

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

Included now: product scaffold, responsive matte visual system, canonical taxonomy slice, schemas, release eval corpus, traceability, and the complete deterministic hero journey: confirmation, conservative probe routing, seven-atom narrated explainer, synchronized fraction-bar/number-line lab, transfer, return, and a printable or PNG-shareable evidence receipt. The editorial homepage introduces Bodh as Listener, Pathfinder, and Gentle Tinkerer, with a mathematically exact `3/4 = 6/8` teaching scene and a five-node canonical Marble route. The diagnostic intake exposes all eight reviewed seed doubts as safe selectable examples, while a 10-topic, 12-dependency Marble concept map shows a suggested prerequisite climb without making a validated-diagnosis or mastery claim. An English-first 90-second judge tour and the measured 32-case release evidence are available in-product.

Included in the Phase 2 code path: typed or browser-transcribed Hindi/Hinglish/English reasoning, optional homework-photo context, constrained model diagnosis, one pre-teaching probe, privacy-minimised inspectable traces, bounded request streaming, migration-backed diagnosis rate limits, and safe fallback.

Still deliberately deferred: arbitrary generated teaching speech, learner accounts, long-term mastery claims, a broad curriculum surface, and learner-outcome claims. The private deployment has exercised the live diagnostic policy; the curated interaction and reviewed static narration remain fully usable without an API key.

## Privacy posture

The curated fixture contains no child data and sends nothing to an external service. In the live path, raw learner text, photo data, evidence quotes, and model responses are never written to the durable trace. The trace stores only a one-way input fingerprint, selected canonical topic IDs, model/prompt versions, and fallback status.
