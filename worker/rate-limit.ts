/**
 * Shared per-client rate limiting for paid routes beyond diagnosis. Uses the
 * same migration-backed D1 table and hashed-IP design as `diagnose.ts`, with a
 * per-route HMAC namespace so routes never share a bucket. The diagnosis
 * limiter itself is left untouched to keep the recorded evaluation reproducible.
 */
export type RateLimitEnv = {
  DB?: D1Database;
  BODH_RATE_LIMIT_SALT?: string;
  BODH_RATE_LIMIT_PER_HOUR?: string;
};

export type RateLimitResult =
  | { state: "allowed" }
  | { state: "unavailable" }
  | { state: "limited"; limit: number; retryAfterSeconds: number; resetEpochSeconds: number };

const WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_PER_HOUR = 40;
const MAX_PER_HOUR = 1000;

function configuredLimit(env: RateLimitEnv, fallback: number) {
  const configured = Number(env.BODH_RATE_LIMIT_PER_HOUR);
  return Number.isInteger(configured) && configured >= 1 && configured <= MAX_PER_HOUR ? configured : fallback;
}

function connectingIp(request: Request) {
  const ip = request.headers.get("cf-connecting-ip")?.trim();
  if (!ip || ip.length > 128 || /[,\r\n]/.test(ip)) return null;
  return ip;
}

function isLoopback(request: Request) {
  try {
    const hostname = new URL(request.url).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

async function hmac(namespace: string, ip: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(`bodh:${namespace}:v1:${ip}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function consumeRateLimit(
  request: Request,
  env: RateLimitEnv,
  namespace: string,
  options: { billable: boolean; defaultPerHour?: number },
): Promise<RateLimitResult> {
  if (!options.billable) return { state: "allowed" };
  if (isLoopback(request)) return { state: "allowed" };
  const ip = connectingIp(request);
  if (!env.DB) return ip ? { state: "unavailable" } : { state: "allowed" };
  const secret = env.BODH_RATE_LIMIT_SALT?.trim();
  if (!ip || !secret) return { state: "unavailable" };

  const limit = configuredLimit(env, options.defaultPerHour ?? DEFAULT_PER_HOUR);
  const now = Date.now();
  const windowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;
  try {
    const clientHash = await hmac(namespace, ip, secret);
    const result = await env.DB.prepare(
      `INSERT INTO diagnosis_rate_limits (client_hash, window_start, request_count)
      VALUES (?, ?, 1)
      ON CONFLICT(client_hash) DO UPDATE SET
        window_start = excluded.window_start,
        request_count = CASE
          WHEN diagnosis_rate_limits.window_start = excluded.window_start
          THEN diagnosis_rate_limits.request_count + 1
          ELSE 1
        END
      RETURNING request_count`,
    ).bind(clientHash, windowStart).first<{ request_count: number }>();
    const count = Number(result?.request_count);
    if (!Number.isFinite(count)) return { state: "unavailable" };
    if (count <= limit) return { state: "allowed" };
    const resetAt = windowStart + WINDOW_MS;
    return {
      state: "limited",
      limit,
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      resetEpochSeconds: Math.ceil(resetAt / 1000),
    };
  } catch {
    return { state: "unavailable" };
  }
}

export function rateLimitedResponse(result: Extract<RateLimitResult, { state: "limited" }>, body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 429,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "retry-after": String(result.retryAfterSeconds),
      "x-ratelimit-limit": String(result.limit),
      "x-ratelimit-reset": String(result.resetEpochSeconds),
    },
  });
}
