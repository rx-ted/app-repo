CREATE TABLE `discoveries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`logo` text,
	`description` text,
	`category` text DEFAULT 'other',
	`status` text DEFAULT 'active',
	`email` text,
	`sort_order` integer DEFAULT 0,
	`fail_count` integer DEFAULT 0,
	`last_checked_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
DROP TABLE `friendLinks`;