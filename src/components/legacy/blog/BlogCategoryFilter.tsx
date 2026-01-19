"use client";

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

  return (
    <section className="panel panel--aside aside-filter glass-card" aria-label="分类筛选">
      <div className="panel__header">
        <h3 className="panel__title">分类筛选</h3>
        <span className="panel__hint">可多选</span>
      </div>

      <div className="filter-card__categories">
        <div
          className={[
            "filter-category-item",
            selected.length === 0 ? "filter-category-item--active" : "",
          ].join(" ")}
          onClick={onReset}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onReset();
          }}
        >
          全部
        </div>
        {selectable.map((cat) => (
          <div
            key={cat.value}
            className={[
              "filter-category-item",
              selected.includes(cat.value) ? "filter-category-item--active" : "",
            ].join(" ")}
            onClick={() => onToggle(cat.value)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onToggle(cat.value);
            }}
            title={cat.label}
          >
            {cat.label}
          </div>
        ))}
      </div>
    </section>
  );
}

