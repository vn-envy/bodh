# Build log

## 2026-07-14 — Phase 0

- Created the Bodh repository during the Build Week window.
- Initialized the deployable web scaffold and deterministic local fixture mode.
- Frozen the MVP contract, non-goals, protected phases, and acceptance gates.
- Added requirement-to-phase traceability for BODH-R01 through BODH-R12.
- Recorded the prior-work boundary and third-party attribution.
- Extracted the bounded fraction-division slice from Marble Skill Taxonomy v1 at commit `96a7933754af672e1bfdbf7ecb05c325860c6e0d`.
- Defined strict JSON Schemas for visual artifacts and golden eval cases.
- Added eight seed cases before any prompt tuning.
- Established the matte cream, blue-grey, pink, peach, and olive design tokens.
- Replaced the generic starter with a learner-facing Bodh fixture shell.

### Deferred by contract

Live model calls, image parsing, speech, persistence, full journey interaction, and production analytics remain assigned to later phases.

## 2026-07-14 — Phase 1

- Replaced the static demo panel with the full curated learner journey.
- Kept the original English equation and Hindi reasoning visible before diagnosis.
- Added a required micro-probe before the visual explanation.
- Added a keyboard- and touch-operable fraction-fit artifact: select a `1/8` tile, then place it into six target positions inside `3/4`.
- Bound progression to the deterministic success predicate, not generated code or model output.
- Added a structurally similar ribbon transfer problem and returned the learner to the unchanged original question.
- Added an evidence-based mastery receipt with `इकाई भिन्न (unit fraction)` terminology.
- Added deterministic checks for Devanagari/English answers and fraction-fit completion.

### Deferred by contract

The P1 demo is intentionally curated. Live model diagnosis, image intake, speech, personalization, and persistence remain out of scope until their assigned phases.
## 2026-07-14 — Phase 2 diagnostic intelligence

- Added a child-facing `/diagnose` intake with Hindi/Hinglish reasoning and optional homework-photo context.
- Added a Cloudflare Worker `/api/diagnose` route that calls the Responses API only when `OPENAI_API_KEY` is present.
- Locked model output to a strict schema containing a readback, canonical Marble IDs, tentative evidence-backed hypotheses, and one probe; no final-answer field exists.
- Added deterministic guardrails for typed notation fidelity, quoted evidence, supported taxonomy IDs, bounded fraction-division notation, and the single validated artifact key.
- Added a D1-backed, privacy-minimised trace contract. No raw child text, image, evidence quote, or model output is persisted.
- The hosted secret was configured later in the release cycle; the live path and privacy-minimised trace were smoke-tested before the frozen evaluation run.

## 2026-07-14 — Phases 3–6 release preparation

- Added a deterministic Hindi/Hinglish bridge so the model selects only approved term IDs and the interface renders stable bilingual meanings.
- Added the mobile/accessibility release pass: skip navigation, result focus return, visible keyboard focus for photo upload, and a 90-second product-story route.
- Expanded the evaluation corpus to 32 synthetic cases and added a live evaluator that writes only case IDs and check outcomes.
- Added the Open Graph social card, Devpost submission draft, and narrated demo script.
- The live release report later passed 32/32 synthetic cases, including the frozen 8-case holdout. Final video capture and Devpost submission remain the release tasks.

## 2026-07-15 — Atomic fraction pedagogy and motion pass

- Replaced the static three-card concept preview with seven evidence-gated ideas using one persistent fraction bar.
- Reordered the curated journey so the discriminating whole/quarter probe comes before reteaching.
- Taught the denominator as the chosen unit size before using the numerator to count those units.
- Added the missing equivalence bridge: each quarter splits into two eighth-size pieces while the selected amount stays fixed.
- Added learner-controlled HTML/CSS motion plus an optional presentation playback; reduced-motion preferences still collapse all transitions.
- Kept the answer gated: the explainer ends at `? × 1/8 = 3/4` / `3/4 ÷ 1/8 = ?`, and only the completed six-slot lab reveals `6`.
- Removed transfer and return placeholder answers; the completed transfer strip now appears only as a post-attempt hint.
- Expanded the deterministic bilingual glossary with numerator and equivalent-fraction meanings.
- Added concept-order, quantity-invariance, visual-state, and pre-lab answer-leak tests.

## 2026-07-15 — Bodh narration and pointing pass

- Replaced long on-screen mentor paragraphs with one short mathematical anchor per idea and an optional full transcript.
- Authored the seven-stage explanation as 24 calm Hindi/Hinglish narration beats. Meaning always comes before the formal English curriculum term.
- Bound every beat to exactly one code-native arrow and target halo on the persistent fraction artifact.
- Added learner-controlled play, pause, resume, and replay. Audio completion—not a fixed animation timer—moves the explanation to its next beat.
- Added an allowlisted Speech API route using the reviewed script only; it never accepts arbitrary learner text.
- Added a no-key device Hindi voice fallback and visible AI-voice disclosure, while keeping the visual journey and transcript fully usable without sound.
- Preserved the answer gate: the narrated explainer asks for the missing count but never speaks or renders it before the six-slot lab.
- Added narration allowlist, fallback, cache, endpoint, pointer-target, concise-copy, and answer-leak regression tests.

## 2026-07-17 — UX, responsive, and runtime hardening

- Removed the contradictory probe gate: every answer now continues through a conservative repair entry, and skipped ideas remain explicitly available through “review everything.”
- Made the complete journey Hindi/English, added semantic Enter-submit forms, preserved adaptive handoff across refresh, enabled per-tile undo, and added privacy-safe share/print receipt actions.
- Extracted typed journey copy/configuration and made the full seven-idea route visible without claiming skipped ideas were assessed.
- Applied the final matte desktop/tablet/mobile system, 44px language controls, self-hosted Baloo 2/Mukta fonts, contrast-safe text colours, reduced motion, and receipt print styles.
- Reduced the live timeout to 15 seconds and added a six-second progress message plus an explicit bilingual client-timeout state, bounded streamed JSON parsing, early media/size rejection, migration-backed D1 rate limiting with HMAC client identifiers, opportunistic row pruning, and no request-time DDL. Hosted limiter/configuration failures now return the safe curated journey without making a model call.
- Added regression coverage for chunked oversized bodies, the exact 4 MiB image boundary, stale-diagnosis invalidation, conservative probe routing, handoff persistence, bilingual copy, tile undo, and evidence-gated receipts.
- Verified 67/67 automated tests plus browser passes at 320, 390, 768, and 1440 px. The final video and Devpost form remain outstanding.
