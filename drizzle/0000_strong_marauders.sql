CREATE TABLE `diagnostic_traces` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`taxonomy_ids_json` text NOT NULL,
	`status` text NOT NULL,
	`artifact_key` text NOT NULL,
	`fallback_reason` text,
	`input_fingerprint` text NOT NULL,
	`output_schema_version` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `diagnostic_traces_created_at_idx` ON `diagnostic_traces` (`created_at`);