SET NAMES utf8mb4;

ALTER TABLE `sticky_note`
  ADD COLUMN `layout_locked` tinyint(1) NOT NULL DEFAULT 0 COMMENT '锁定布局（自动整理时不移动/不改尺寸）' AFTER `grid_h`;
