"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

type ApiResponse<T> = { ok?: boolean; data?: T; message?: string };

type WordVariant = "solid" | "outline" | "soft";

type WordItem = {
  id: string;
  text: string;
  x: number;
  y: number;
  rotate: number;
  rotateDelta: number;
  fontSize: number;
  opacity: number;
  color: string;
  fontFamily: string;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  letterSpacing: string;
  variant: WordVariant;
  duration: number;
  delay: number;
  driftX: number;
  driftY: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pickOne<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: T[]) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function segmentTitleToWords(title: string): string[] {
  const raw = (title || "").trim();
  if (!raw) return [];

  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    try {
      const segmenter = new Intl.Segmenter("zh-CN", { granularity: "word" });
      const words: string[] = [];
      for (const item of segmenter.segment(raw)) {
        if (item.isWordLike === false) continue;
        const word = item.segment.trim();
        if (!word) continue;
        words.push(word);
      }
      if (words.length) return words;
    } catch {}
  }

  return raw
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/g)
    .filter(Boolean);
}

type WordStat = {
  text: string;
  count: number;
};

function buildWordStats(titles: string[]): WordStat[] {
  const freq = new Map<string, number>();

  for (const title of titles) {
    for (const rawWord of segmentTitleToWords(title)) {
      const word = rawWord.trim();
      if (!word || word.length > 24) continue;
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }
  }

  return Array.from(freq.entries()).map(([text, count]) => ({ text, count }));
}

function buildWordItems(stats: WordStat[], width: number, height: number) {
  if (!stats.length || width <= 0 || height <= 0) return [];

  const area = width * height;
  const targetCount = clamp(Math.floor(area / 9000), 60, 700);
  const margin = 10;

  const sorted = [...stats].sort((a, b) => b.count - a.count);
  const selected =
    sorted.length <= targetCount
      ? (() => {
          const totalWeight = sorted.reduce((acc, item) => acc + item.count, 0);
          const pickWeighted = () => {
            let cursor = Math.random() * totalWeight;
            for (const item of sorted) {
              cursor -= item.count;
              if (cursor <= 0) return item;
            }
            return sorted[sorted.length - 1]!;
          };

          const filled: WordStat[] = [...sorted];
          while (filled.length < targetCount) filled.push(pickWeighted());
          return shuffle(filled);
        })()
      : (() => {
          const keepTop = Math.max(1, Math.floor(targetCount * 0.65));
          const top = sorted.slice(0, keepTop);
          const rest = shuffle(sorted.slice(keepTop)).slice(0, targetCount - keepTop);
          return shuffle([...top, ...rest]);
        })();

  const counts = selected.map((s) => s.count);
  const maxCount = Math.max(...counts);
  const minCount = Math.min(...counts);
  const denom =
    Math.log(maxCount + 1) - Math.log(minCount + 1) || 1;

  const colors = [
    "#0f172a",
    "#1f2937",
    "#334155",
    "#475569",
    "#1d4ed8",
    "#4338ca",
    "#7c3aed",
    "#be123c",
    "#0f766e",
    "#a16207",
  ] as const;

  const weights = [300, 400, 500, 600, 700] as const;

  const items: WordItem[] = [];
  for (let i = 0; i < selected.length; i += 1) {
    const stat = selected[i];
    const x = randomBetween(margin, Math.max(margin, width - margin));
    const y = randomBetween(margin, Math.max(margin, height - margin));

    const rotateBase = pickOne([
      -90,
      -75,
      -60,
      -45,
      -30,
      -15,
      0,
      15,
      30,
      45,
      60,
      75,
      90,
    ] as const);
    const rotate = rotateBase + randomBetween(-6, 6);
    const rotateDelta = randomBetween(-10, 10);

    const ratio = (Math.log(stat.count + 1) - Math.log(minCount + 1)) / denom;
    const baseFontSize = 14 + ratio * 46;
    const fontSize = Math.round(clamp(baseFontSize + randomBetween(-5, 6), 12, 64));

    const variant = (() => {
      const r = Math.random();
      if (r < 0.22) return "outline";
      if (r < 0.52) return "soft";
      return "solid";
    })();

    const opacity =
      variant === "outline"
        ? randomBetween(0.15, 0.25)
        : variant === "soft"
          ? randomBetween(0.12, 0.22)
          : randomBetween(0.1, 0.2);

    const duration = randomBetween(18, 42);
    const delay = randomBetween(-24, 0);
    const driftX = randomBetween(-42, 42);
    const driftY = randomBetween(-42, 42);

    const fontFamily =
      Math.random() < 0.45 ? "var(--font-title)" : "var(--font-family)";
    const fontWeight = pickOne(weights);
    const fontStyle = Math.random() < 0.18 ? "italic" : "normal";
    const letterSpacing = `${randomBetween(0, 0.08).toFixed(3)}em`;
    const color = pickOne(colors);

    items.push({
      id: `${i}-${stat.text}-${stat.count}-${Math.round(x)}-${Math.round(y)}`,
      text: stat.text,
      x,
      y,
      rotate,
      rotateDelta,
      fontSize,
      opacity,
      color,
      fontFamily,
      fontWeight,
      fontStyle,
      letterSpacing,
      variant,
      duration,
      delay,
      driftX,
      driftY,
    });
  }

  return items;
}

export function BlogTitleWordBackground() {
  const [titles, setTitles] = useState<string[]>([]);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    let raf = 0;
    const apply = () => {
      raf = 0;
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    const onResize = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const res = await fetch("/api/blog/titles", {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = (await res.json()) as ApiResponse<string[]>;
        if (!res.ok || !json?.ok) return;

        const list = Array.isArray(json?.data) ? json.data : [];
        setTitles(list);
      } catch {}
    };

    load();
    return () => controller.abort();
  }, []);

  const stats = useMemo(() => buildWordStats(titles), [titles]);
  const items = useMemo(
    () => buildWordItems(stats, viewport.width, viewport.height),
    [stats, viewport.width, viewport.height]
  );

  if (!items.length) return null;

  return (
    <div className="dora-word-bg" aria-hidden="true">
      {items.map((item) => (
        <span
          key={item.id}
          className={`dora-word-bg__item dora-word-bg__item--${item.variant}`}
          style={
            {
              left: item.x,
              top: item.y,
              fontSize: item.fontSize,
              opacity: item.opacity,
              color: item.variant === "outline" ? "transparent" : item.color,
              fontFamily: item.fontFamily,
              fontWeight: item.fontWeight,
              fontStyle: item.fontStyle,
              letterSpacing: item.letterSpacing,
              ["--dora-rotate" as never]: `${item.rotate}deg`,
              ["--dora-rotate-delta" as never]: `${item.rotateDelta}deg`,
              ["--dora-drift-x" as never]: `${item.driftX}px`,
              ["--dora-drift-y" as never]: `${item.driftY}px`,
              ["--dora-duration" as never]: `${item.duration}s`,
              ["--dora-delay" as never]: `${item.delay}s`,
              ["--dora-outline" as never]: item.color,
            } as CSSProperties
          }
        >
          {item.text}
        </span>
      ))}
    </div>
  );
}
