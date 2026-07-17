CREATE TABLE `diagnosis_rate_limits` (
	`client_hash` text PRIMARY KEY NOT NULL,
	`window_start` integer NOT NULL,
	`request_count` integer DEFAULT 1 NOT NULL
);
