ALTER TABLE `friendLinks` ADD COLUMN `category` text DEFAULT 'other';
ALTER TABLE `friendLinks` ADD COLUMN `status` text DEFAULT 'active';
ALTER TABLE `friendLinks` ADD COLUMN `email` text DEFAULT '';
ALTER TABLE `friendLinks` ADD COLUMN `fail_count` integer DEFAULT 0;
ALTER TABLE `friendLinks` ADD COLUMN `last_checked_at` integer;
--> statement-breakpoint
UPDATE `friendLinks` SET `status` = 'disabled' WHERE `is_active` = 0;
--> statement-breakpoint
ALTER TABLE `friendLinks` DROP COLUMN `is_active`;
