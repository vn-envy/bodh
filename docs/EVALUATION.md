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
