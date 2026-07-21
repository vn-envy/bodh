import {
  FRACTION_NARRATION_VERSION,
  narrationBeatFor,
} from "../lib/fraction-concept";
import {
  EVAPORATION_NARRATION_VERSION,
  narrationBeatForEvaporation,
} from "../lib/evaporation-concept";
import {
  isNarrationLanguage,
  NARRATION_SPEECH_LOCALE,
  type NarrationLanguage,
} from "../lib/narration-language";

export type NarrationEnv = {
  ASSETS: { fetch(request: Request): Promise<Response> };
  OPENAI_API_KEY?: string;
  BODH_TTS_MODEL?: string;
  BODH_TTS_VOICE?: string;
  BODH_TTS_RUNTIME_ENABLED?: string;
};

type VoiceSource = "static" | "openai";
type NarrationVersion = typeof FRACTION_NARRATION_VERSION | typeof EVAPORATION_NARRATION_VERSION;
type EdgeCache = {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
};

const DEFAULT_TTS_MODEL = "gpt-4o-mini-tts-2025-12-15";
const DEFAULT_TTS_VOICE = "marin";
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const synthesisInFlight = new Map<string, Promise<Response>>();
const TTS_PROFILE_VERSION = "calm-tutor-v2";
const VOICE_INSTRUCTIONS: Record<NarrationLanguage, string> = {
  hi: "Speak entirely in the supplied natural Indian Hindi, like a calm, warm primary-school tutor. Speak clearly at a moderate-slow pace, with thoughtful pauses around each idea. Sound reassuring and curious, never theatrical, patronising, challenging, or sing-song. Pronounce the supplied maths and science words exactly as written. Do not translate, add, remove, count, solve, or answer anything.",
  en: "Speak entirely in clear Indian English, like a calm, warm primary-school tutor. Speak at a moderate-slow pace, with thoughtful pauses around each idea. Sound reassuring and curious, never theatrical, patronising, challenging, or sing-song. Pronounce the supplied maths and science terms naturally and exactly preserve the supplied meaning. Do not translate, add, remove, count, solve, or answer anything.",
};

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

function unavailable(head = false) {
  const headers = {
    "cache-control": "no-store",
    "retry-after": "60",
    "x-content-type-options": "nosniff",
  };
  return head
    ? new Response(null, { status: 503, headers })
    : json({ error: "narration_unavailable", fallback: "device_voice" }, 503, headers);
}

function audioResponse(
  source: Response,
  voiceSource: VoiceSource,
  language: NarrationLanguage,
  narrationVersion: NarrationVersion,
) {
  return new Response(source.body, {
    status: 200,
    headers: {
      "content-type": "audio/mpeg",
      "cache-control": "public, max-age=31536000, immutable",
      "x-bodh-narration-version": narrationVersion,
      "x-bodh-voice": "ai-generated",
      "x-bodh-voice-source": voiceSource,
      "content-language": NARRATION_SPEECH_LOCALE[language],
      "x-content-type-options": "nosniff",
    },
  });
}

function runtimeEnabled(env: NarrationEnv) {
  return env.BODH_TTS_RUNTIME_ENABLED?.toLowerCase() === "true";
}

function defaultEdgeCache() {
  const storage = (globalThis as typeof globalThis & { caches?: { default?: EdgeCache } }).caches;
  return storage?.default ?? null;
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function cacheRequestFor(
  request: Request,
  narrationVersion: NarrationVersion,
  language: NarrationLanguage,
  stageId: string,
  beatId: string,
  text: string,
  env: NarrationEnv,
) {
  const model = env.BODH_TTS_MODEL || DEFAULT_TTS_MODEL;
  const voice = env.BODH_TTS_VOICE || DEFAULT_TTS_VOICE;
  const key = stableHash(`${narrationVersion}\n${TTS_PROFILE_VERSION}\n${language}\n${model}\n${voice}\n${VOICE_INSTRUCTIONS[language]}\n${text}`);
  const cacheUrl = new URL(request.url);
  cacheUrl.pathname = `/_bodh-audio-cache/${narrationVersion}/${language}/${encodeURIComponent(model)}/${encodeURIComponent(voice)}/${stageId}/${beatId}-${key}.mp3`;
  cacheUrl.search = "";
  return new Request(cacheUrl, { method: "GET" });
}

export function speechRequestFor(
  text: string,
  language: NarrationLanguage,
  env: Pick<NarrationEnv, "BODH_TTS_MODEL" | "BODH_TTS_VOICE">,
) {
  return {
    model: env.BODH_TTS_MODEL || DEFAULT_TTS_MODEL,
    voice: env.BODH_TTS_VOICE || DEFAULT_TTS_VOICE,
    input: text,
    instructions: VOICE_INSTRUCTIONS[language],
    response_format: "mp3",
    speed: 0.9,
  };
}

async function synthesizeBeat(
  text: string,
  language: NarrationLanguage,
  narrationVersion: NarrationVersion,
  env: NarrationEnv,
  cache: EdgeCache | null,
  cacheRequest: Request,
) {
  let speech: Response;
  try {
    speech = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(speechRequestFor(text, language, env)),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return unavailable();
  }

  if (!speech.ok || !speech.body || !/^audio\//i.test(speech.headers.get("content-type") || "")) {
    return unavailable();
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await speech.arrayBuffer();
  } catch {
    return unavailable();
  }
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_AUDIO_BYTES) return unavailable();

  const response = audioResponse(
    new Response(bytes, { headers: { "content-type": "audio/mpeg" } }),
    "openai",
    language,
    narrationVersion,
  );
  if (cache) {
    try {
      await cache.put(cacheRequest, response.clone());
    } catch {
      // Audio remains usable even if an edge cache is unavailable.
    }
  }
  return response;
}

export async function handleNarration(
  request: Request,
  env: NarrationEnv,
  versionValue: string,
  languageValue: string,
  stageId: string,
  beatId: string,
) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ error: "method_not_allowed" }, 405, { allow: "GET, HEAD" });
  }

  const url = new URL(request.url);
  if (url.search) return json({ error: "query_not_allowed" }, 400);

  if (!isNarrationLanguage(languageValue)) return json({ error: "narration_not_found" }, 404);
  const language = languageValue;
  const narrationVersion: NarrationVersion | null = versionValue === FRACTION_NARRATION_VERSION
    ? FRACTION_NARRATION_VERSION
    : versionValue === EVAPORATION_NARRATION_VERSION
      ? EVAPORATION_NARRATION_VERSION
      : null;
  if (!narrationVersion) return json({ error: "narration_not_found" }, 404);
  const beat = narrationVersion === FRACTION_NARRATION_VERSION
    ? narrationBeatFor(stageId, beatId, language)
    : narrationBeatForEvaporation(stageId, beatId, language);
  if (!beat) return json({ error: "narration_not_found" }, 404);

  const assetPath = `/audio/${narrationVersion}/${language}/${stageId}/${beatId}.mp3`;
  try {
    const asset = await env.ASSETS.fetch(new Request(new URL(assetPath, request.url)));
    if (asset.ok && /^audio\//i.test(asset.headers.get("content-type") || "")) {
      const response = audioResponse(asset, "static", language, narrationVersion);
      return request.method === "HEAD"
        ? new Response(null, { status: response.status, headers: response.headers })
        : response;
    }
  } catch {
    // Missing optional reviewed clips may fall through to explicitly enabled TTS.
  }

  if (!runtimeEnabled(env) || !env.OPENAI_API_KEY) return unavailable(request.method === "HEAD");

  const cache = defaultEdgeCache();
  const cacheRequest = cacheRequestFor(request, narrationVersion, language, stageId, beatId, beat.text, env);
  if (cache) {
    try {
      const cached = await cache.match(cacheRequest);
      if (cached) {
        return request.method === "HEAD"
          ? new Response(null, { status: cached.status, headers: cached.headers })
          : cached;
      }
    } catch {
      // Continue to the guarded runtime path when edge cache lookup fails.
    }
  }

  if (request.method === "HEAD") {
    return new Response(null, {
      status: 204,
      headers: {
        "cache-control": "no-store",
        "x-bodh-narration-version": narrationVersion,
        "x-bodh-voice-source": "openai",
        "content-language": NARRATION_SPEECH_LOCALE[language],
      },
    });
  }

  const inFlightKey = cacheRequest.url;
  let synthesis = synthesisInFlight.get(inFlightKey);
  if (!synthesis) {
    synthesis = synthesizeBeat(beat.text, language, narrationVersion, env, cache, cacheRequest);
    synthesisInFlight.set(inFlightKey, synthesis);
    void synthesis.finally(() => synthesisInFlight.delete(inFlightKey));
  }
  return (await synthesis).clone();
}
