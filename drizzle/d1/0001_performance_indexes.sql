CREATE INDEX IF NOT EXISTS idx_post_core_status_created_id ON postCore(status, created_at, id);
CREATE INDEX IF NOT EXISTS idx_post_core_status_published_at ON postCore(status, published_at);
CREATE INDEX IF NOT EXISTS idx_post_core_user_status_created ON postCore(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_post_tag_mappings_tag_post ON postTagMappings(tag_id, post_id);
CREATE INDEX IF NOT EXISTS idx_post_category_mappings_category_post ON postCategoryMappings(category_id, post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_post_status_created ON comments(post_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent_status_created ON comments(parent_id, status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_comment_likes_user_comment ON commentLikes(user_id, comment_id);
