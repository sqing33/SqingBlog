SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `user_comment_like` (
  `user_id` bigint(20) NOT NULL COMMENT '用户ID',
  `comment_id` bigint(20) NOT NULL COMMENT '评论ID',
  `create_time` datetime NOT NULL COMMENT '点赞时间',
  PRIMARY KEY (`user_id`, `comment_id`) USING BTREE,
  KEY `idx_user_comment_like_comment` (`comment_id`) USING BTREE,
  KEY `idx_user_comment_like_user_time` (`user_id`, `create_time`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=Dynamic COMMENT='用户评论点赞表';

