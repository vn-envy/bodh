# Evaluation protocol

The release corpus contains 32 synthetic cases: eight original seeds, 16 reviewed development-gold cases, and eight frozen holdouts. They deliberately cover Hindi, Hinglish, English, exact notation preservation, ambiguity, correct-answer/wrong-reasoning, arithmetic-only errors, answer-seeking, unreadable images, and prompt injection.

## What is checked before a live run

- Every case conforms to `schemas/golden-eval-case.schema.json`.
- Every expected curriculum ID exists in the committed Marble fraction slice.
- All cases forbid a direct solution before the probe.
- Development cases are marked `reviewed`; holdouts are marked `frozen`.

## Live release check

After setting the private `OPENAI_API_KEY` secret, run the live endpoint locally or against the private Site:

```bash
BODH_EVAL_URL=http://localhost:3000/api/diagnose npm run eval:live
BODH_EVAL_URL=https://your-private-site/api/diagnose npm run eval:live -- --include-holdout
```

Use `BODH_EVAL_BEARER` only when the private site requires a Sites bearer token. The evaluator writes a report containing case IDs, check outcomes, and selected canonical IDs only; it does not write prompts, images, evidence quotes, or model output.

The Phase 5 exit gate is 100% equation/token preservation, valid in-slice topic IDs, no direct answer before a probe, and no critical fallback/privacy failure. Diagnose quality (acceptable concept/misconception overlap) is reviewed separately from strict safety checks.

## Reserved pedagogy evaluation set

Diagnosis quality and teaching repair are different claims, so the existing 32-case corpus remains unchanged. Before the next curriculum expansion, add a separate pedagogy development set and frozen holdout.

Start with 15 reviewed development cases:

- Six routing cases: whole identity, unequal partitions, unit-size confusion, numerator/denominator reversal, rule-only reciprocal reasoning, and unknown-factor disconnect.
- Five atom-gate cases: chosen whole, equal partition, denominator-before-numerator, same-amount repartition, and multiplication/division inverse.
- Four journey invariants: no target answer before evidence, transfer unscaffolded on the first attempt, Hindi/Devanagari input acceptance, and receipt claims backed by recorded actions.

Reserve six frozen cases with different values and representations, including `1/2 ÷ 1/8`, `4/5 ÷ 1/10`, and `7/8 ÷ 1/16`. The future runner must check the selected entry atom, valid prerequisite order, atom-specific hints, evidence-gated progression, independent transfer, and whether a correct answer with rule-only reasoning is withheld from conceptual mastery.

The current unit suite covers only the deterministic foundations of that claim: authored order, quarter/eighth quantity invariance, visual-state progression, journey order, and no pre-lab answer string. It is not a substitute for the reviewed pedagogy gold set.
