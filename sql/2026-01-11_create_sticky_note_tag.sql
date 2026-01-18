SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `sticky_note_tag` (
  `note_id` bigint(20) NOT NULL COMMENT '便签ID',
  `user_id` bigint(20) NOT NULL COMMENT '用户ID',
  `tag` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '标签',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  PRIMARY KEY (`note_id`, `tag`) USING BTREE,
  KEY `idx_sticky_note_tag_user_tag` (`user_id`, `tag`) USING BTREE,
  KEY `idx_sticky_note_tag_user_note` (`user_id`, `note_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=Dynamic;

-- 迁移旧数据：把 sticky_note.tag 写入 sticky_note_tag
INSERT IGNORE INTO `sticky_note_tag` (`note_id`, `user_id`, `tag`, `create_time`)
SELECT `id`, `user_id`, `tag`, `create_time`
FROM `sticky_note`;

