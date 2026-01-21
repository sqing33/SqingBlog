"use client";

import { Filter, RotateCcw } from "lucide-react";

type CategoryOption = { label: string; value: string };

export function BlogCategoryFilter({
  categories,
  selected,
  onToggle,
  onReset,
}: {
  categories: CategoryOption[];
  selected: string[];
  onToggle: (value: string) => void;
  onReset: () => void;
}) {
  const selectable = categories.filter((c) => c.value !== "0");
  const selectedCount = selected.length;

  return (
    <section className="panel panel--aside aside-filter glass-card" aria-label="分类筛选">
      <div className="aside-filter__header">
        <div className="aside-filter__title">
          <span className="aside-filter__icon" aria-hidden="true">
            <Filter />
          </span>
          <h3 className="aside-filter__title-text">分类筛选</h3>
        </div>

        <div className="aside-filter__actions">
          <span className="aside-filter__hint">可多选</span>
          <button
            type="button"
            className="aside-filter__reset"
            onClick={onReset}
            disabled={selectedCount === 0}
            title={selectedCount ? `清空已选（${selectedCount}）` : "已是全部"}
          >
            <RotateCcw />
            <span>重置</span>
          </button>
        </div>
      </div>

      <div className="filter-card__categories">
        <button
          type="button"
          className={[
            "category-tag",
            selected.length === 0 ? "category-tag--active" : "",
          ].join(" ")}
          onClick={onReset}
          aria-pressed={selected.length === 0}
        >
          全部
        </button>
        {selectable.map((cat) => (
          <button
            type="button"
            key={cat.value}
            className={[
              "category-tag",
              selected.includes(cat.value) ? "category-tag--active" : "",
            ].join(" ")}
            onClick={() => onToggle(cat.value)}
            title={cat.label}
            aria-pressed={selected.includes(cat.value)}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </section>
  );
}
