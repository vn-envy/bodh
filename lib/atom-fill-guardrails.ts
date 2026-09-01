import { atomTemplateById, isBridgeTermIdForTemplate, type AtomTemplate, type AtomTemplateId } from "./atom-templates.ts";
import { isNarrationLanguage, type NarrationLanguage } from "./narration-language.ts";

/**
 * Deterministic acceptance rules for a slot fill, applied after JSON Schema
 * validation. Anything a model returns that fails here is discarded in favour
 * of the reviewed authored fill (D-018). No exceptions, no repairs.
 */
export const ATOM_FILL_SCHEMA_VERSION = "1.0.0" as const;

export type AtomBeatFill = Readonly<{ key: string; text: string; target: string }>;

export type AtomSlotFill = Readonly<{
  schemaVersion: typeof ATOM_FILL_SCHEMA_VERSION;
  templateId: AtomTemplateId;
  language: NarrationLanguage;
  objectId: string;
  story: Readonly<{ title: string; invitation: string }>;
  distractors: readonly string[];
  beats: readonly AtomBeatFill[];
  termIds: readonly string[];
}>;

export type FillVerdict = Readonly<{ ok: true; fill: AtomSlotFill }> | Readonly<{ ok: false; reason: string }>;

const MARKUP_OR_LINK = /<[^>]+>|https?:\/\/|www\.|\{\{|\}\}/i;
const IDENTIFIER = /^[a-z][a-z0-9-]{1,31}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function bounded(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && value.trim().length >= min && value.length <= max && !MARKUP_OR_LINK.test(value);
}

function containsForbidden(text: string, tokens: readonly string[]) {
  const lowered = text.toLowerCase();
  return tokens.some((token) => {
    const needle = token.toLowerCase();
    if (/^\d+(\/\d+)?$/.test(needle)) {
      // Numerals must match as whole tokens so "12" is caught but "120" or "1/2" are not misread.
      return new RegExp(`(^|[^0-9/])${needle.replace("/", "\\/")}(?![0-9/])`).test(lowered);
    }
    return lowered.includes(needle);
  });
}

/**
 * Story and beats must never carry the answer. Distractors are deliberately
 * wrong ideas a child might hold (including a memorised rule), so they are
 * bounded and de-duplicated but exempt from the answer-token check.
 */
function teachingText(fill: { story: { title: string; invitation: string }; beats: readonly AtomBeatFill[] }) {
  return [fill.story.title, fill.story.invitation, ...fill.beats.flatMap((beat) => [beat.key, beat.text])];
}

export function validateAtomFill(value: unknown, expectedTemplate?: AtomTemplate, expectedLanguage?: NarrationLanguage): FillVerdict {
  if (!isRecord(value)) return { ok: false, reason: "fill must be an object" };
  const keys = Object.keys(value).sort().join("|");
  if (keys !== "beats|distractors|language|objectId|schemaVersion|story|templateId|termIds") return { ok: false, reason: "unexpected keys" };
  if (value.schemaVersion !== ATOM_FILL_SCHEMA_VERSION) return { ok: false, reason: "schema version" };
  const template = atomTemplateById(value.templateId);
  if (!template) return { ok: false, reason: "unknown template" };
  if (expectedTemplate && template.id !== expectedTemplate.id) return { ok: false, reason: "template mismatch" };
  if (!isNarrationLanguage(value.language)) return { ok: false, reason: "language" };
  if (expectedLanguage && value.language !== expectedLanguage) return { ok: false, reason: "language mismatch" };
  if (typeof value.objectId !== "string" || !IDENTIFIER.test(value.objectId) || !template.objects.some((object) => object.id === value.objectId)) {
    return { ok: false, reason: "object outside the template's list" };
  }
  if (!isRecord(value.story) || Object.keys(value.story).sort().join("|") !== "invitation|title") return { ok: false, reason: "story shape" };
  if (!bounded(value.story.title, 3, 80) || !bounded(value.story.invitation, 10, 240)) return { ok: false, reason: "story bounds" };
  if (!Array.isArray(value.distractors) || value.distractors.length < 2 || value.distractors.length > 3) return { ok: false, reason: "distractor count" };
  if (!value.distractors.every((item) => bounded(item, 3, 120))) return { ok: false, reason: "distractor bounds" };
  if (new Set(value.distractors).size !== value.distractors.length) return { ok: false, reason: "duplicate distractors" };
  if (!Array.isArray(value.beats) || value.beats.length < template.beats.min || value.beats.length > template.beats.max) return { ok: false, reason: "beat count" };
  const beats: AtomBeatFill[] = [];
  for (const beat of value.beats) {
    if (!isRecord(beat) || Object.keys(beat).sort().join("|") !== "key|target|text") return { ok: false, reason: "beat shape" };
    if (!bounded(beat.key, 3, 60) || !bounded(beat.text, 20, 320)) return { ok: false, reason: "beat bounds" };
    if (typeof beat.target !== "string" || !template.cueTargets.includes(beat.target)) return { ok: false, reason: "beat target outside template" };
    beats.push({ key: beat.key, text: beat.text, target: beat.target });
  }
  if (!Array.isArray(value.termIds) || value.termIds.length < 1 || value.termIds.length > 3) return { ok: false, reason: "term count" };
  if (!value.termIds.every((termId) => isBridgeTermIdForTemplate(template, termId))) return { ok: false, reason: "term outside template" };
  if (new Set(value.termIds).size !== value.termIds.length) return { ok: false, reason: "duplicate terms" };

  const fill: AtomSlotFill = {
    schemaVersion: ATOM_FILL_SCHEMA_VERSION,
    templateId: template.id,
    language: value.language,
    objectId: value.objectId,
    story: { title: value.story.title, invitation: value.story.invitation },
    distractors: [...(value.distractors as string[])],
    beats,
    termIds: [...(value.termIds as string[])],
  };
  for (const text of teachingText(fill)) {
    if (containsForbidden(text, template.forbiddenAnswerTokens)) return { ok: false, reason: "answer leakage" };
  }
  return { ok: true, fill };
}

/** Stable content hash used as the narration key for a generated beat. */
export async function beatHash(templateId: AtomTemplateId, language: NarrationLanguage, text: string) {
  const bytes = new TextEncoder().encode(`${templateId}\n${language}\n${text}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest).slice(0, 16), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
