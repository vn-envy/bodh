import { isNarrationLanguage, NARRATION_SPEECH_LOCALE, type NarrationLanguage } from "../lib/narration-language";
import { mathsTokensIn, pinProtectedForms, restoreProtectedForms } from "../lib/translation-pinning";
import { consumeRateLimit, rateLimitedResponse, type RateLimitEnv } from "./rate-limit";

export { pinProtectedForms, restoreProtectedForms };

/**
 * Sarvam integration (D-019, docs/SARVAM.md). Three capabilities:
 * - Saaras v3 speech-to-text in code-mixed mode for Hinglish / Tanglish / English.
 * - Bulbul v3 text-to-speech for Bodh's authored beats in Hindi, Tamil and English.
 * - Sarvam-Translate with glossary pinning, used server-side only.
 *
 * Learner audio and transcripts are never stored. TTS receives only text that
 * the narration or generation layer has already committed.
 */
export type SarvamEnv = RateLimitEnv & {
  SARVAM_API_KEY?: string;
  BODH_SARVAM_TTS_MODEL?: string;
  BODH_SARVAM_STT_MODEL?: string;
  BODH_SARVAM_SPEAKER_HI?: string;
  BODH_SARVAM_SPEAKER_TA?: string;
  BODH_SARVAM_SPEAKER_EN?: string;
  BODH_STT_PROVIDER?: string;
};

export const SARVAM_BASE_URL = "https://api.sarvam.ai";
export const DEFAULT_SARVAM_TTS_MODEL = "bulbul:v3";
export const DEFAULT_SARVAM_STT_MODEL = "saaras:v3";
export const DEFAULT_SARVAM_SPEAKER = "shubh";
export const SARVAM_TTS_PACE = 0.9;
const MAX_TTS_CHARS = 2_400;
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
const MAX_TRANSCRIPT_CHARS = 1_000;
const STT_TIMEOUT_MS = 25_000;
const TTS_TIMEOUT_MS = 20_000;
const TRANSLATE_TIMEOUT_MS = 20_000;
const SPEAKER_PATTERN = /^[a-z]{2,24}$/;

function json(body: unknown, status: number, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

export function sarvamConfigured(env: Pick<SarvamEnv, "SARVAM_API_KEY">) {
  return Boolean(env.SARVAM_API_KEY?.trim());
}

export function sarvamSpeakerFor(language: NarrationLanguage, env: SarvamEnv) {
  const configured = language === "hi" ? env.BODH_SARVAM_SPEAKER_HI : language === "ta" ? env.BODH_SARVAM_SPEAKER_TA : env.BODH_SARVAM_SPEAKER_EN;
  const candidate = configured?.trim().toLowerCase();
  return candidate && SPEAKER_PATTERN.test(candidate) ? candidate : DEFAULT_SARVAM_SPEAKER;
}

// ---------------------------------------------------------------------------
// Text to speech
// ---------------------------------------------------------------------------

export function sarvamSpeechRequestFor(text: string, language: NarrationLanguage, env: SarvamEnv) {
  return {
    text,
    target_language_code: NARRATION_SPEECH_LOCALE[language],
    model: env.BODH_SARVAM_TTS_MODEL?.trim() || DEFAULT_SARVAM_TTS_MODEL,
    speaker: sarvamSpeakerFor(language, env),
    pace: SARVAM_TTS_PACE,
    speech_sample_rate: 24000,
    output_audio_codec: "mp3",
  };
}

function decodeBase64(value: string) {
  const binary = typeof atob === "function" ? atob(value) : Buffer.from(value, "base64").toString("binary");
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function audioMimeFor(bytes: Uint8Array) {
  if (bytes.length >= 4 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return "audio/wav";
  return "audio/mpeg";
}

/** Returns raw audio bytes and their MIME type, or null when Sarvam is unavailable or the text is out of bounds. */
export async function synthesizeWithSarvam(
  text: string,
  language: NarrationLanguage,
  env: SarvamEnv,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  if (!sarvamConfigured(env) || !text || text.length > MAX_TTS_CHARS) return null;
  let response: Response;
  try {
    response = await fetch(`${SARVAM_BASE_URL}/text-to-speech`, {
      method: "POST",
      headers: {
        "api-subscription-key": env.SARVAM_API_KEY!.trim(),
        "content-type": "application/json",
      },
      body: JSON.stringify(sarvamSpeechRequestFor(text, language, env)),
      signal: AbortSignal.timeout(TTS_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return null;
  }
  const audios = (payload as { audios?: unknown })?.audios;
  const first = Array.isArray(audios) ? audios[0] : null;
  if (typeof first !== "string" || first.length === 0) return null;
  let bytes: Uint8Array;
  try {
    bytes = decodeBase64(first);
  } catch {
    return null;
  }
  if (bytes.length === 0 || bytes.length > 4 * 1024 * 1024) return null;
  return { bytes, contentType: audioMimeFor(bytes) };
}

// ---------------------------------------------------------------------------
// Speech to text
// ---------------------------------------------------------------------------

export function sttProvider(env: SarvamEnv): "sarvam" | "browser" {
  return env.BODH_STT_PROVIDER?.trim().toLowerCase() === "sarvam" && sarvamConfigured(env) ? "sarvam" : "browser";
}

export function handleSpeechCapabilities(request: Request, env: SarvamEnv) {
  if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { allow: "GET" });
  return json({
    provider: sttProvider(env),
    languages: ["hi", "en", "ta"],
    maxAudioBytes: MAX_AUDIO_BYTES,
    maxSeconds: 30,
  }, 200, { "cache-control": "public, max-age=60" });
}

/**
 * `POST /api/speech/transcribe` — multipart with `audio` (≤ 2 MiB) and
 * `language` (hi | en | ta). Returns the transcript for the editable text box.
 */
export async function handleTranscribe(request: Request, env: SarvamEnv) {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
  if (sttProvider(env) !== "sarvam") return json({ error: "stt_unavailable", fallback: "browser" }, 503);

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_AUDIO_BYTES + 4096) {
    return json({ error: "audio_too_large", maxAudioBytes: MAX_AUDIO_BYTES }, 413);
  }

  const limit = await consumeRateLimit(request, env, "speech-transcribe", { billable: true, defaultPerHour: 120 });
  if (limit.state === "unavailable") return json({ error: "stt_unavailable", fallback: "browser" }, 503);
  if (limit.state === "limited") return rateLimitedResponse(limit, { error: "rate_limited", fallback: "browser" });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "invalid_form" }, 400);
  }
  const audio = form.get("audio");
  const language = String(form.get("language") ?? "hi");
  if (!(audio instanceof Blob) || audio.size === 0) return json({ error: "audio_required" }, 400);
  if (audio.size > MAX_AUDIO_BYTES) return json({ error: "audio_too_large", maxAudioBytes: MAX_AUDIO_BYTES }, 413);
  if (!/^audio\//i.test(audio.type || "")) return json({ error: "audio_type_unsupported" }, 415);
  if (!isNarrationLanguage(language)) return json({ error: "language_unsupported" }, 400);

  const upstream = new FormData();
  upstream.append("file", audio, "learner-speech");
  upstream.append("model", env.BODH_SARVAM_STT_MODEL?.trim() || DEFAULT_SARVAM_STT_MODEL);
  upstream.append("mode", "codemix");
  upstream.append("language_code", NARRATION_SPEECH_LOCALE[language]);

  let response: Response;
  try {
    response = await fetch(`${SARVAM_BASE_URL}/speech-to-text`, {
      method: "POST",
      headers: { "api-subscription-key": env.SARVAM_API_KEY!.trim() },
      body: upstream,
      signal: AbortSignal.timeout(STT_TIMEOUT_MS),
    });
  } catch {
    return json({ error: "stt_unavailable", fallback: "browser" }, 503);
  }
  if (!response.ok) return json({ error: "stt_unavailable", fallback: "browser" }, 503);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return json({ error: "stt_unavailable", fallback: "browser" }, 503);
  }
  const transcript = (payload as { transcript?: unknown })?.transcript;
  if (typeof transcript !== "string") return json({ error: "stt_unavailable", fallback: "browser" }, 503);
  const detected = (payload as { language_code?: unknown })?.language_code;
  return json({
    transcript: transcript.trim().replace(/\s+/g, " ").slice(0, MAX_TRANSCRIPT_CHARS),
    languageCode: typeof detected === "string" && /^[a-z]{2}-[A-Z]{2}$/.test(detected) ? detected : NARRATION_SPEECH_LOCALE[language],
  }, 200);
}

// ---------------------------------------------------------------------------
// Translation with glossary pinning
// ---------------------------------------------------------------------------

/**
 * Translates authored or generated text while keeping every glossary form and
 * maths token exactly as written. Returns null rather than a drifted translation.
 */
export async function translateWithSarvam(
  text: string,
  from: NarrationLanguage | "auto",
  to: NarrationLanguage,
  env: SarvamEnv,
  protectedForms: readonly string[],
): Promise<string | null> {
  if (!sarvamConfigured(env) || !text.trim() || text.length > 2_000) return null;
  const { text: pinnedText, pinned } = pinProtectedForms(text, [...protectedForms, ...mathsTokensIn(text)]);
  let response: Response;
  try {
    response = await fetch(`${SARVAM_BASE_URL}/translate`, {
      method: "POST",
      headers: {
        "api-subscription-key": env.SARVAM_API_KEY!.trim(),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        input: pinnedText,
        source_language_code: from === "auto" ? "auto" : NARRATION_SPEECH_LOCALE[from],
        target_language_code: NARRATION_SPEECH_LOCALE[to],
        model: "sarvam-translate:v1",
        mode: "classic-colloquial",
        numerals_format: "international",
      }),
      signal: AbortSignal.timeout(TRANSLATE_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return null;
  }
  const translated = (payload as { translated_text?: unknown })?.translated_text;
  if (typeof translated !== "string" || !translated.trim()) return null;
  return restoreProtectedForms(translated, pinned);
}
