-- =========================================
-- 评论线程表
-- =========================================
CREATE TABLE
    `post_comment_threads` (
        `id` BIGINT NOT NULL AUTO_INCREMENT,
        -- 关联文章
        `post_id` BIGINT NOT NULL,
        -- 评论提供方
        `provider` ENUM ('internal', 'github-discussion', 'disqus') NOT NULL DEFAULT 'github-discussion',
        -- 评论渲染器
        `renderer` ENUM ('native', 'giscus') NOT NULL DEFAULT 'giscus',
        -- GitHub 仓库
        `repo_owner` VARCHAR(100) DEFAULT NULL,
        `repo_name` VARCHAR(100) DEFAULT NULL,
        -- GitHub Discussion
        `discussion_number` INT DEFAULT NULL,
        `discussion_node_id` VARCHAR(255) DEFAULT NULL,
        -- 外部线程 ID
        `external_thread_id` VARCHAR(255) DEFAULT NULL,
        -- 分类
        `discussion_category` VARCHAR(100) DEFAULT NULL,
        `discussion_category_id` VARCHAR(20) DEFAULT NULL,
        -- label
        `discussion_label` VARCHAR(100) DEFAULT NULL,
        `discussion_label_id` VARCHAR(20) DEFAULT NULL,
        -- Discussion 格式
        `discussion_format` ENUM ('discussion', 'question', 'announcement') DEFAULT 'discussion',
        -- Discussion 状态
        `status` ENUM (
            'pending',
            'active',
            'closed',
            'disabled',
            'failed'
        ) NOT NULL DEFAULT 'pending',
        -- 关闭原因
        `close_reason` VARCHAR(50) DEFAULT NULL,
        -- 同步状态
        `sync_status` ENUM ('idle', 'syncing', 'error') NOT NULL DEFAULT 'idle',
        -- 评论统计缓存
        `comment_count` INT NOT NULL DEFAULT 0,
        -- 最新评论
        `last_comment_at` DATETIME DEFAULT NULL,
        `last_comment_user` VARCHAR(100) DEFAULT NULL,
        `last_comment_url` VARCHAR(500) DEFAULT NULL,
        -- 同步时间
        `last_synced_at` DATETIME DEFAULT NULL,
        -- 错误信息
        `last_error` TEXT DEFAULT NULL,
        -- 时间
        `created_at` DATETIME NOT NULL,
        `updated_at` DATETIME NOT NULL,
        `closed_at` DATETIME DEFAULT NULL,
        PRIMARY KEY (`id`),
        UNIQUE KEY `uk_post_provider` (`post_id`, `provider`),
        KEY `idx_provider_status` (`provider`, `status`),
        KEY `idx_discussion_number` (`discussion_number`),
        KEY `idx_sync_status` (`sync_status`),
        KEY `idx_last_comment_at` (`last_comment_at`),
        CONSTRAINT `post_comment_threads_post_id_post_core_id_fk` FOREIGN KEY (`post_id`) REFERENCES `post_core` (`id`) ON DELETE CASCADE
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;