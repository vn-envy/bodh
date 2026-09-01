/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { handleDiagnosis, handleTrace } from "./diagnose";
import { handleNarration } from "./narration";

interface Env {
  ASSETS: Fetcher;
  DB?: D1Database;
  OPENAI_API_KEY?: string;
  BODH_MODEL?: string;
  BODH_RATE_LIMIT_SALT?: string;
  BODH_RATE_LIMIT_PER_HOUR?: string;
  BODH_TTS_MODEL?: string;
  BODH_TTS_VOICE?: string;
  BODH_TTS_RUNTIME_ENABLED?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/diagnose") {
      return handleDiagnosis(request, env);
    }

    const traceMatch = url.pathname.match(/^\/api\/trace\/([0-9a-f-]{36})$/i);
    if (traceMatch) {
      return handleTrace(request, env, traceMatch[1]);
    }

    const narrationMatch = url.pathname.match(
      /^\/api\/narration\/(fractions-v2|evaporation-v2)\/(hi|en|ta)\/([a-z0-9-]+)\/([a-z0-9-]+)\.mp3$/i,
    );
    if (narrationMatch) {
      return handleNarration(
        request,
        env,
        narrationMatch[1].toLowerCase(),
        narrationMatch[2].toLowerCase(),
        narrationMatch[3],
        narrationMatch[4],
      );
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
