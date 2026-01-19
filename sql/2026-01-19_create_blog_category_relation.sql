CREATE TABLE IF NOT EXISTS `blog_category_relation` (
  `blog_id` varchar(255) NOT NULL COMMENT '博客ID',
  `category_name` varchar(64) NOT NULL COMMENT '分类名称',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  PRIMARY KEY (`blog_id`, `category_name`),
  KEY `idx_category_name` (`category_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='博客分类关联表';