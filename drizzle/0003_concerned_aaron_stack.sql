CREATE TABLE `subagents` (
	`id` text PRIMARY KEY NOT NULL,
	`attempt_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text,
	`parent_id` text,
	`team_name` text,
	`status` text NOT NULL,
	`error` text,
	`started_at` integer,
	`completed_at` integer,
	`duration_ms` integer,
	`depth` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_subagents_attempt` ON `subagents` (`attempt_id`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `last_model` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `use_worktree` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `worktree_path` text;