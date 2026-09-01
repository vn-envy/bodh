# Sarvam integration

Sarvam provides Indic speech and language for Bodh Van. OpenAI remains the default diagnosis model so the recorded 32/32 evaluation stays valid; Sarvam is additive and can be switched in per capability.

Implementation: `worker/sarvam.ts`, `worker/translate.ts`, `worker/llm-provider.ts`, extensions to `worker/narration.ts`.

## Capabilities used

| Capability | Model | Endpoint | Used for |
|---|---|---|---|
| Speech to text | `saaras:v3`, `mode: "codemix"` | `POST https://api.sarvam.ai/speech-to-text` | Hinglish / Tanglish / English doubt intake |
| Text to speech | `bulbul:v3` | `POST https://api.sarvam.ai/text-to-speech` | Bodh's voice in `hi-IN`, `ta-IN`, `en-IN` |
| Translation | `sarvam-translate:v1` | `POST https://api.sarvam.ai/translate` | Tamil overlays of authored copy and generated slot text, glossary-pinned |
| Chat LLM | `sarvam-105b` | `POST https://api.sarvam.ai/v1/chat/completions` | Optional diagnosis / slot-fill provider (`BODH_LLM_PROVIDER=sarvam`) |

Authentication is the `api-subscription-key` header. Keys live only in the Worker environment.

## Routes added to the Worker

- `POST /api/speech/transcribe` — multipart audio (≤ 2 MiB, ≤ 30 s declared), `language` in `hi | en | ta`. Returns `{ transcript, languageCode }`. Rate-limited with the same D1 window table as diagnosis. Audio and transcript are never stored.
- `GET /api/narration/:version/:lang/:stage/:beat.mp3` — now accepts `ta` and chooses a voice source in order: static reviewed clip → Sarvam Bulbul (when `SARVAM_API_KEY` is set and `BODH_TTS_RUNTIME_ENABLED=true`) → OpenAI Speech (existing) → `503` with device-voice fallback.
- `GET /api/narration/generated/:lang/:hash.mp3` — speaks only text that the generation step has already stored under `hash`. Learner text can never reach this route.
- `GET /api/tools` — see `docs/WEBMCP_TOOLS.md`.

## Voices

One pinned speaker per language, configured with `BODH_SARVAM_SPEAKER_HI`, `BODH_SARVAM_SPEAKER_TA`, `BODH_SARVAM_SPEAKER_EN` (defaults chosen for a calm tutor register). `pace` is fixed at `0.9`; Bulbul v3 does not accept `pitch` or `loudness`.

## Glossary pinning

Translation requests wrap protected terms (`हर`, `denominator`, the Tamil equivalents in `lib/concept-bridge.ts`, and every maths token) in placeholders before the call and restore them after, so a term never drifts between screens. Untranslatable placeholders cause the whole translation to be rejected and the authored English/Hindi fallback to be used.

## Spending the million credits well

- **Cache everything by content hash.** TTS output is immutable per `(text, language, speaker, model)`; the edge cache and static clips absorb repeat traffic.
- **Translate once, review, commit.** Tamil overlays for authored copy are generated into `lib/i18n/ta-overlay.data.ts` by `npm run i18n:ta` (`scripts/generate-tamil-overlay.mjs`), marked `reviewed: false`, and committed. Runtime translation is only for generated slot text.
- **Bound STT.** 30-second cap per utterance; the client stops recording on silence.
- **Rate-limit per client.** Same hashed-IP window as `/api/diagnose`.
- **Never pay for learner text twice.** Transcripts feed the existing validated text pipeline; they are not re-sent to TTS or translation.

## Privacy

Identical to the existing boundary (D-009): no raw learner text, audio, or model output is retained. Traces record model and prompt versions, status, and a one-way fingerprint only.
