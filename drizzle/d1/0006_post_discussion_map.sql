CREATE TABLE `postDiscussionMaps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer,
	`post_slug` text NOT NULL,
	`github_owner` text NOT NULL,
	`github_repo` text NOT NULL,
	`discussion_number` integer NOT NULL,
	`discussion_node_id` text,
	`discussion_url` text,
	`category_slug` text,
	`scope` text DEFAULT 'post' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `postCore`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pdm_scope_slug ON postDiscussionMaps(scope, post_slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pdm_gh ON postDiscussionMaps(github_owner, github_repo, discussion_number);
