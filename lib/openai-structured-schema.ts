const OMITTED_SCHEMA_KEYS = new Set([
  "$schema",
  "$id",
  "title",
  "minLength",
  "maxLength",
  "uniqueItems",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Keep the canonical schema strict for server-side validation, while sending
 * only OpenAI Structured Outputs' supported JSON Schema subset upstream.
 */
export function toOpenAiStructuredOutputSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toOpenAiStructuredOutputSchema);
  if (!isRecord(value)) return value;

  const schema: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (OMITTED_SCHEMA_KEYS.has(key)) continue;
    if (key === "const") {
      schema.enum = [toOpenAiStructuredOutputSchema(child)];
      continue;
    }
    schema[key] = toOpenAiStructuredOutputSchema(child);
  }
  return schema;
}
