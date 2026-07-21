# Bodh — Devpost submission draft

## One-line pitch

**Bodh helps an Indian learner turn a Hindi, Hinglish, or English homework doubt into a visual understanding they can use again.**

## The problem

Children can often find an answer, a rule, or a translation. What remains hidden is the misconception beneath the doubt: why a smaller fraction can fit more times, what a denominator says about size, or why division can mean “how many groups fit?” A generic explanation in a second language can leave that bottleneck intact.

## The solution

Bodh listens first. A learner types or speaks a doubt in Hindi, Hinglish, or English and may add a homework photo. Before teaching, Bodh grounds the doubt in a bounded Marble Skill Taxonomy slice, presents evidence-backed possibilities, and asks one discriminating question. The curated mathematics journey lets the learner place six `1/8` tiles inside `3/4`, transfer the idea to a ribbon problem, and return to the unchanged original question. The science journey follows the same pedagogy from a disappearing puddle through evaporation, condensation, rain, and a fresh cold-lid transfer.

## Why it is different

- Hindi-first conversation with deterministic dual terminology: `इकाई भिन्न (unit fraction)`, `हर (denominator)`, and `बराबर समूह (equal groups)`.
- The model is restricted to schema-valid diagnosis; it cannot generate UI or reveal a final answer before a probe.
- Curriculum IDs, notation, evidence quotes, and maths bounds are checked in code before anything reaches the learner.
- The fraction and water-cycle visuals, transfer checks, and evidence receipts are deterministic.
- Privacy-minimised traces retain only a one-way fingerprint plus model/prompt/topic metadata—never raw learner text, image, quote, or model output.

## Built with

Next.js/Vinext on Cloudflare Workers, D1, OpenAI Responses API structured outputs with optional image input, OpenAI Speech API narration, and bounded Marble Skill Taxonomy slices for fraction division and the water cycle.

## Current demo status

The public site is available at https://bodh-learning.neekhil007.chatgpt.site. Its curated journeys are fully runnable without a key, while the judge path can demonstrate one bounded live science diagnosis with an explicitly labelled reviewed fallback. The recorded release corpus passed 32/32 synthetic safety and diagnostic cases, including 8/8 held-out cases, on `gpt-5.6` with prompt `p3.7`. The newer evaporation seed is outside that recorded run. These are guardrail and diagnosis results—not learner-outcome research.
