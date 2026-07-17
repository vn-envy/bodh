# Diagnostic release evidence

This note records the measured release evidence behind Bodh's public `32/32` and `8/8` statements. It is intentionally narrower than a learner-outcome claim.

## Reproducibility envelope

- Full run generated: `2026-07-16T20:24:29.745Z`
- Source commit: `dc75a17f3870d80675315fe45a1b448770fb6127`
- Suite: `all-32`
- Model: `gpt-5.6` for 32/32 cases
- Prompt: `p3.7` for 32/32 cases
- Attempts: at most 2 per case
- Concurrency: 2
- Per-attempt timeout: 60 seconds

An earlier seed + development run generated at `2026-07-16T20:17:58.722Z` passed 24/24 cases before the eight frozen holdouts were opened.

## Result

| Slice | Passed | Failed |
|---|---:|---:|
| Seed + reviewed development | 24 | 0 |
| Frozen holdout | 8 | 0 |
| Complete release corpus | 32 | 0 |

All 32 cases used one consistent model/prompt pair and returned readable privacy-minimised traces. The runner checked response status, exact equation/token preservation, in-slice taxonomy grounding, acceptable misconception overlap, probe-before-teaching, Hindi bridge presence, trace field bounds, trace/model/prompt agreement, withheld fingerprints, and declared trace privacy.

## Privacy boundary

The retained report contains case IDs, pass/fail checks, selected canonical IDs, attempt counts, and trace envelope metadata. It does not retain learner prompts, images, evidence quotes, model output, API keys, bearer tokens, or input fingerprints.

## Claim boundary

These are synthetic safety and diagnostic-behavior results. They do not establish classroom efficacy, long-term mastery, or learner outcomes. The later hardening pass changed responsive presentation, journey UX, request bounds, migrations, and rate limiting; it did not change the evaluated diagnostic prompt `p3.7` or model pair. A separate pedagogy gold set remains reserved before expanding beyond the fraction journey.
