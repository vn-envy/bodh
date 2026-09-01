import { beatHash, validateAtomFill, type AtomSlotFill } from "../lib/atom-fill-guardrails";
import { authoredFillFor } from "../lib/atom-fill-fixtures";
import { atomTemplateById, type AtomTemplate } from "../lib/atom-templates";
import { CONCEPT_BRIDGE_TERMS } from "../lib/concept-bridge";
import { authoredLanguageFor, isNarrationLanguage, localized, type NarrationLanguage } from "../lib/narration-language";
import atomFillSchema from "../schemas/atom-slot-fill.schema.json";
import { completeStructured, llmModelFor, selectLlmProvider, type LlmEnv } from "./llm-provider";
import { consumeRateLimit, rateLimitedResponse, type RateLimitEnv } from "./rate-limit";
import type { SarvamEnv } from "./sarvam";
import { translateForLearner } from "./translate";

/**
 * `POST /api/generate-atom` — fills the story slots of one authored atom
 * template on demand (D-018). The request carries a template ID, a language
 * and an optional seed word; never learner text. Model output is validated by
 * schema and guardrails, otherwise the reviewed authored fill is used. Beat
 * text is stored in `generated_beats` so narration can speak it by hash.
 */
export type GenerateAtomEnv = LlmEnv & SarvamEnv & RateLimitEnv & { DB?: D1Database };

const FILL_PROMPT_VERSION = "atom-fill-p1.0" as const;
const MAX_BODY_BYTES = 2_048;

const INSTRUCTIONS = `You write short story wrappers for Bodh, a Hindi-first visual tutor for children aged 8–12 in India.

You are given one authored learning template. You may only fill its story slots: a title, an invitation to tinker, two or three plausible wrong ideas a child might hold (distractors), two or three spoken beats that each point at one named part of the picture, and one to three glossary term IDs from the allowed list.

Rules:
- Use only the everyday object IDs, cue targets and term IDs supplied. Never invent new ones.
- Write in the requested language. Keep sentences short and warm, never theatrical or patronising.
- Never state the answer, the count, the balanced number of pieces, the total, a rule such as "flip and multiply", or any step that solves the task. The child must discover it by doing.
- Never describe the child as wrong, weak, or slow. Distractors are ideas, not labels.
- Return only the JSON object requested. No markdown, no commentary.`;

function json(body: unknown, status: number, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...headers },
  });
}

function templateBrief(template: AtomTemplate, language: NarrationLanguage, seedWord: string | null) {
  return JSON.stringify({
    templateId: template.id,
    language,
    languageName: language === "hi" ? "Hindi (Devanagari, everyday Hinglish for English maths words is fine)" : language === "ta" ? "Tamil" : "Indian English",
    stationKind: template.stationId,
    allowedObjectIds: template.objects.map((object) => ({ id: object.id, label: localized(object.label, language) })),
    allowedCueTargets: template.cueTargets,
    allowedTermIds: template.termIds.map((termId) => ({ id: termId, term: CONCEPT_BRIDGE_TERMS[termId].term[language] })),
    beats: template.beats,
    inspirationWord: seedWord,
    schemaVersion: "1.0.0",
  });
}

async function storeBeats(env: GenerateAtomEnv, fill: AtomSlotFill) {
  const hashes: string[] = [];
  for (const beat of fill.beats) {
    const hash = await beatHash(fill.templateId, fill.language, beat.text);
    hashes.push(hash);
    if (!env.DB) continue;
    try {
      await env.DB.prepare(
        "INSERT OR IGNORE INTO generated_beats (hash, language, template_id, text, created_at) VALUES (?, ?, ?, ?, ?)",
      ).bind(hash, fill.language, fill.templateId, beat.text, Date.now()).run();
    } catch {
      // Narration falls back to the device voice when a beat is not stored.
    }
  }
  return hashes;
}

async function translateFill(fill: AtomSlotFill, to: NarrationLanguage, env: GenerateAtomEnv): Promise<AtomSlotFill | null> {
  if (fill.language === to) return fill;
  const translate = (text: string) => translateForLearner(text, fill.language, to, env);
  const title = await translate(fill.story.title);
  const invitation = await translate(fill.story.invitation);
  const distractors = await Promise.all(fill.distractors.map(translate));
  const beats = await Promise.all(fill.beats.map(async (beat) => {
    const key = await translate(beat.key);
    const text = await translate(beat.text);
    return key && text ? { key, text, target: beat.target } : null;
  }));
  if (!title || !invitation || distractors.some((item) => !item) || beats.some((beat) => !beat)) return null;
  const candidate = {
    ...fill,
    language: to,
    story: { title, invitation },
    distractors: distractors as string[],
    beats: beats as AtomSlotFill["beats"],
  };
  const verdict = validateAtomFill(candidate, atomTemplateById(fill.templateId)!, to);
  return verdict.ok ? verdict.fill : null;
}

export async function handleGenerateAtom(request: Request, env: GenerateAtomEnv) {
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
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "invalid_request" }, 400);
  const { templateId, language, seedWord } = body as Record<string, unknown>;
  const template = atomTemplateById(templateId);
  if (!template) return json({ error: "unknown_template" }, 400);
  if (!isNarrationLanguage(language)) return json({ error: "language_unsupported" }, 400);
  const seed = typeof seedWord === "string" && /^[\p{L}\p{N} -]{1,32}$/u.test(seedWord) ? seedWord : null;

  const authoredLanguage = authoredLanguageFor(language);
  const authored = validateAtomFill(authoredFillFor(template.id, authoredLanguage), template, authoredLanguage);
  if (!authored.ok) return json({ error: "authored_fill_invalid", reason: authored.reason }, 500);

  const provider = selectLlmProvider(env);
  let fill: AtomSlotFill | null = null;
  let source: "openai" | "sarvam" | "authored" = "authored";
  let fallbackReason: string | null = provider ? null : "live_not_configured";

  if (provider) {
    const limit = await consumeRateLimit(request, env, "generate-atom", { billable: true, defaultPerHour: 60 });
    if (limit.state === "limited") return rateLimitedResponse(limit, { error: "rate_limited" });
    if (limit.state === "unavailable") {
      fallbackReason = "limiter_unavailable";
    } else {
      // Generate in the authored language when the target is Tamil, then translate with pinning.
      const generationLanguage: NarrationLanguage = language === "ta" ? "en" : language;
      const completion = await completeStructured({
        instructions: INSTRUCTIONS,
        input: templateBrief(template, generationLanguage, seed),
        schemaName: "bodh_atom_fill",
        schema: atomFillSchema,
      }, env);
      if (!completion.ok) {
        fallbackReason = completion.reason;
      } else {
        let parsed: unknown;
        try {
          parsed = JSON.parse(completion.text);
        } catch {
          parsed = null;
        }
        const verdict = validateAtomFill(parsed, template, generationLanguage);
        if (verdict.ok) {
          fill = verdict.fill;
          source = completion.provider;
        } else {
          fallbackReason = `guardrail:${verdict.reason}`;
        }
      }
    }
  }

  fill ??= authored.fill;
  if (fill.language !== language) {
    const translated = await translateFill(fill, language, env);
    if (translated) fill = translated;
    else fallbackReason = fallbackReason ? `${fallbackReason};translation_unavailable` : "translation_unavailable";
  }

  const hashes = await storeBeats(env, fill);
  return json({
    fill,
    source,
    fallbackReason,
    promptVersion: FILL_PROMPT_VERSION,
    model: provider ? llmModelFor(provider, env) : null,
    beats: fill.beats.map((beat, index) => ({
      ...beat,
      hash: hashes[index],
      narrationPath: fill!.language === language ? `/api/narration/generated/${fill!.language}/${hashes[index]}.mp3` : null,
    })),
    privacy: "This route receives a template ID and language only. No learner text is sent to any model.",
  }, 200);
}
