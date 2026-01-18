SET NAMES utf8mb4;

-- 说明：
-- 旧实现使用 24 列网格（grid_x/y/w/h），新实现升级为 48 列网格（更细一倍）。
-- 为了保持现有便签的视觉尺寸不变，需要把存量数据整体放大 2 倍。
--
-- 注意：此脚本仅应执行一次。

UPDATE `sticky_note`
SET
  `grid_x` = `grid_x` * 2,
  `grid_y` = `grid_y` * 2,
  `grid_w` = `grid_w` * 2,
  `grid_h` = `grid_h` * 2;

ALTER TABLE `sticky_note`
  MODIFY COLUMN `grid_w` int NOT NULL DEFAULT 16 COMMENT '网格宽度（w，单位=列）';

ALTER TABLE `sticky_note`
  MODIFY COLUMN `grid_h` int NOT NULL DEFAULT 16 COMMENT '网格高度（h，单位=行）';

