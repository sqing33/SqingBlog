"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

type ApiResponse<T> = { ok?: boolean; data?: T; message?: string };

type CategoryOption = { label: string; value: string };

const fallbackCategories: CategoryOption[] = [
  { label: "分享", value: "分享" },
  { label: "娱乐", value: "娱乐" },
  { label: "杂谈", value: "杂谈" },
];

type CategorySelectorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCategories: string[];
  onSelectedCategoriesChange: (categories: string[]) => void;
};

export function CategorySelector({
  open,
  onOpenChange,
  selectedCategories,
  onSelectedCategoriesChange,
}: CategorySelectorProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryOption[]>(fallbackCategories);
  const [newCategory, setNewCategory] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/blog/categories", { cache: "no-store" })
      .then((r) => r.json())
      .then((json: ApiResponse<CategoryOption[]>) => {
        if (cancelled) return;
        const list = Array.isArray(json?.data)
          ? json.data
              .map((c) => ({
                label: String(c?.label ?? c?.value ?? "").trim(),
                value: String(c?.value ?? c?.label ?? "").trim(),
              }))
              .filter((c) => c.label && c.value)
          : [];
        if (!list.length) return;
        setCategories(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleCategory = (value: string) => {
    if (selectedCategories.includes(value)) {
      onSelectedCategoriesChange(selectedCategories.filter((c) => c !== value));
    } else {
      onSelectedCategoriesChange([...selectedCategories, value]);
    }
  };

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name || creatingCategory) return;

    const exists = categories.find((c) => c.value === name);
    if (exists) {
      toggleCategory(exists.value);
      setNewCategory("");
      return;
    }

    setCreatingCategory(true);
    try {
      const res = await fetch("/api/blog/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = (await res.json()) as ApiResponse<CategoryOption>;
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok || !json?.ok) throw new Error(json?.message || "CREATE_CATEGORY_FAILED");
      const created = json.data;
      const value = String(created?.value ?? name).trim() || name;
      const label = String(created?.label ?? name).trim() || name;
      setCategories((prev) => {
        const next = [...prev, { label, value }];
        const unique = new Map<string, CategoryOption>();
        for (const item of next) unique.set(item.value, item);
        return Array.from(unique.values()).sort((a, b) => a.label.localeCompare(b.label, "zh"));
      });
      toggleCategory(value);
      setNewCategory("");
    } catch {
      // ignore error
    } finally {
      setCreatingCategory(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>选择类型</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">已选择的类型</Label>
            <div className="flex min-h-[40px] flex-wrap gap-2 rounded-md border p-2">
              {selectedCategories.length === 0 ? (
                <span className="text-muted-foreground text-sm">暂未选择类型</span>
              ) : (
                selectedCategories.map((cat) => (
                  <Badge
                    key={cat}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {cat}
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className="hover:bg-accent/50 rounded-sm p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">可选类型</Label>
            <div className="flex max-h-[200px] flex-wrap gap-2 overflow-y-auto rounded-md border p-2">
              {categories.map((cat) => (
                <Badge
                  key={cat.value}
                  variant={selectedCategories.includes(cat.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleCategory(cat.value)}
                >
                  {cat.label}
                </Badge>
              ))}
              {categories.length === 0 && (
                <span className="text-muted-foreground text-sm">暂无可用类型</span>
              )}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">添加新类型</Label>
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="输入新类型名称"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCategory();
                  }
                }}
                disabled={creatingCategory}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addCategory}
                disabled={!newCategory.trim() || creatingCategory}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}