SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `sticky_note` (
  `id` bigint(20) NOT NULL COMMENT '便签ID',
  `user_id` bigint(20) NOT NULL COMMENT '用户ID',
  `tag` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '标签',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '内容',
  `grid_x` int NOT NULL DEFAULT 0 COMMENT '网格列（x）',
  `grid_y` int NOT NULL DEFAULT 0 COMMENT '网格行（y）',
  `grid_w` int NOT NULL DEFAULT 8 COMMENT '网格宽度（w，单位=列）',
  `grid_h` int NOT NULL DEFAULT 8 COMMENT '网格高度（h，单位=行）',
  `layout_locked` tinyint(1) NOT NULL DEFAULT 0 COMMENT '锁定布局（自动整理时不移动/不改尺寸）',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `update_time` datetime NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_sticky_note_user_time` (`user_id`, `create_time`) USING BTREE,
  KEY `idx_sticky_note_user_tag` (`user_id`, `tag`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=Dynamic;
