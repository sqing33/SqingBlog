CREATE TABLE IF NOT EXISTS `blog_category` (
  `name` varchar(64) NOT NULL COMMENT '分类名称',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `blog_category` (`name`, `create_time`)
VALUES
  ('分享', NOW()),
  ('娱乐', NOW()),
  ('杂谈', NOW());
