CREATE TABLE `generated_beats` (
	`hash` text PRIMARY KEY NOT NULL,
	`language` text NOT NULL,
	`template_id` text NOT NULL,
	`text` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `generated_beats_created_at_idx` ON `generated_beats` (`created_at`);