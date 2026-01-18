SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `todo_item` (
  `id` bigint(20) NOT NULL COMMENT '代办ID',
  `user_id` bigint(20) NOT NULL COMMENT '用户ID',
  `content` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '内容',
  `done` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否完成',
  `sort_index` int NOT NULL DEFAULT 0 COMMENT '排序值（越大越靠前）',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `update_time` datetime NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_todo_item_user_done_sort` (`user_id`, `done`, `sort_index`) USING BTREE,
  KEY `idx_todo_item_user_time` (`user_id`, `create_time`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=Dynamic;

