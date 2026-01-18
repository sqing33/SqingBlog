"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Check, ChevronDown, Grid3x3, ListTodo, Lock, Pencil, Plus, Trash2, Unlock } from "lucide-react";
import GridLayout, {
  Layout,
  LayoutItem,
  getCompactor,
  useContainerWidth,
} from "react-grid-layout";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import styles from "@/components/notes/notesGrid.module.css";

type StickyNote = {
  id: string;
  user_id: string;
  tags: string[];
  content: string;
  grid_x: number;
  grid_y: number;
  grid_w: number;
  grid_h: number;
  layout_locked: boolean;
  create_time: string;
  update_time: string;
};

type NotesResponse = {
  ok: boolean;
  message?: string;
  data?: {
    notes: StickyNote[];
    tags: string[];
  };
};

type TodoItem = {
  id: string;
  user_id: string;
  content: string;
  done: boolean;
  sort_index: number;
  create_time: string;
  update_time: string;
};

type TodoListResponse = {
  ok: boolean;
  message?: string;
  data?: {
    items: TodoItem[];
  };
};

type TodoCreateResponse = {
  ok: boolean;
  message?: string;
  data?: {
    item: TodoItem;
  };
};

function formatMySqlDateTime(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  // "YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DD HH:mm"
  return raw.slice(0, 16);
}

const COLS = 48;
const DEFAULT_GRID_GAP_PX = 12;
const DEFAULT_GRID_PADDING_PX = 12;
const NARROW_GRID_GAP_PX = 8;
const NARROW_GRID_PADDING_PX = 8;
const AUTO_SAVE_ERROR_COOLDOWN_MS = 2000;

const NO_COMPACT_PREVENT_COLLISION = getCompactor(null, false, true);

const NOTE_CARD_PADDING_PX = 16;
const NOTE_HEADER_ROW_MIN_HEIGHT_PX = 28;
const NOTE_HEADER_GAP_PX = 12;
const NOTE_EXTRA_HEIGHT_PX = 8;

function gridUnitsFromPx(px: number, unitPx: number, gapPx: number) {
  const safePx = Math.max(0, px);
  const safeUnitPx = Math.max(1, unitPx);
  const safeGapPx = Math.max(0, gapPx);
  const step = safeUnitPx + safeGapPx;
  return Math.max(1, Math.ceil((safePx + safeGapPx) / step));
}

function gridItemPxFromUnits(units: number, unitPx: number, gapPx: number) {
  const safeUnits = Math.max(1, units);
  const safeUnitPx = Math.max(1, unitPx);
  const safeGapPx = Math.max(0, gapPx);
  return safeUnits * safeUnitPx + (safeUnits - 1) * safeGapPx;
}

function computeStickyNoteGridSize({
  content,
  cols,
  cellPx,
  insetPx,
}: {
  content: string;
  cols: number;
  cellPx: number;
  insetPx: number;
}) {
  const scale = cols / 24;
  const fallbackW = Math.max(1, Math.min(cols, Math.round(8 * scale)));
  const fallbackH = Math.max(1, Math.round(8 * scale));
  const fallback = { w: fallbackW, h: fallbackH };
  const trimmed = content.trim();
  if (!trimmed) return fallback;
  if (typeof document === "undefined") return fallback;

  const minW = Math.max(1, Math.min(cols, Math.round(4 * scale)));
  const maxW = Math.max(minW, cols);
  const widePenaltyThreshold = Math.max(minW, Math.min(cols, Math.round(16 * scale)));

  const measureEl = document.createElement("div");
  measureEl.className = "whitespace-pre-wrap break-words text-sm leading-relaxed";
  measureEl.style.position = "absolute";
  measureEl.style.visibility = "hidden";
  measureEl.style.pointerEvents = "none";
  measureEl.style.left = "0";
  measureEl.style.top = "0";
  measureEl.style.height = "auto";
  measureEl.textContent = trimmed;

  document.body.appendChild(measureEl);
  try {
    let best: { w: number; h: number; score: number } | null = null;

    for (let w = minW; w <= maxW; w += 1) {
      const itemWidthPx = gridItemPxFromUnits(w, cellPx, 0);
      const contentWidthPx = Math.max(
        24,
        itemWidthPx - insetPx * 2 - NOTE_CARD_PADDING_PX * 2
      );
      measureEl.style.width = `${contentWidthPx}px`;

      const contentHeightPx = Math.ceil(measureEl.getBoundingClientRect().height);
      const requiredHeightPx =
        insetPx * 2 +
        NOTE_CARD_PADDING_PX * 2 +
        NOTE_HEADER_ROW_MIN_HEIGHT_PX +
        NOTE_HEADER_GAP_PX +
        contentHeightPx +
        NOTE_EXTRA_HEIGHT_PX;
      const h = Math.min(200, gridUnitsFromPx(requiredHeightPx, cellPx, 0));

      const area = w * h;
      const tallPenalty = Math.max(0, h - w) * 2;
      const widePenalty = Math.max(0, w - widePenaltyThreshold);
      const score = area + tallPenalty + widePenalty;

      if (!best || score < best.score) best = { w, h, score };
    }

    return best ? { w: best.w, h: best.h } : fallback;
  } finally {
    measureEl.remove();
  }
}

function mergeTagsWithDraft(selected: string[], draft: string) {
  const unique: string[] = [];

  const pushTag = (raw: string) => {
    if (unique.length >= 3) return;
    const tag = String(raw ?? "").trim();
    if (!tag) return;
    if (tag.length > 64) return;
    if (unique.includes(tag)) return;
    unique.push(tag);
  };

  for (const tag of selected) pushTag(tag);

  const parts = String(draft ?? "")
    .split(/[,，]/g)
    .map((t) => t.trim())
    .filter(Boolean);
  for (const part of parts) pushTag(part);

  return unique;
}

function splitTagForDisplay(tag: string) {
  const raw = String(tag ?? "").trim();
  if (!raw) return [];
  return raw
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function StickyNotesBoard({
  defaultView = "notes",
}: {
  defaultView?: "notes" | "todo";
}) {
  const [activeView, setActiveView] = useState<"notes" | "todo">(defaultView);

  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todoLoading, setTodoLoading] = useState(true);
  const [todoError, setTodoError] = useState<string | null>(null);
  const [todoFilter, setTodoFilter] = useState<"active" | "done" | "all">("all");
  const [todoDraft, setTodoDraft] = useState("");
  const [todoSubmitting, setTodoSubmitting] = useState(false);
  const [todoBusyIds, setTodoBusyIds] = useState<Record<string, boolean>>({});
  const [todoCreateOpen, setTodoCreateOpen] = useState(false);

  const [layoutEditing, setLayoutEditing] = useState(false);
  const [tagFilter, setTagFilter] = useState("__ALL__");
  const [noteSearch, setNoteSearch] = useState("");

  const [open, setOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [contentInput, setContentInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);
  const [lockingNoteIds, setLockingNoteIds] = useState<Record<string, boolean>>({});
  const [lastAutoSaveErrorAt, setLastAutoSaveErrorAt] = useState(0);

  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTagDraft, setEditTagDraft] = useState("");
  const [editSelectedTags, setEditSelectedTags] = useState<string[]>([]);
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const canSubmit = useMemo(() => {
    const tagsToSubmit = mergeTagsWithDraft(selectedTags, tagDraft);
    return tagsToSubmit.length > 0 && Boolean(contentInput.trim()) && !submitting;
  }, [selectedTags, tagDraft, contentInput, submitting]);

  const { width: containerWidth, containerRef, measureWidth } = useContainerWidth({
    initialWidth: 1280,
  });

  const [lastMeasuredWidth, setLastMeasuredWidth] = useState(containerWidth);

  useEffect(() => {
    const onResize = () => {
      requestAnimationFrame(() => {
        measureWidth();
      });
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measureWidth]);

  useEffect(() => {
    if (containerWidth > 0) setLastMeasuredWidth(containerWidth);
  }, [containerWidth]);

  useEffect(() => {
    if (activeView !== "notes") return;
    requestAnimationFrame(() => {
      measureWidth();
    });
  }, [activeView, measureWidth]);

  const editingNote = useMemo(() => {
    if (!editingId) return null;
    return notes.find((note) => note.id === editingId) ?? null;
  }, [editingId, notes]);

  const loadNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notes", { cache: "no-store" });
      if (res.status === 401) {
        setUnauthorized(true);
        setNotes([]);
        setTags([]);
        return;
      }

      const json = (await res.json()) as NotesResponse;
      if (!json?.ok) {
        setError(json?.message || "加载失败");
        setNotes([]);
        setTags([]);
        return;
      }

      setUnauthorized(false);
      setNotes(json.data?.notes ?? []);
      setTags(json.data?.tags ?? []);
    } catch {
      setError("加载失败");
      setNotes([]);
      setTags([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTodos = async () => {
    setTodoLoading(true);
    setTodoError(null);
    try {
      const res = await fetch("/api/todo", { cache: "no-store" });
      if (res.status === 401) {
        setUnauthorized(true);
        setTodos([]);
        return;
      }

      const json = (await res.json()) as TodoListResponse;
      if (!json?.ok) {
        setTodoError(json?.message || "加载失败");
        setTodos([]);
        return;
      }

      setTodos(json.data?.items ?? []);
    } catch {
      setTodoError("加载失败");
      setTodos([]);
    } finally {
      setTodoLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadNotes();
      await loadTodos();
    })();
  }, []);

  useEffect(() => {
    if (tagFilter === "__ALL__") return;
    if (!tags.length) return;
    if (!tags.includes(tagFilter)) setTagFilter("__ALL__");
  }, [tags, tagFilter]);

  const resetForm = () => {
    setTagDraft("");
    setSelectedTags([]);
    setContentInput("");
  };

  const closeEditor = () => {
    setEditOpen(false);
    setEditingId(null);
    setEditTagDraft("");
    setEditSelectedTags([]);
    setEditContent("");
  };

  const openEditor = (note: StickyNote) => {
    setEditingId(note.id);
    setEditSelectedTags((note.tags || []).filter(Boolean).slice(0, 3));
    setEditContent(note.content ?? "");
    setEditTagDraft("");
    setEditOpen(true);
  };

  const gridMetrics = useMemo(() => {
    const safeContainerWidth = Math.max(
      0,
      containerWidth > 0 ? containerWidth : lastMeasuredWidth
    );
    const isNarrow = safeContainerWidth < 640;
    const gap = isNarrow ? NARROW_GRID_GAP_PX : DEFAULT_GRID_GAP_PX;
    const padding = isNarrow ? NARROW_GRID_PADDING_PX : DEFAULT_GRID_PADDING_PX;

    const width = safeContainerWidth;

    const innerWidth = Math.max(0, width - padding * 2);
    const colWidth = Math.max(1, innerWidth / COLS);
    const rowHeight = colWidth;
    const colStep = colWidth;
    const rowStep = rowHeight;
    const noteInset = gap / 2;

    return {
      width,
      colWidth,
      gap,
      noteInset,
      padding,
      rowHeight,
      styleVars: {
        ["--notes-row-height" as never]: `${rowHeight}px`,
        ["--notes-col-step" as never]: `${colStep}px`,
        ["--notes-row-step" as never]: `${rowStep}px`,
        ["--notes-padding-x" as never]: `${padding}px`,
        ["--notes-padding-y" as never]: `${padding}px`,
      } as CSSProperties,
    };
  }, [containerWidth, lastMeasuredWidth]);

  const shouldStackNotes = gridMetrics.width < 640;

  useEffect(() => {
    if (!shouldStackNotes) return;
    if (!layoutEditing) return;
    setLayoutEditing(false);
  }, [layoutEditing, shouldStackNotes]);

  const getLiveNoteSizingMetrics = () => {
    const el = containerRef.current;
    const liveWidth = Number(el?.getBoundingClientRect().width ?? 0);
    const width = liveWidth > 0 ? liveWidth : gridMetrics.width;
    const isNarrow = width < 640;
    const gap = isNarrow ? NARROW_GRID_GAP_PX : DEFAULT_GRID_GAP_PX;
    const padding = isNarrow ? NARROW_GRID_PADDING_PX : DEFAULT_GRID_PADDING_PX;
    const innerWidth = Math.max(0, width - padding * 2);
    const colWidth = Math.max(1, innerWidth / COLS);
    const noteInset = gap / 2;
    return { colWidth, noteInset };
  };

  const patchNoteGrid = async (noteId: string, grid: { x: number; y: number; w: number; h: number }) => {
    const res = await fetch(`/api/notes/${noteId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ grid }),
    });

    if (res.status === 401) {
      setUnauthorized(true);
      return { ok: false, unauthorized: true as const };
    }

    const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    return { ok: Boolean(json?.ok), message: json?.message };
  };

  const patchNoteLocked = async (noteId: string, locked: boolean) => {
    const res = await fetch(`/api/notes/${noteId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locked }),
    });

    if (res.status === 401) {
      setUnauthorized(true);
      return { ok: false, unauthorized: true as const };
    }

    const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    return { ok: Boolean(json?.ok), message: json?.message };
  };

  const toggleNoteLocked = async (note: StickyNote) => {
    if (!layoutEditing) return;
    const noteId = note.id;
    if (lockingNoteIds[noteId]) return;

    const prevLocked = Boolean(note.layout_locked);
    const nextLocked = !prevLocked;

    setLockingNoteIds((prev) => ({ ...prev, [noteId]: true }));
    setNotes((prev) =>
      prev.map((item) => (item.id === noteId ? { ...item, layout_locked: nextLocked } : item))
    );

    try {
      const result = await patchNoteLocked(noteId, nextLocked);
      if (result.unauthorized) {
        setNotes((prev) =>
          prev.map((item) => (item.id === noteId ? { ...item, layout_locked: prevLocked } : item))
        );
        return;
      }
      if (!result.ok) {
        setNotes((prev) =>
          prev.map((item) => (item.id === noteId ? { ...item, layout_locked: prevLocked } : item))
        );
        setError(result.message || "锁定失败");
      }
    } catch {
      setNotes((prev) =>
        prev.map((item) => (item.id === noteId ? { ...item, layout_locked: prevLocked } : item))
      );
      setError("锁定失败");
    } finally {
      setLockingNoteIds((prev) => {
        const next = { ...prev };
        delete next[noteId];
        return next;
      });
    }
  };

  const persistLayout = async (noteId: string, item: LayoutItem) => {
    setSavingLayout(true);
    try {
      const result = await patchNoteGrid(noteId, { x: item.x, y: item.y, w: item.w, h: item.h });
      if (result.unauthorized) return;
      if (!result.ok) {
        const now = Date.now();
        if (now - lastAutoSaveErrorAt > AUTO_SAVE_ERROR_COOLDOWN_MS) {
          setLastAutoSaveErrorAt(now);
          setError(result.message || "布局保存失败");
        }
      }
    } catch {
      const now = Date.now();
      if (now - lastAutoSaveErrorAt > AUTO_SAVE_ERROR_COOLDOWN_MS) {
        setLastAutoSaveErrorAt(now);
        setError("布局保存失败");
      }
    } finally {
      setSavingLayout(false);
    }
  };

  const autoArrangeLayout = async () => {
    if (savingLayout) return;
    if (loading) return;
    if (!notes.length) return;

    setError(null);
    setSavingLayout(true);

    const liveMetrics = getLiveNoteSizingMetrics();

    const clampW = (w: number, x: number) => Math.max(1, Math.min(COLS - x, Number.isFinite(w) ? w : 1));
    const clampH = (h: number) => Math.max(1, Number.isFinite(h) ? h : 1);
    const clampX = (x: number) => Math.max(0, Math.min(COLS - 1, Number.isFinite(x) ? x : 0));
    const clampY = (y: number) => Math.max(0, Number.isFinite(y) ? y : 0);

    const collides = (
      a: { x: number; y: number; w: number; h: number },
      b: { x: number; y: number; w: number; h: number }
    ) => {
      if (a.x + a.w <= b.x) return false;
      if (a.x >= b.x + b.w) return false;
      if (a.y + a.h <= b.y) return false;
      if (a.y >= b.y + b.h) return false;
      return true;
    };

    const findFirstFit = (
      placed: Array<{ x: number; y: number; w: number; h: number }>,
      w: number,
      h: number
    ) => {
      const safeW = Math.max(1, Math.min(COLS, w));
      const safeH = Math.max(1, h);
      const maxY = placed.reduce((max, item) => Math.max(max, item.y + item.h), 0);

      const candidates = new Set<number>([0]);
      for (const item of placed) {
        candidates.add(item.y);
        candidates.add(item.y + item.h);
      }
      const sortedCandidates = Array.from(candidates)
        .filter((value) => Number.isFinite(value) && value >= 0)
        .sort((a, b) => a - b);

      for (const candidateY of sortedCandidates) {
        for (let x = 0; x <= COLS - safeW; x += 1) {
          const probe = { x, y: candidateY, w: safeW, h: safeH };
          if (!placed.some((item) => collides(probe, item))) return { x, y: candidateY };
        }
      }
      return { x: 0, y: maxY };
    };

    const normalized = notes.map((note) => {
      const x = clampX(note.grid_x);
      const y = clampY(note.grid_y);
      const locked = Boolean(note.layout_locked);

      if (locked) {
        const w = clampW(note.grid_w, x);
        const h = clampH(note.grid_h);
        return { id: note.id, locked, x, y, w, h };
      }

      const computed = computeStickyNoteGridSize({
        content: note.content ?? "",
        cols: COLS,
        cellPx: liveMetrics.colWidth,
        insetPx: liveMetrics.noteInset,
      });
      const w = Math.max(1, Math.min(COLS, Number.isFinite(computed.w) ? computed.w : 1));
      const h = clampH(Number.isFinite(computed.h) ? computed.h : 1);
      return { id: note.id, locked, x, y, w, h };
    });

    const lockedItems = normalized
      .filter((item) => item.locked)
      .sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
      });

    const unlockedItems = normalized
      .filter((item) => !item.locked)
      .sort((a, b) => {
        const areaDiff = b.w * b.h - a.w * a.h;
        if (areaDiff !== 0) return areaDiff;
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
      });

    const placed: Array<{ id: string; locked: boolean; x: number; y: number; w: number; h: number }> = [];
    for (const item of lockedItems) placed.push(item);
    for (const item of unlockedItems) {
      const position = findFirstFit(placed, item.w, item.h);
      placed.push({ ...item, x: position.x, y: position.y });
    }

    const positions = new Map<string, { locked: boolean; x: number; y: number; w: number; h: number }>();
    for (const item of placed) {
      positions.set(item.id, { locked: item.locked, x: item.x, y: item.y, w: item.w, h: item.h });
    }

    setNotes((prev) =>
      prev.map((note) => {
        const next = positions.get(note.id);
        if (!next) return note;
        if (next.locked) return note;
        return {
          ...note,
          grid_x: next.x,
          grid_y: next.y,
          grid_w: next.w,
          grid_h: next.h,
        };
      })
    );

    try {
      for (const item of placed) {
        if (item.locked) continue;
        const result = await patchNoteGrid(item.id, { x: item.x, y: item.y, w: item.w, h: item.h });
        if (result.unauthorized) return;
        if (!result.ok) {
          const now = Date.now();
          if (now - lastAutoSaveErrorAt > AUTO_SAVE_ERROR_COOLDOWN_MS) {
            setLastAutoSaveErrorAt(now);
            setError(result.message || "布局保存失败");
          }
        }
      }
    } catch {
      const now = Date.now();
      if (now - lastAutoSaveErrorAt > AUTO_SAVE_ERROR_COOLDOWN_MS) {
        setLastAutoSaveErrorAt(now);
        setError("布局保存失败");
      }
    } finally {
      setSavingLayout(false);
    }
  };

  const visibleNotes = useMemo(() => {
    if (layoutEditing) return notes;
    const search = noteSearch.trim().toLowerCase();
    const matchesSearch = (note: StickyNote) => {
      if (!search) return true;
      return String(note.content ?? "").toLowerCase().includes(search);
    };

    if (tagFilter === "__ALL__") return notes.filter(matchesSearch);
    return notes.filter((note) => (note.tags || []).filter(Boolean).includes(tagFilter)).filter(matchesSearch);
  }, [layoutEditing, notes, noteSearch, tagFilter]);

  const visibleLayout = useMemo<Layout>(() => {
    const fallbackSize = Math.max(1, Math.round(COLS / 6));
    const getSize = (note: StickyNote) => {
      const w = Math.max(
        1,
        Math.min(COLS, Number.isFinite(note.grid_w) ? note.grid_w : fallbackSize)
      );
      const h = Math.max(1, Number.isFinite(note.grid_h) ? note.grid_h : fallbackSize);
      return { w, h };
    };

    const collides = (
      a: { x: number; y: number; w: number; h: number },
      b: { x: number; y: number; w: number; h: number }
    ) => {
      if (a.x + a.w <= b.x) return false;
      if (a.x >= b.x + b.w) return false;
      if (a.y + a.h <= b.y) return false;
      if (a.y >= b.y + b.h) return false;
      return true;
    };

    const findFirstFit = (
      placed: Array<{ x: number; y: number; w: number; h: number }>,
      w: number,
      h: number
    ) => {
      const safeW = Math.max(1, Math.min(COLS, w));
      const safeH = Math.max(1, h);
      const maxY = placed.reduce((max, item) => Math.max(max, item.y + item.h), 0);

      const candidates = new Set<number>([0]);
      for (const item of placed) {
        candidates.add(item.y);
        candidates.add(item.y + item.h);
      }
      const sortedCandidates = Array.from(candidates)
        .filter((value) => Number.isFinite(value) && value >= 0)
        .sort((a, b) => a - b);

      for (const candidateY of sortedCandidates) {
        for (let x = 0; x <= COLS - safeW; x += 1) {
          const probe = { x, y: candidateY, w: safeW, h: safeH };
          if (!placed.some((item) => collides(probe, item))) return { x, y: candidateY };
        }
      }
      return { x: 0, y: maxY };
    };

    if (!layoutEditing && (tagFilter !== "__ALL__" || Boolean(noteSearch.trim()))) {
      const placed: LayoutItem[] = [];
      for (const note of visibleNotes) {
        const { w, h } = getSize(note);
        const pos = findFirstFit(placed, w, h);
        placed.push({ i: note.id, x: pos.x, y: pos.y, w, h, isResizable: false, isDraggable: false });
      }
      return placed;
    }

    return visibleNotes.map((note) => {
      const { w, h } = getSize(note);
      return {
        i: note.id,
        x: Number.isFinite(note.grid_x) ? note.grid_x : 0,
        y: Number.isFinite(note.grid_y) ? note.grid_y : 0,
        w,
        h,
        isResizable: layoutEditing && !Boolean(note.layout_locked),
        isDraggable: layoutEditing,
      };
    });
  }, [layoutEditing, noteSearch, tagFilter, visibleNotes]);

  const orderedNotes = useMemo(() => {
    const layoutById = new Map<string, { x: number; y: number }>();
    for (const item of visibleLayout) {
      layoutById.set(String(item.i), { x: item.x, y: item.y });
    }
    return [...visibleNotes].sort((a, b) => {
      const aLayout = layoutById.get(a.id);
      const bLayout = layoutById.get(b.id);
      const ay = aLayout?.y ?? 0;
      const by = bLayout?.y ?? 0;
      if (ay !== by) return ay - by;
      const ax = aLayout?.x ?? 0;
      const bx = bLayout?.x ?? 0;
      if (ax !== bx) return ax - bx;
      return String(a.create_time ?? "").localeCompare(String(b.create_time ?? ""));
    });
  }, [visibleLayout, visibleNotes]);

  const renderNoteCard = (note: StickyNote, options?: { insetPx?: number; className?: string }) => {
    const noteTags = (note.tags || []).filter(Boolean);
    const isLocking = Boolean(lockingNoteIds[note.id]);
    const displayTags = (() => {
      const parts: string[] = [];
      for (const tag of noteTags) {
        const segments = splitTagForDisplay(tag);
        if (!segments.length) continue;
        for (const segment of segments) {
          if (parts.length >= 3) break;
          if (parts.includes(segment)) continue;
          parts.push(segment);
        }
        if (parts.length >= 3) break;
      }
      if (parts.length) return parts;
      return noteTags.slice(0, 3);
    })();
    const insetPx = options?.insetPx;
    const className = options?.className ?? "";

    return (
      <div
        key={note.id}
        className={`min-w-0 min-h-0 ${className}`}
        style={insetPx ? { padding: `${insetPx}px` } : undefined}
      >
        <Card className="h-full w-full overflow-hidden rounded-2xl border bg-white/70 !gap-0 !py-0 shadow-sm backdrop-blur">
          <div className="flex h-full flex-col p-4">
            <div
              className={`sticky-note-drag-handle flex shrink-0 items-center justify-between gap-3 text-xs text-muted-foreground ${
                layoutEditing ? "cursor-move select-none" : ""
              }`}
            >
              <span
                className="min-w-0 flex-1 truncate"
                title={String(note.create_time || "")}
              >
                {formatMySqlDateTime(note.create_time)}
              </span>
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex min-w-0 items-center justify-end gap-1 overflow-hidden">
                  {displayTags.map((tag) => (
                    <Badge
                      key={`${note.id}-${tag}`}
                      variant="secondary"
                      className="max-w-[120px] truncate rounded-full"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
                {layoutEditing ? (
                  <button
                    type="button"
                    tabIndex={-1}
                    disabled={savingLayout || isLocking}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => void toggleNoteLocked(note)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-white/70 text-muted-foreground shadow-sm hover:bg-white hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                    aria-label={
                      note.layout_locked
                        ? "解锁便签（允许自动整理）"
                        : "锁定便签（不受自动整理影响）"
                    }
                  >
                    {note.layout_locked ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5" />
                    )}
                  </button>
                ) : null}
                <button
                  type="button"
                  tabIndex={layoutEditing ? -1 : 0}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => openEditor(note)}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-white/70 text-muted-foreground shadow-sm hover:bg-white hover:text-foreground"
                  aria-label="编辑便签"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="mt-3 min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
              {note.content}
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const todoCounts = useMemo(() => {
    const total = todos.length;
    const done = todos.filter((item) => item.done).length;
    return { total, done, active: total - done };
  }, [todos]);

  const visibleTodos = useMemo(() => {
    if (todoFilter === "all") return todos;
    if (todoFilter === "done") return todos.filter((item) => item.done);
    return todos.filter((item) => !item.done);
  }, [todoFilter, todos]);

  const sortTodos = (items: TodoItem[]) => {
    return [...items].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const sortDiff = Number(b.sort_index ?? 0) - Number(a.sort_index ?? 0);
      if (sortDiff !== 0) return sortDiff;
      return String(b.create_time ?? "").localeCompare(String(a.create_time ?? ""));
    });
  };

  const createTodo = async () => {
    if (todoSubmitting) return false;
    const content = todoDraft.trim();
    if (!content) return false;

    setTodoSubmitting(true);
    setTodoError(null);
    try {
      const res = await fetch("/api/todo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.status === 401) {
        setUnauthorized(true);
        return false;
      }

      const json = (await res.json().catch(() => null)) as TodoCreateResponse | null;
      if (!json?.ok) {
        setTodoError(json?.message || "创建失败");
        return false;
      }

      const created = json.data?.item;
      if (created) {
        setTodos((prev) => sortTodos([created, ...prev.filter((item) => item.id !== created.id)]));
      }
      setTodoDraft("");
      return Boolean(created);
    } catch {
      setTodoError("创建失败");
      return false;
    } finally {
      setTodoSubmitting(false);
    }
  };

  const toggleTodoDone = async (item: TodoItem) => {
    const todoId = item.id;
    if (!todoId) return;
    if (todoBusyIds[todoId]) return;

    const prevDone = Boolean(item.done);
    const nextDone = !prevDone;

    setTodoBusyIds((prev) => ({ ...prev, [todoId]: true }));
    setTodos((prev) =>
      sortTodos(prev.map((t) => (t.id === todoId ? { ...t, done: nextDone } : t)))
    );

    try {
      const res = await fetch(`/api/todo/${todoId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ done: nextDone }),
      });

      if (res.status === 401) {
        setUnauthorized(true);
        setTodos((prev) =>
          sortTodos(prev.map((t) => (t.id === todoId ? { ...t, done: prevDone } : t)))
        );
        return;
      }

      const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!json?.ok) {
        setTodoError(json?.message || "更新失败");
        setTodos((prev) =>
          sortTodos(prev.map((t) => (t.id === todoId ? { ...t, done: prevDone } : t)))
        );
      }
    } catch {
      setTodoError("更新失败");
      setTodos((prev) =>
        sortTodos(prev.map((t) => (t.id === todoId ? { ...t, done: prevDone } : t)))
      );
    } finally {
      setTodoBusyIds((prev) => {
        const next = { ...prev };
        delete next[todoId];
        return next;
      });
    }
  };

  const deleteTodo = async (item: TodoItem) => {
    const todoId = item.id;
    if (!todoId) return;
    if (todoBusyIds[todoId]) return;

    setTodoBusyIds((prev) => ({ ...prev, [todoId]: true }));
    setTodoError(null);
    setTodos((prev) => prev.filter((t) => t.id !== todoId));

    try {
      const res = await fetch(`/api/todo/${todoId}`, { method: "DELETE" });
      if (res.status === 401) {
        setUnauthorized(true);
        return;
      }

      const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!json?.ok) {
        setTodoError(json?.message || "删除失败");
        setTodos((prev) => sortTodos([item, ...prev]));
      }
    } catch {
      setTodoError("删除失败");
      setTodos((prev) => sortTodos([item, ...prev]));
    } finally {
      setTodoBusyIds((prev) => {
        const next = { ...prev };
        delete next[todoId];
        return next;
      });
    }
  };

  const addTags = (raw: string) => {
    const parts = raw
      .split(/[,，]/g)
      .map((t) => t.trim())
      .filter(Boolean);
    if (!parts.length) return;

    setError(null);
    setSelectedTags((prev) => {
      const next = [...prev];
      for (const part of parts) {
        if (next.length >= 3) break;
        if (part.length > 64) continue;
        if (next.includes(part)) continue;
        next.push(part);
      }
      return next;
    });
    setTagDraft("");
  };

  const removeTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  const addEditTags = (raw: string) => {
    const parts = raw
      .split(/[,，]/g)
      .map((t) => t.trim())
      .filter(Boolean);
    if (!parts.length) return;

    setError(null);
    setEditSelectedTags((prev) => {
      const next = [...prev];
      for (const part of parts) {
        if (next.length >= 3) break;
        if (part.length > 64) continue;
        if (next.includes(part)) continue;
        next.push(part);
      }
      return next;
    });
    setEditTagDraft("");
  };

  const removeEditTag = (tag: string) => {
    setEditSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  const saveEdit = async () => {
    if (!editingNote) return;
    const nextTags = mergeTagsWithDraft(editSelectedTags, editTagDraft);
    if (!nextTags.length) {
      setError("请至少保留 1 个标签");
      return;
    }
    const trimmedContent = editContent.trim();
    if (!trimmedContent) {
      setError("请输入内容");
      return;
    }

    setEditSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/notes/${editingNote.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tags: nextTags,
          content: trimmedContent,
        }),
      });

      if (res.status === 401) {
        setUnauthorized(true);
        closeEditor();
        return;
      }

      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!json?.ok) {
        setError(json?.message || "更新失败");
        return;
      }

      closeEditor();
      await loadNotes();
    } catch {
      setError("更新失败");
    } finally {
      setEditSaving(false);
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const liveMetrics = getLiveNoteSizingMetrics();
      const tagsToSubmit = mergeTagsWithDraft(selectedTags, tagDraft);
      const trimmedContent = contentInput.trim();
      const grid = computeStickyNoteGridSize({
        content: trimmedContent,
        cols: COLS,
        cellPx: liveMetrics.colWidth,
        insetPx: liveMetrics.noteInset,
      });
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tags: tagsToSubmit, content: trimmedContent, grid }),
      });

      if (res.status === 401) {
        setUnauthorized(true);
        setOpen(false);
        return;
      }

      const json = (await res.json()) as NotesResponse;
      if (!json?.ok) {
        setError(json?.message || "创建失败");
        return;
      }

      setOpen(false);
      resetForm();
      await loadNotes();
    } catch {
      setError("创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden px-4 pb-0 pt-0 sm:px-6 sm:pb-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute top-28 -left-48 h-[360px] w-[360px] rounded-full bg-yellow-400/10 blur-3xl" />
        <div className="absolute top-72 -right-48 h-[420px] w-[420px] rounded-full bg-rose-400/10 blur-3xl" />
      </div>

      <div className="sticky top-0 z-40 hidden lg:block">
        <div className="h-14">
          <div className="grid h-full min-w-0 items-center gap-4 rounded-2xl border bg-white/70 px-4 shadow-sm backdrop-blur sm:px-6 lg:grid-cols-[minmax(0,_1fr)_360px]">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Button asChild size="sm" variant="ghost" className="-ml-2 h-9 px-2">
                  <Link href="/blog">← 返回博客</Link>
                </Button>
                <div className="min-w-0 truncate text-base font-semibold tracking-tight">
                  便签
                </div>
              </div>

              <div
                className="hidden items-center justify-end gap-2 lg:flex"
              >
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void autoArrangeLayout()}
                  disabled={!layoutEditing || savingLayout || loading || !notes.length}
                  aria-hidden={!layoutEditing}
                  tabIndex={layoutEditing ? 0 : -1}
                  className={layoutEditing ? "" : "invisible pointer-events-none"}
                >
                  自动整理
                </Button>

                <Button
                  size="sm"
                  variant={layoutEditing ? "secondary" : "outline"}
                  onClick={() =>
                    setLayoutEditing((v) => {
                      const next = !v;
                      if (next) setActiveView("notes");
                      return next;
                    })
                  }
                >
                  <Grid3x3 className="mr-2 h-4 w-4" />
                  {layoutEditing ? "完成布局" : "编辑布局"}
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    setActiveView("notes");
                    setOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  新增便签
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={unauthorized || layoutEditing}
                      className="w-36 justify-between"
                    >
                      <span className="min-w-0 flex-1 truncate text-left">
                        {tagFilter === "__ALL__" ? "全部标签" : tagFilter}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[220px]">
                    <DropdownMenuLabel>标签筛选</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={tagFilter} onValueChange={setTagFilter}>
                      <DropdownMenuRadioItem value="__ALL__">全部标签</DropdownMenuRadioItem>
                      {tags.map((tag) => (
                        <DropdownMenuRadioItem key={tag} value={tag}>
                          {tag}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Input
                  placeholder="搜索便签…"
                  value={noteSearch}
                  onChange={(e) => setNoteSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Escape") return;
                    setNoteSearch("");
                  }}
                  disabled={unauthorized || layoutEditing}
                  className="w-44"
                />
              </div>

              <div className="hidden items-center gap-2 lg:hidden">
                <Button
                  size="icon-sm"
                  variant={activeView === "notes" ? "secondary" : "outline"}
                  disabled={unauthorized || layoutEditing}
                  onClick={() => setActiveView("notes")}
                  aria-label="切换到便签"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant={activeView === "todo" ? "secondary" : "outline"}
                  disabled={unauthorized || layoutEditing}
                  onClick={() => setActiveView("todo")}
                  aria-label="切换到代办"
                >
                  <ListTodo className="h-4 w-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="outline"
                  disabled={unauthorized}
                  onClick={() => {
                    if (activeView === "todo") {
                      setTodoCreateOpen(true);
                      return;
                    }
                    setOpen(true);
                  }}
                  aria-label={activeView === "todo" ? "新增代办" : "新增便签"}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="hidden min-w-0 items-center justify-between gap-3 lg:flex lg:pl-5">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex items-center gap-2 text-base font-semibold tracking-tight">
                  <ListTodo className="h-4 w-4 text-muted-foreground" />
                  代办
                </div>
                <div className="min-w-0 truncate whitespace-nowrap text-xs text-muted-foreground">
                  待 {todoCounts.active} · 完 {todoCounts.done} · 总 {todoCounts.total}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" size="sm" variant="outline">
                      {todoFilter === "all" ? "全部" : todoFilter === "active" ? "待办" : "已完成"}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[180px]">
                    <DropdownMenuLabel>代办筛选</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={todoFilter} onValueChange={(v) => setTodoFilter(v as typeof todoFilter)}>
                      <DropdownMenuRadioItem value="all">全部</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="active">待办</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="done">已完成</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  disabled={unauthorized || todoLoading}
                  onClick={() => {
                    setActiveView("todo");
                    setTodoCreateOpen(true);
                  }}
                  aria-label="新增代办"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-40 lg:hidden">
        <div className="h-12">
          <div className="flex h-full items-center rounded-2xl border bg-white/70 px-3 shadow-sm backdrop-blur">
            <Input
              placeholder="搜索便签…"
              value={noteSearch}
              onChange={(e) => setNoteSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Escape") return;
                setNoteSearch("");
              }}
              disabled={unauthorized || layoutEditing}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {unauthorized ? (
        <Card className="mt-6 w-full rounded-2xl border bg-white/70 p-6 shadow-sm backdrop-blur">
          <div className="space-y-2">
            <div className="text-base font-medium">需要登录</div>
            <div className="text-sm text-muted-foreground">
              便签是你的个人内容，请先登录后再使用。
            </div>
            <div className="pt-2">
              <Button asChild>
                <Link href="/login">去登录</Link>
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {!unauthorized ? (
        <>
          {error ? (
            <div className="mt-6 rounded-2xl border bg-white/70 px-4 py-3 text-sm text-rose-600 shadow-sm backdrop-blur">
              {error}
            </div>
          ) : null}

          {layoutEditing ? (
            <div className="mt-4 flex items-center justify-end text-xs text-muted-foreground">
              {savingLayout ? "布局保存中…" : "提示：拖拽便签顶部移动，右下角拖动可调整大小"}
            </div>
          ) : null}

          <div className="mt-4 hidden items-center gap-2 lg:hidden">
            <Button
              type="button"
              size="sm"
              variant={activeView === "notes" ? "secondary" : "outline"}
              onClick={() => setActiveView("notes")}
              disabled={layoutEditing}
            >
              <Grid3x3 className="h-4 w-4" />
              便签
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeView === "todo" ? "secondary" : "outline"}
              onClick={() => setActiveView("todo")}
              disabled={layoutEditing}
            >
              <ListTodo className="h-4 w-4" />
              代办
            </Button>
          </div>

          <div className="mt-3 grid flex-1 min-h-0 gap-4 lg:grid-cols-[minmax(0,_1fr)_360px]">
            <div
              ref={containerRef}
              className={`${activeView === "notes" ? "" : "hidden"} lg:block min-w-0 min-h-0`}
            >
              <div className="h-full min-h-0 overflow-y-auto">
                {loading ? (
                  <Card className="w-full rounded-2xl border bg-white/70 p-6 text-sm text-muted-foreground shadow-sm backdrop-blur">
                    加载中…
                  </Card>
                ) : visibleNotes.length ? (
                  <div
                    className={`min-h-full w-full rounded-3xl border bg-white/40 shadow-sm backdrop-blur ${
                      layoutEditing ? styles.notesGrid : ""
                    }`}
                    style={layoutEditing ? gridMetrics.styleVars : undefined}
                  >
                    {shouldStackNotes ? (
                      <div className="space-y-3 p-2">
                        {orderedNotes.map((note) => renderNoteCard(note))}
                      </div>
                    ) : (
                      <GridLayout
                        width={gridMetrics.width}
                        className="relative"
                        layout={visibleLayout}
                        gridConfig={{
                          cols: COLS,
                          rowHeight: gridMetrics.rowHeight,
                          margin: [0, 0],
                          containerPadding: [gridMetrics.padding, gridMetrics.padding],
                          maxRows: Number.POSITIVE_INFINITY,
                        }}
                        dragConfig={{
                          enabled: layoutEditing,
                          handle: ".sticky-note-drag-handle",
                        }}
                        resizeConfig={{ enabled: layoutEditing, handles: ["se"] }}
                        compactor={NO_COMPACT_PREVENT_COLLISION}
                        onDragStop={(
                          _layout: Layout,
                          _oldItem: LayoutItem | null,
                          newItem: LayoutItem | null
                        ) => {
                          if (!newItem) return;
                          if (!layoutEditing) return;
                          setNotes((prev) =>
                            prev.map((note) =>
                              note.id === newItem.i
                                ? {
                                    ...note,
                                    grid_x: newItem.x,
                                    grid_y: newItem.y,
                                    grid_w: newItem.w,
                                    grid_h: newItem.h,
                                  }
                                : note
                            )
                          );
                          void persistLayout(String(newItem.i), newItem);
                        }}
                        onResizeStop={(
                          _layout: Layout,
                          _oldItem: LayoutItem | null,
                          newItem: LayoutItem | null
                        ) => {
                          if (!newItem) return;
                          if (!layoutEditing) return;
                          setNotes((prev) =>
                            prev.map((note) =>
                              note.id === newItem.i
                                ? {
                                    ...note,
                                    grid_x: newItem.x,
                                    grid_y: newItem.y,
                                    grid_w: newItem.w,
                                    grid_h: newItem.h,
                                  }
                                : note
                            )
                          );
                          void persistLayout(String(newItem.i), newItem);
                        }}
                      >
                        {visibleNotes.map((note) =>
                          renderNoteCard(note, { insetPx: gridMetrics.noteInset })
                        )}
                      </GridLayout>
                    )}
                  </div>
                ) : (
                  <Card className="w-full rounded-2xl border bg-white/70 p-6 text-sm text-muted-foreground shadow-sm backdrop-blur">
                    {tagFilter === "__ALL__"
                      ? "还没有便签，点右上角「新增便签」创建第一条吧。"
                      : "没有符合当前标签筛选的便签。"}
                  </Card>
                )}
              </div>
            </div>

            <div className={`${activeView === "todo" ? "" : "hidden"} lg:block min-w-0 min-h-0`}>
              <Card className="flex h-full w-full flex-col gap-4 rounded-2xl border bg-white/70 p-5 shadow-sm backdrop-blur">
                {todoError ? (
                  <div className="rounded-2xl border bg-white/70 px-4 py-3 text-sm text-rose-600 shadow-sm backdrop-blur">
                    {todoError}
                  </div>
                ) : null}

                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                  {todoLoading ? (
                    <div className="rounded-2xl border bg-white/60 px-4 py-3 text-sm text-muted-foreground">
                      加载中…
                    </div>
                  ) : visibleTodos.length ? (
                    visibleTodos.map((item) => {
                      const isBusy = Boolean(todoBusyIds[item.id]);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-2xl border bg-white/60 px-3 py-2 shadow-sm"
                        >
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void toggleTodoDone(item)}
                            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border shadow-sm ${
                              item.done
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "bg-white/70 text-muted-foreground hover:bg-white hover:text-foreground"
                            } disabled:pointer-events-none disabled:opacity-50`}
                            aria-label={item.done ? "标记为未完成" : "标记为已完成"}
                          >
                            {item.done ? <Check className="h-4 w-4" /> : null}
                          </button>

                          <div className="min-w-0 flex-1 py-0.5">
                            <div className="text-xs text-muted-foreground">
                              {formatMySqlDateTime(item.create_time)}
                            </div>
                            <div
                              className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${
                                item.done ? "text-muted-foreground line-through" : "text-foreground"
                              }`}
                            >
                              {item.content}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void deleteTodo(item)}
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-white/70 text-muted-foreground shadow-sm hover:bg-white hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                            aria-label="删除代办"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border bg-white/60 px-4 py-3 text-sm text-muted-foreground">
                      {todoFilter === "active"
                        ? "还没有代办，点右上角「+」新增一条吧。"
                        : todoFilter === "done"
                        ? "还没有已完成的代办。"
                        : "还没有代办，点右上角「+」新增一条吧。"}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </>
      ) : null}

      {!unauthorized ? (
        <div className="sticky bottom-[env(safe-area-inset-bottom)] z-40 mt-4 lg:hidden">
          <div className="rounded-2xl border bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <Button asChild size="sm" variant="ghost" className="h-9 px-2">
                <Link href="/blog">← 返回</Link>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={activeView === "notes" ? "secondary" : "outline"}
                  disabled={layoutEditing}
                  onClick={() => setActiveView("notes")}
                >
                  <Grid3x3 className="mr-1.5 h-4 w-4" />
                  便签
                </Button>
                <Button
                  size="sm"
                  variant={activeView === "todo" ? "secondary" : "outline"}
                  disabled={layoutEditing}
                  onClick={() => setActiveView("todo")}
                >
                  <ListTodo className="mr-1.5 h-4 w-4" />
                  代办
                </Button>
              </div>

              <Button
                size="sm"
                variant="outline"
                disabled={unauthorized}
                onClick={() => {
                  if (activeView === "todo") {
                    setTodoCreateOpen(true);
                    return;
                  }
                  setOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                {activeView === "todo" ? "新增代办" : "新增便签"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>新增便签</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="sticky-note-tag">标签（最多 3 个）</Label>
              <div className="flex flex-col gap-2">
                <div className="flex min-w-0 flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="gap-1 rounded-full pr-1"
                    >
                      <span className="max-w-[200px] truncate">{tag}</span>
                      <button
                        type="button"
                        className="rounded-full px-1 text-muted-foreground hover:text-foreground"
                        onClick={() => removeTag(tag)}
                        aria-label={`移除标签 ${tag}`}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>

                <div className="flex min-w-0 gap-2">
                  <Input
                    id="sticky-note-tag"
                    placeholder="输入后回车添加（支持逗号分隔）"
                    value={tagDraft}
                    list="sticky-note-tags"
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      if (selectedTags.length >= 3) {
                        setError("最多只能添加 3 个标签");
                        return;
                      }
                      addTags(tagDraft);
                    }}
                    autoComplete="off"
                    disabled={selectedTags.length >= 3}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (selectedTags.length >= 3) {
                        setError("最多只能添加 3 个标签");
                        return;
                      }
                      addTags(tagDraft);
                    }}
                    disabled={!tagDraft.trim() || selectedTags.length >= 3}
                  >
                    添加
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sticky-note-content">内容</Label>
              <Textarea
                id="sticky-note-content"
                placeholder="写点什么…"
                value={contentInput}
                onChange={(e) => setContentInput(e.target.value)}
                className="min-h-[160px] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setOpen(false);
                }}
                disabled={submitting}
              >
                取消
              </Button>
              <Button type="button" onClick={submit} disabled={!canSubmit}>
                {submitting ? "创建中…" : "创建便签"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeEditor();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑便签</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label>标签（最多 3 个）</Label>
              <div className="flex flex-col gap-2">
                <div className="flex min-w-0 flex-wrap gap-2">
                  {editSelectedTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="gap-1 rounded-full pr-1"
                    >
                      <span className="max-w-[200px] truncate">{tag}</span>
                      <button
                        type="button"
                        className="rounded-full px-1 text-muted-foreground hover:text-foreground"
                        onClick={() => removeEditTag(tag)}
                        aria-label={`移除标签 ${tag}`}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>

                <div className="flex min-w-0 gap-2">
                  <Input
                    placeholder="输入后回车添加（支持逗号分隔）"
                    value={editTagDraft}
                    list="sticky-note-tags"
                    onChange={(e) => setEditTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      if (editSelectedTags.length >= 3) {
                        setError("最多只能添加 3 个标签");
                        return;
                      }
                      addEditTags(editTagDraft);
                    }}
                    autoComplete="off"
                    disabled={editSelectedTags.length >= 3}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (editSelectedTags.length >= 3) {
                        setError("最多只能添加 3 个标签");
                        return;
                      }
                      addEditTags(editTagDraft);
                    }}
                    disabled={!editTagDraft.trim() || editSelectedTags.length >= 3}
                  >
                    添加
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sticky-note-edit-content">内容</Label>
              <Textarea
                id="sticky-note-edit-content"
                placeholder="写点什么…"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[220px] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={closeEditor}
                disabled={editSaving}
              >
                取消
              </Button>
              <Button type="button" onClick={saveEdit} disabled={editSaving || !editingNote}>
                {editSaving ? "保存中…" : "保存"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={todoCreateOpen}
        onOpenChange={(nextOpen) => {
          setTodoCreateOpen(nextOpen);
          if (!nextOpen) setTodoError(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新增代办</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="todo-content">内容</Label>
              <Input
                id="todo-content"
                placeholder="写一条代办…"
                value={todoDraft}
                onChange={(e) => setTodoDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  if (e.nativeEvent.isComposing) return;
                  e.preventDefault();
                  void (async () => {
                    const ok = await createTodo();
                    if (ok) setTodoCreateOpen(false);
                  })();
                }}
                autoComplete="off"
                autoFocus
                disabled={todoSubmitting}
              />
              <div className="text-xs text-muted-foreground">
                回车创建，Esc 关闭。
              </div>
            </div>

            {todoError ? (
              <div className="rounded-2xl border bg-white/70 px-4 py-3 text-sm text-rose-600 shadow-sm backdrop-blur">
                {todoError}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setTodoCreateOpen(false)}
                disabled={todoSubmitting}
              >
                取消
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void (async () => {
                    const ok = await createTodo();
                    if (ok) setTodoCreateOpen(false);
                  })();
                }}
                disabled={todoSubmitting || !todoDraft.trim()}
              >
                {todoSubmitting ? "创建中…" : "创建代办"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <datalist id="sticky-note-tags">
        {tags.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>
    </div>
  );
}
