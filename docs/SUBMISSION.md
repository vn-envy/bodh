# Bodh — Devpost submission draft

## One-line pitch

**Bodh helps an Indian learner turn a Hindi or Hinglish homework doubt into a visual understanding they can use again.**

## The problem

Children can often find an answer, a rule, or a translation. What remains hidden is the misconception beneath the doubt: why a smaller fraction can fit more times, what a denominator says about size, or why division can mean “how many groups fit?” A generic explanation in a second language can leave that bottleneck intact.

## The solution

Bodh listens first. A learner types a fraction problem, explains the stuck point in Hindi/Hinglish, and may add a homework photo. Before teaching, Bodh grounds the doubt in a small Marble Skill Taxonomy slice, presents evidence-backed possibilities, and asks one discriminating question. The curated hero journey then lets the learner place six `1/8` tiles inside `3/4`, transfer the idea to a ribbon problem, and return to the unchanged original homework question.

## Why it is different

- Hindi-first conversation with deterministic dual terminology: `इकाई भिन्न (unit fraction)`, `हर (denominator)`, and `बराबर समूह (equal groups)`.
- The model is restricted to schema-valid diagnosis; it cannot generate UI or reveal a final answer before a probe.
- Curriculum IDs, notation, evidence quotes, and maths bounds are checked in code before anything reaches the learner.
- The fraction visual, transfer check, and return-answer check are deterministic.
- Privacy-minimised traces retain only a one-way fingerprint plus model/prompt/topic metadata—never raw learner text, image, quote, or model output.

## Built with

Next.js/Vinext on Cloudflare Workers, D1, OpenAI Responses API structured outputs with optional image input, and the Marble Skill Taxonomy fraction-division slice.

## Current demo status

The curated journey is fully runnable without a key. The live diagnostic path is deployed in safe fallback mode until the private `OPENAI_API_KEY` secret is configured and the 32-case live evaluation is run.
