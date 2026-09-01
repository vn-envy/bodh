import { validateLite } from "../lib/json-schema-lite";
import { isTutorTool, TUTOR_TOOL_ALLOWLIST } from "../lib/tutor-policy";
import { worldToolByName, worldToolManifest } from "../lib/world-tools";
import { completeStructured, llmModelFor, selectLlmProvider, type LlmEnv } from "./llm-provider";
import { consumeRateLimit, rateLimitedResponse, type RateLimitEnv } from "./rate-limit";

/**
 * `POST /api/tutor/step` — the model-backed tutor policy. It receives the
 * world observation (IDs, labels, counters; never learner text) and returns
 * one tool call for the browser to execute through the same registry a child
 * or an external agent uses. The server validates that the tool is in the
 * tutor allowlist and that its input satisfies the tool's own schema; anything
 * else is rejected so the client falls back to the deterministic policy.
 */
export type TutorEnv = LlmEnv & RateLimitEnv;

const TUTOR_PROMPT_VERSION = "tutor-p1.0" as const;
const MAX_BODY_BYTES = 16_384;

const INSTRUCTIONS = `You are Bodh, a calm elephant mentor walking beside a child aged 8–12 in a small world called Bodh Van.

You lead navigation and explanation. You never do the child's doing: you may not answer a probe, change a control, or press check. Choose exactly one tool call from the allowed list that a patient tutor would take next, and give a one-sentence reason in the child's language.

Guidance:
- If a question is on screen, the child must answer it: choose bodh_observe_world and say you are waiting.
- If the child is tinkering, offer a hint (bodh_ask_bodh with intent "hint"), not the answer.
- If the station is ready to explain, call bodh_ask_bodh with intent "explain".
- If a place is marked "due", prefer walking there; otherwise prefer a lit place.
- When a station is done, leave it.
Return only the JSON object requested.`;

const STEP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tool", "input", "reason"],
  properties: {
    tool: { type: "string", enum: [...TUTOR_TOOL_ALLOWLIST] },
    input: {
      type: "object",
      additionalProperties: false,
      required: ["placeId", "intent", "beatId"],
      properties: {
        placeId: { type: ["string", "null"] },
        intent: { type: ["string", "null"], enum: ["hint", "explain", "where-am-i", null] },
        beatId: { type: ["string", "null"] },
      },
    },
    reason: { type: "string", minLength: 3, maxLength: 200 },
  },
} as const;

function json(body: unknown, status: number, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...headers },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Strips nulls from the model's fixed-shape input so the tool schema sees only the fields it declares. */
function toolInputFrom(raw: unknown) {
  if (!isRecord(raw)) return {};
  const input: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) if (value !== null && value !== undefined) input[key] = value;
  return input;
}

export async function handleTutorStep(request: Request, env: TutorEnv) {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return json({ error: "body_too_large" }, 413);

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: "body_too_large" }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (!isRecord(body) || !isRecord(body.observation)) return json({ error: "invalid_request" }, 400);
  const observation = body.observation;
  if (typeof observation.language !== "string" || !Array.isArray(observation.places)) return json({ error: "invalid_observation" }, 400);

  const provider = selectLlmProvider(env);
  if (!provider) return json({ error: "tutor_unavailable", fallback: "policy" }, 503);
  const limit = await consumeRateLimit(request, env, "tutor-step", { billable: true, defaultPerHour: 120 });
  if (limit.state === "limited") return rateLimitedResponse(limit, { error: "rate_limited", fallback: "policy" });
  if (limit.state === "unavailable") return json({ error: "tutor_unavailable", fallback: "policy" }, 503);

  const manifest = worldToolManifest().tools.filter((tool) => isTutorTool(tool.name));
  const completion = await completeStructured({
    instructions: INSTRUCTIONS,
    input: JSON.stringify({ observation, allowedTools: manifest, promptVersion: TUTOR_PROMPT_VERSION }),
    schemaName: "bodh_tutor_step",
    schema: STEP_SCHEMA,
  }, env);
  if (!completion.ok) return json({ error: "tutor_unavailable", fallback: "policy", reason: completion.reason }, 503);

  let parsed: unknown;
  try {
    parsed = JSON.parse(completion.text);
  } catch {
    return json({ error: "tutor_invalid", fallback: "policy" }, 502);
  }
  if (!isRecord(parsed) || !isTutorTool(parsed.tool) || typeof parsed.reason !== "string") {
    return json({ error: "tutor_invalid", fallback: "policy", reason: "outside allowlist" }, 502);
  }
  const tool = worldToolByName(parsed.tool)!;
  const validation = validateLite(tool.inputSchema, toolInputFrom(parsed.input));
  if (!validation.ok) return json({ error: "tutor_invalid", fallback: "policy", reason: validation.reason }, 502);

  return json({
    step: { kind: "call", tool: tool.name, input: validation.value, reason: parsed.reason.slice(0, 200) },
    provider: completion.provider,
    model: llmModelFor(completion.provider, env),
    promptVersion: TUTOR_PROMPT_VERSION,
    privacy: "The tutor receives world observation IDs and counters only; never learner text, audio, or images.",
  }, 200);
}
