SET NAMES utf8mb4;

ALTER TABLE `sticky_note`
  ADD COLUMN `grid_x` int NOT NULL DEFAULT 0 COMMENT '网格列（x）';

ALTER TABLE `sticky_note`
  ADD COLUMN `grid_y` int NOT NULL DEFAULT 0 COMMENT '网格行（y）';

ALTER TABLE `sticky_note`
  ADD COLUMN `grid_w` int NOT NULL DEFAULT 8 COMMENT '网格宽度（w，单位=列）';

ALTER TABLE `sticky_note`
  ADD COLUMN `grid_h` int NOT NULL DEFAULT 8 COMMENT '网格高度（h，单位=行）';
