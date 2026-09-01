import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const diagnosticTraces = sqliteTable(
  "diagnostic_traces",
  {
    id: text("id").primaryKey(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    taxonomyIdsJson: text("taxonomy_ids_json").notNull(),
    status: text("status").notNull(),
    artifactKey: text("artifact_key").notNull(),
    fallbackReason: text("fallback_reason"),
    inputFingerprint: text("input_fingerprint").notNull(),
    outputSchemaVersion: text("output_schema_version").notNull(),
  },
  (table) => [index("diagnostic_traces_created_at_idx").on(table.createdAt)],
);

/**
 * Server-produced narration text for generated atom slots, keyed by content
 * hash. The generated-narration route may only speak text found here, so
 * learner input can never reach text-to-speech (D-018, D-019).
 */
export const generatedBeats = sqliteTable(
  "generated_beats",
  {
    hash: text("hash").primaryKey(),
    language: text("language").notNull(),
    templateId: text("template_id").notNull(),
    text: text("text").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("generated_beats_created_at_idx").on(table.createdAt)],
);

export const diagnosisRateLimits = sqliteTable(
  "diagnosis_rate_limits",
  {
    clientHash: text("client_hash").primaryKey(),
    windowStart: integer("window_start").notNull(),
    requestCount: integer("request_count").notNull().default(1),
  },
  (table) => [index("diagnosis_rate_limits_window_idx").on(table.windowStart)],
);
