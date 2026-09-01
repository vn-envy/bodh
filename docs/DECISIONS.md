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

## D-014 — Growth graph is truth

**Decision:** A per-learner growth graph (`lib/growth-graph.ts`) is the only store of learner state. Each concept node holds one rung of an evidence ladder—`unseen → noticed → tinkered → explained → transferred → taught-back`—plus attempts, misconception signal IDs, and logical ticks. Failed attempts are evidence, never penalties. No XP, levels, streaks, scores, or mastery percentages exist anywhere.

**Why:** The world, the tutor, and every receipt must agree about what a child has actually demonstrated. A single deterministic source makes that agreement inspectable and keeps "progress" honest.

## D-015 — World, not lessons

**Decision:** Concepts are rendered as places in Bodh Van. Fog covers places whose hard prerequisites are unmet; light returns to places due for spaced revisit. Zooming out shows the whole growth graph as terrain. There is no lesson list.

**Why:** Curiosity chooses a direction; a syllabus assigns one. A world lets the graph constrain what is *reachable* while the child decides where to *go*.

## D-016 — One action path

**Decision:** Every world action is a typed tool with a JSON Schema, a read-only annotation, and an evidence gate (`lib/world-tools.ts`). Child taps, Bodh's in-page tutor, external WebMCP agents, and headless tests call the same functions. Tools never solve, never skip the probe, and never accept learner free text into a model call.

**Why:** Four callers with four code paths would be four separate safety promises. One registry makes them one promise: whatever an agent can do, a child could have done by hand, in the same order, with the same gates.

## D-017 — Deterministic physics for productive failure

**Decision:** Stations run on a cross-platform deterministic physics build (Rapier 2D deterministic, Apache-2.0) with a fixed timestep, seeded RNG, and no transcendental JavaScript math in simulation logic. The same seed and inputs replay identically. Stations are designed so a first attempt is likely to fail in an informative way.

**Why:** Learning by doing requires that the thing being done behaves the same every time, for the child, for the tutor, and for the tests. Productive failure only works when the failure is trustworthy.

## D-018 — Generate slots, not mechanics

**Decision:** A model may fill bounded content slots inside an authored atom template—story wrapper, everyday object from a fixed Indian-context list, probe distractors, narration beats with pointer targets—under a strict JSON schema and the existing guardrails. Mechanics, success predicates, and cue targets are shipped code. Reviewed authored fills are the always-available fallback.

**Why:** On-demand generation is what makes the world feel alive; deterministic mechanics are what make it true. Separating the two keeps both.

## D-019 — Indic voice through Sarvam, allowlisted

**Decision:** Saaras v3 (`codemix`) transcribes Hinglish/Tanglish/English speech; Bulbul v3 speaks Bodh's beats in Hindi, Tamil, and English with one pinned speaker per language; Sarvam-Translate produces glossary-pinned Tamil overlays. Text-to-speech receives only server-produced, content-hashed text. OpenAI remains the default diagnosis model.

**Why:** Indic-first is not a translation layer. Sarvam's models are built for code-mixed Indian speech, and allowlisting keeps the existing cost, privacy, and correctness boundaries intact.

## D-020 — No accounts, still remembers

**Decision:** The growth graph lives on the device (IndexedDB with `localStorage` fallback) and can be exported or imported as a compact "Bodhi seed" string. D1 continues to hold only privacy-minimised operational metadata.

**Why:** A friend who forgets is not a friend; a child-data platform is not a friend either. Device-local memory with a portable seed gives continuity without accounts.
