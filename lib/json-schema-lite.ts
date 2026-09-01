/**
 * A deliberately small JSON Schema validator for tool inputs. Tool schemas are
 * flat objects of primitives with enums and bounds, so a full validator is not
 * needed in the browser bundle. `scripts/validate-phase0.mjs` still validates
 * the same schemas with Ajv to keep them honest.
 */
export type LiteProperty = Readonly<{
  type: "string" | "integer" | "number" | "boolean";
  description?: string;
  enum?: readonly (string | number)[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}>;

export type LiteObjectSchema = Readonly<{
  type: "object";
  description?: string;
  properties: Readonly<Record<string, LiteProperty>>;
  required?: readonly string[];
  additionalProperties: false;
}>;

export type LiteValidation =
  | Readonly<{ ok: true; value: Record<string, string | number | boolean> }>
  | Readonly<{ ok: false; reason: string }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateLite(schema: LiteObjectSchema, input: unknown): LiteValidation {
  const value = input === undefined ? {} : input;
  if (!isRecord(value)) return { ok: false, reason: "input must be an object" };
  for (const key of Object.keys(value)) {
    if (!(key in schema.properties)) return { ok: false, reason: `unexpected property: ${key}` };
  }
  for (const key of schema.required ?? []) {
    if (!(key in value)) return { ok: false, reason: `missing property: ${key}` };
  }
  const out: Record<string, string | number | boolean> = {};
  for (const [key, property] of Object.entries(schema.properties)) {
    if (!(key in value)) continue;
    const candidate = value[key];
    switch (property.type) {
      case "string":
        if (typeof candidate !== "string") return { ok: false, reason: `${key} must be a string` };
        if (property.minLength !== undefined && candidate.length < property.minLength) return { ok: false, reason: `${key} too short` };
        if (property.maxLength !== undefined && candidate.length > property.maxLength) return { ok: false, reason: `${key} too long` };
        if (property.pattern && !new RegExp(property.pattern).test(candidate)) return { ok: false, reason: `${key} has an invalid format` };
        break;
      case "integer":
        if (!Number.isInteger(candidate)) return { ok: false, reason: `${key} must be an integer` };
        break;
      case "number":
        if (typeof candidate !== "number" || !Number.isFinite(candidate)) return { ok: false, reason: `${key} must be a number` };
        break;
      case "boolean":
        if (typeof candidate !== "boolean") return { ok: false, reason: `${key} must be a boolean` };
        break;
    }
    if ((property.type === "integer" || property.type === "number") && typeof candidate === "number") {
      if (property.minimum !== undefined && candidate < property.minimum) return { ok: false, reason: `${key} below minimum` };
      if (property.maximum !== undefined && candidate > property.maximum) return { ok: false, reason: `${key} above maximum` };
    }
    if (property.enum && !property.enum.includes(candidate as string | number)) {
      return { ok: false, reason: `${key} must be one of: ${property.enum.join(", ")}` };
    }
    out[key] = candidate as string | number | boolean;
  }
  return { ok: true, value: out };
}
