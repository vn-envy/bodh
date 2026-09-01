import { toOpenAiStructuredOutputSchema } from "../lib/openai-structured-schema";

/**
 * One structured-JSON completion surface over two providers:
 * - OpenAI Responses API with strict JSON Schema (default; the recorded evals).
 * - Sarvam-105B through Sarvam's OpenAI-compatible chat endpoint (`BODH_LLM_PROVIDER=sarvam`).
 *
 * Callers always validate the parsed JSON themselves; the provider only
 * promises "a string that should be JSON", never correctness.
 */
export type LlmEnv = {
  OPENAI_API_KEY?: string;
  BODH_MODEL?: string;
  SARVAM_API_KEY?: string;
  BODH_LLM_PROVIDER?: string;
  BODH_SARVAM_CHAT_MODEL?: string;
};

export type LlmProvider = "openai" | "sarvam";

export const DEFAULT_OPENAI_MODEL = "gpt-5.6";
export const DEFAULT_SARVAM_CHAT_MODEL = "sarvam-105b";
const TIMEOUT_MS = 30_000;

export function selectLlmProvider(env: LlmEnv): LlmProvider | null {
  const requested = env.BODH_LLM_PROVIDER?.trim().toLowerCase();
  if (requested === "sarvam" && env.SARVAM_API_KEY?.trim()) return "sarvam";
  if (env.OPENAI_API_KEY?.trim()) return "openai";
  return null;
}

export function llmModelFor(provider: LlmProvider, env: LlmEnv) {
  return provider === "sarvam"
    ? env.BODH_SARVAM_CHAT_MODEL?.trim() || DEFAULT_SARVAM_CHAT_MODEL
    : env.BODH_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

export type StructuredCompletionRequest = Readonly<{
  instructions: string;
  input: string;
  schemaName: string;
  schema: unknown;
}>;

export type StructuredCompletionResult =
  | Readonly<{ ok: true; provider: LlmProvider; model: string; text: string }>
  | Readonly<{ ok: false; provider: LlmProvider | null; reason: "not_configured" | "unavailable" | "invalid_response" }>;

function textFromOpenAiResponse(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const direct = (payload as { output_text?: unknown }).output_text;
  if (typeof direct === "string" && direct.trim()) return direct;
  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return null;
  for (const item of output) {
    const content = (item as { content?: unknown })?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      const text = (part as { text?: unknown })?.text;
      if (typeof text === "string" && text.trim()) return text;
    }
  }
  return null;
}

function textFromChatCompletion(payload: unknown): string | null {
  const choices = (payload as { choices?: unknown })?.choices;
  if (!Array.isArray(choices)) return null;
  const content = (choices[0] as { message?: { content?: unknown } })?.message?.content;
  return typeof content === "string" && content.trim() ? content : null;
}

export async function completeStructured(request: StructuredCompletionRequest, env: LlmEnv): Promise<StructuredCompletionResult> {
  const provider = selectLlmProvider(env);
  if (!provider) return { ok: false, provider: null, reason: "not_configured" };
  const model = llmModelFor(provider, env);

  let response: Response;
  try {
    response = provider === "openai"
      ? await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          store: false,
          reasoning: { effort: "low" },
          instructions: request.instructions,
          input: [{ role: "user", content: [{ type: "input_text", text: request.input }] }],
          text: {
            format: {
              type: "json_schema",
              name: request.schemaName,
              strict: true,
              schema: toOpenAiStructuredOutputSchema(request.schema),
            },
          },
        }),
      })
      : await fetch("https://api.sarvam.ai/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "api-subscription-key": env.SARVAM_API_KEY!.trim(), "content-type": "application/json" },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `${request.instructions}\n\nRespond with a single JSON object that validates against this JSON Schema and nothing else:\n${JSON.stringify(request.schema)}`,
            },
            { role: "user", content: request.input },
          ],
        }),
      });
  } catch {
    return { ok: false, provider, reason: "unavailable" };
  }
  if (!response.ok) return { ok: false, provider, reason: "unavailable" };

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, provider, reason: "invalid_response" };
  }
  const text = provider === "openai" ? textFromOpenAiResponse(payload) : textFromChatCompletion(payload);
  if (!text) return { ok: false, provider, reason: "invalid_response" };
  return { ok: true, provider, model, text };
}
