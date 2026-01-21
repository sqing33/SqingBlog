SET NAMES utf8mb4;

ALTER TABLE `blog`
  ADD COLUMN `is_pinned` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否置顶',
  ADD COLUMN `pinned_time` datetime NULL COMMENT '置顶时间';

CREATE INDEX `idx_blog_pinned_sort` ON `blog` (`is_pinned`, `pinned_time`, `create_time`);
