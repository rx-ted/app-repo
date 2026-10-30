CREATE TABLE `blogAggregates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`published_post_count` integer DEFAULT 0 NOT NULL,
	`tag_count` integer DEFAULT 0 NOT NULL,
	`category_count` integer DEFAULT 0 NOT NULL,
	`total_views` integer DEFAULT 0 NOT NULL,
	`total_likes` integer DEFAULT 0 NOT NULL,
	`total_comments` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
