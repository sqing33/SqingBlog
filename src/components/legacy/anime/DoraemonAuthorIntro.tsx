"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { doraemonAuthorTimeline } from "@/content/doraemonAuthorTimeline";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

function easeInOutCubic(progress: number) {
  const t = clamp(progress, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

type TimelineEvent = { year: string; description: string };
type Photo = { src: string; caption: string };
type Phase = "author" | "movies";
type CombinedEvent = { phase: Phase; index: number } & TimelineEvent;

function getActiveIndex(progress: number, eventsLength: number, segmentSize: number) {
  for (let i = 0; i < eventsLength; i += 1) {
    const displayStart = i * segmentSize * 2;
    const displayEnd = displayStart + segmentSize * 2;
    if (progress >= displayStart && progress < displayEnd) return i;
  }
  return -1;
}

function getLocalJumpProgress(index: number, segmentSize: number) {
  const displayStart = index * segmentSize * 2;
  if (index === 0) return clamp(displayStart + segmentSize * 0.1, 0, 1);
  return clamp(displayStart + segmentSize * 0.5, 0, 1);
}

function getLocalStableProgress(index: number, segmentSize: number) {
  const displayStart = index * segmentSize * 2;
  if (index === 0) return clamp(displayStart, 0, 1);
  return clamp(displayStart + segmentSize * 0.5, 0, 1);
}

function getParagraphFadeOutStartLocal(index: number, segmentSize: number) {
  const displayStart = index * segmentSize * 2;
  const displayEnd = displayStart + segmentSize * 2;
  return clamp(displayEnd - segmentSize * 0.3, 0, 1);
}

function getParagraphFadeInEndLocal(index: number, segmentSize: number) {
  const displayStart = index * segmentSize * 2;
  return clamp(displayStart + segmentSize * 0.3, 0, 1);
}

function getVisibleText(progress: number, segmentSize: number, paragraph: string, paragraphIndex: number) {
  const displayStart = paragraphIndex * segmentSize * 2;
  const displayEnd = displayStart + segmentSize * 2;
  const fadeInEnd = displayStart + segmentSize * 0.3;
  const fadeOutStart = displayEnd - segmentSize * 0.3;

  if (paragraphIndex === 0) {
    if (progress < 0) return paragraph;
    if (progress >= 0 && progress < fadeOutStart) return paragraph;
    if (progress >= fadeOutStart && progress < displayEnd) {
      const p = (progress - fadeOutStart) / (segmentSize * 0.3);
      const charsToRemove = Math.floor(paragraph.length * p);
      return paragraph.slice(0, Math.max(0, paragraph.length - charsToRemove));
    }
    return "";
  }

  if (progress < displayStart) return "";
  if (progress >= displayStart && progress < fadeInEnd) {
    const p = (progress - displayStart) / (segmentSize * 0.3);
    const visibleChars = Math.floor(paragraph.length * p);
    return paragraph.slice(0, visibleChars);
  }
  if (progress >= fadeInEnd && progress < fadeOutStart) return paragraph;
  if (progress >= fadeOutStart && progress < displayEnd) {
    const p = (progress - fadeOutStart) / (segmentSize * 0.3);
    const charsToRemove = Math.floor(paragraph.length * p);
    return paragraph.slice(0, Math.max(0, paragraph.length - charsToRemove));
  }
  return "";
}

function getParagraphOpacity(progress: number, segmentSize: number, paragraphIndex: number) {
  const displayStart = paragraphIndex * segmentSize * 2;
  const displayEnd = displayStart + segmentSize * 2;
  const fadeInEnd = displayStart + segmentSize * 0.2;
  const fadeOutStart = (paragraphIndex + 1) * segmentSize * 2;

  if (paragraphIndex === 0) {
    if (progress < 0) return 1;
    if (progress >= 0 && progress < segmentSize * 0.5) return 1 - progress / (segmentSize * 0.5);
    return 0;
  }

  if (progress < displayStart) return 0;
  if (progress >= displayStart && progress < fadeInEnd) return (progress - displayStart) / (segmentSize * 0.2);
  if (progress >= fadeInEnd && progress < fadeOutStart) return 1;
  if (progress >= fadeOutStart && progress < displayEnd) return 1 - (progress - fadeOutStart) / (segmentSize * 0.7);
  return 0;
}

function getParagraphTransform(progress: number, segmentSize: number, paragraphIndex: number) {
  const displayStart = paragraphIndex * segmentSize * 2;
  const displayEnd = displayStart + segmentSize * 2;
  const fadeInEnd = displayStart + segmentSize * 0.2;
  const fadeOutStart = (paragraphIndex + 1) * segmentSize * 2;

  if (paragraphIndex === 0) {
    if (progress < 0) return "translateY(0)";
    if (progress >= 0 && progress < segmentSize * 0.5) {
      const p = progress / (segmentSize * 0.5);
      return `translateY(${20 * p}px)`;
    }
    return "translateY(20px)";
  }

  if (progress < displayStart) return "translateY(-20px)";
  if (progress >= displayStart && progress < fadeInEnd) {
    const p = (progress - displayStart) / (segmentSize * 0.2);
    return `translateY(${20 * (1 - p)}px)`;
  }
  if (progress >= fadeInEnd && progress < fadeOutStart) return "translateY(0)";
  if (progress >= fadeOutStart && progress < displayEnd) {
    const p = (progress - fadeOutStart) / (segmentSize * 0.7);
    return `translateY(${20 * p}px)`;
  }
  return "translateY(20px)";
}

function getPhotoOpacity(progress: number, segmentSize: number, photoIndex: number) {
  const displayStart = photoIndex * segmentSize * 2;
  const displayEnd = displayStart + segmentSize * 2;
  const fadeInEnd = displayStart + segmentSize * 0.2;
  const fadeOutStart = (photoIndex + 1) * segmentSize * 2;

  if (photoIndex === 0) {
    if (progress < 0) return 1;
    if (progress >= 0 && progress < segmentSize * 0.5) return 1 - progress / (segmentSize * 0.5);
    return 0;
  }

  if (progress < displayStart) return 0;
  if (progress >= displayStart && progress < fadeInEnd) return (progress - displayStart) / (segmentSize * 0.2);
  if (progress >= fadeInEnd && progress < fadeOutStart) return 1;
  if (progress >= fadeOutStart && progress < displayEnd) return 1 - (progress - fadeOutStart) / (segmentSize * 0.7);
  return 0;
}

function getPhotoTransform(progress: number, segmentSize: number, photoIndex: number) {
  const displayStart = photoIndex * segmentSize * 2;
  const displayEnd = displayStart + segmentSize * 2;
  const fadeInEnd = displayStart + segmentSize * 0.2;
  const fadeOutStart = (photoIndex + 1) * segmentSize * 2;

  if (photoIndex === 0) {
    if (progress < 0) return "scale(1) translateY(0)";
    if (progress >= 0 && progress < segmentSize * 0.5) {
      const p = progress / (segmentSize * 0.5);
      const scale = 1 - p * 0.2;
      const translateY = p * 50;
      return `scale(${scale}) translateY(${translateY}px)`;
    }
    return "scale(0.8) translateY(50px)";
  }

  if (progress < displayStart) return "scale(0.8) translateY(-50px)";
  if (progress >= displayStart && progress < fadeInEnd) {
    const p = (progress - displayStart) / (segmentSize * 0.2);
    const scale = 0.8 + p * 0.2;
    const translateY = -50 + p * 50;
    return `scale(${scale}) translateY(${translateY}px)`;
  }
  if (progress >= fadeInEnd && progress < fadeOutStart) return "scale(1) translateY(0)";
  if (progress >= fadeOutStart && progress < displayEnd) {
    const p = (progress - fadeOutStart) / (segmentSize * 0.7);
    const scale = 1 - p * 0.2;
    const translateY = p * 50;
    return `scale(${scale}) translateY(${translateY}px)`;
  }
  return "scale(0.8) translateY(50px)";
}

export function DoraemonAuthorIntro() {
  const authorContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const scrollRafIdRef = useRef<number | null>(null);
  const rawScrollProgressRef = useRef(0);
  const [rawScrollProgress, setRawScrollProgress] = useState(0);
  const displayScrollProgressRef = useRef(0);
  const [displayScrollProgress, setDisplayScrollProgress] = useState(0);

  const transitionRafRef = useRef<number | null>(null);
  const transitionRef = useRef<{
    from: number;
    to: number;
    startTime: number;
    durationMs: number;
    fromProgress: number;
    toProgress: number;
    direction: 1 | -1;
    switchProgress: number;
  } | null>(null);
  const timelineSwitchedRef = useRef(false);

  const [lockedGlobalIndex, setLockedGlobalIndex] = useState(0);
  const lockedGlobalIndexRef = useRef(0);
  const desiredGlobalIndexRef = useRef(0);
  const initializedRef = useRef(false);
  const [timelineActiveGlobalIndex, setTimelineActiveGlobalIndex] = useState(0);
  const timelineActiveGlobalIndexRef = useRef(0);

  const authorParagraphs = useMemo(() => {
    return doraemonAuthorTimeline.map((item) => (item.body || "").replace(/\s*\n+\s*/g, " "));
  }, []);

  const authorPhotos = useMemo<Photo[]>(() => {
    const captions = [
      "1933-1951 年",
      "1969 年连载开始",
      "1979 年动画再开播",
      "1980 年首部剧场版",
      "1996 年逝世",
    ];

    return doraemonAuthorTimeline.map((item, idx) => ({
      src: item.image,
      caption: captions[idx] ?? item.time,
    }));
  }, []);

  const authorTimelineEvents = useMemo<TimelineEvent[]>(() => {
    return doraemonAuthorTimeline.map((item) => ({
      year: (item.time || "").replace(/\s*年\s*$/, ""),
      description: item.title,
    }));
  }, []);

  const movieTimelineEvents = useMemo<TimelineEvent[]>(
    () => [
      { year: "1980-", description: "（占位）剧场版时间轴节点 1" },
      { year: "1990-", description: "（占位）剧场版时间轴节点 2" },
      { year: "2000-", description: "（占位）剧场版时间轴节点 3" },
      { year: "2010-", description: "（占位）剧场版时间轴节点 4" },
      { year: "2020-", description: "（占位）剧场版时间轴节点 5" },
    ],
    []
  );

  const movieParagraphs = useMemo(
    () => [
      "（占位）这里将展示哆啦A梦剧场版的时间轴简介：年份、标题、关键剧情要点与时代背景等。",
      "（占位）剧场版节点内容：后续补充具体电影名称与海报，滚动动效保持与作者阶段一致。",
      "（占位）剧场版节点内容：可以按“旧→新”的顺序排列，并支持点击右侧时间轴跳转。",
      "（占位）剧场版节点内容：可加入票房/主题曲/核心道具等信息，便于读者快速浏览。",
      "（占位）剧场版节点内容：最后可加“持续更新”节点，用于后续新增电影条目。",
    ],
    []
  );

  const moviePhotos = useMemo<Photo[]>(
    () => [
      { src: "/assets/doraemon/author-4.webp", caption: "剧场版（占位）" },
      { src: "/assets/doraemon/author-4.webp", caption: "剧场版（占位）" },
      { src: "/assets/doraemon/author-4.webp", caption: "剧场版（占位）" },
      { src: "/assets/doraemon/author-4.webp", caption: "剧场版（占位）" },
      { src: "/assets/doraemon/author-4.webp", caption: "剧场版（占位）" },
    ],
    []
  );

  const PHASE_BOUNDARY = 0.5;
  const phase: Phase = displayScrollProgress < PHASE_BOUNDARY ? "author" : "movies";
  const phaseProgress = clamp(
    phase === "author"
      ? displayScrollProgress / PHASE_BOUNDARY
      : (displayScrollProgress - PHASE_BOUNDARY) / PHASE_BOUNDARY,
    0,
    1
  );

  const authorSegmentSize = 1 / Math.max(2, authorTimelineEvents.length * 2);
  const movieSegmentSize = 1 / Math.max(2, movieTimelineEvents.length * 2);

  const authorLen = authorTimelineEvents.length;
  const movieLen = movieTimelineEvents.length;
  const hasMovies = movieLen > 0;
  const activeGlobalIndex = timelineActiveGlobalIndex;

  const desiredGlobalIndex = useMemo(() => {
    if (authorLen <= 0 && movieLen <= 0) return 0;
    if (authorLen <= 0) {
      const idx = Math.floor(clamp(rawScrollProgress, 0, 1) * movieLen);
      return clamp(idx, 0, Math.max(0, movieLen - 1));
    }
    if (movieLen <= 0) {
      const idx = Math.floor(clamp(rawScrollProgress, 0, 1) * authorLen);
      return clamp(idx, 0, Math.max(0, authorLen - 1));
    }
    if (!hasMovies || rawScrollProgress < PHASE_BOUNDARY) {
      const p = clamp(rawScrollProgress / PHASE_BOUNDARY, 0, 1);
      const idx = Math.floor(p * authorLen);
      return clamp(idx, 0, Math.max(0, authorLen - 1));
    }
    const p = clamp((rawScrollProgress - PHASE_BOUNDARY) / PHASE_BOUNDARY, 0, 1);
    const idx = Math.floor(p * movieLen);
    return authorLen + clamp(idx, 0, Math.max(0, movieLen - 1));
  }, [authorLen, movieLen, hasMovies, rawScrollProgress]);

  const currentTitle = phase === "author" ? "藤子·F·不二雄" : "哆啦A梦 · 剧场版";
  const currentSubtitle = phase === "author" ? "Fujiko F. Fujio (1933-1996)" : "Doraemon Movies (占位)";

  const currentParagraphs = phase === "author" ? authorParagraphs : movieParagraphs;
  const currentPhotos = phase === "author" ? authorPhotos : moviePhotos;
  const currentSegmentSize = phase === "author" ? authorSegmentSize : movieSegmentSize;

  useEffect(() => {
    const updateScrollProgress = () => {
      const container = authorContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalScroll = rect.height - windowHeight;

      let next = 0;
      if (totalScroll <= 0) {
        next = 1;
      } else if (rect.top > 0) {
        next = 0;
      } else if (rect.bottom < windowHeight) {
        next = 1;
      } else {
        next = clamp(-rect.top / totalScroll, 0, 1);
      }

      if (Math.abs(next - rawScrollProgressRef.current) < 0.0005) return;
      rawScrollProgressRef.current = next;
      setRawScrollProgress(next);
    };

    const onScroll = () => {
      if (scrollRafIdRef.current) return;
      scrollRafIdRef.current = window.requestAnimationFrame(() => {
        scrollRafIdRef.current = null;
        updateScrollProgress();
      });
    };

    updateScrollProgress();

    const container = authorContainerRef.current;
    const scroller = (container?.parentElement as HTMLElement | null) ?? null;
    scrollerRef.current = scroller;

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    scroller?.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      scroller?.removeEventListener("scroll", onScroll);
      if (scrollRafIdRef.current) window.cancelAnimationFrame(scrollRafIdRef.current);
    };
  }, []);

  useEffect(() => {
    desiredGlobalIndexRef.current = desiredGlobalIndex;
  }, [desiredGlobalIndex]);

  const getPhaseForGlobalIndex = (globalIndex: number): Phase => {
    if (authorLen <= 0) return "movies";
    if (movieLen <= 0) return "author";
    return globalIndex < authorLen ? "author" : "movies";
  };

  const getLocalIndex = (phaseValue: Phase, globalIndex: number) => {
    if (phaseValue === "author") return globalIndex;
    return Math.max(0, globalIndex - authorLen);
  };

  const getStableGlobalProgress = (phaseValue: Phase, localIndex: number) => {
    const segmentSize = phaseValue === "author" ? authorSegmentSize : movieSegmentSize;
    const stableLocal = getLocalStableProgress(localIndex, segmentSize);
    if (phaseValue === "author") return stableLocal * PHASE_BOUNDARY;
    return PHASE_BOUNDARY + stableLocal * PHASE_BOUNDARY;
  };

  const snapToGlobalIndex = (targetGlobalIndex: number) => {
    if (transitionRafRef.current) window.cancelAnimationFrame(transitionRafRef.current);
    transitionRafRef.current = null;
    transitionRef.current = null;
    timelineSwitchedRef.current = false;

    lockedGlobalIndexRef.current = targetGlobalIndex;
    setLockedGlobalIndex(targetGlobalIndex);

    timelineActiveGlobalIndexRef.current = targetGlobalIndex;
    setTimelineActiveGlobalIndex(targetGlobalIndex);

    const targetPhase = getPhaseForGlobalIndex(targetGlobalIndex);
    const targetLocal = getLocalIndex(targetPhase, targetGlobalIndex);
    const stable = getStableGlobalProgress(targetPhase, targetLocal);
    displayScrollProgressRef.current = stable;
    setDisplayScrollProgress(stable);
  };

  const startTransition = (fromGlobalIndex: number, toGlobalIndex: number) => {
    const fromPhase = getPhaseForGlobalIndex(fromGlobalIndex);
    const toPhase = getPhaseForGlobalIndex(toGlobalIndex);
    if (fromPhase !== toPhase) {
      snapToGlobalIndex(toGlobalIndex);
      return;
    }

    const direction = toGlobalIndex > fromGlobalIndex ? 1 : -1;
    const segmentSize = fromPhase === "author" ? authorSegmentSize : movieSegmentSize;
    const fromLocal = getLocalIndex(fromPhase, fromGlobalIndex);
    const toLocal = getLocalIndex(toPhase, toGlobalIndex);

    timelineSwitchedRef.current = false;
    timelineActiveGlobalIndexRef.current = fromGlobalIndex;
    setTimelineActiveGlobalIndex(fromGlobalIndex);

    const startLocal =
      direction === 1
        ? fromLocal === 0
          ? getLocalStableProgress(fromLocal, segmentSize)
          : getParagraphFadeOutStartLocal(fromLocal, segmentSize)
        : getParagraphFadeInEndLocal(fromLocal, segmentSize);
    const endLocal = getLocalStableProgress(toLocal, segmentSize);

    const fromDisplayStartLocal = fromLocal * segmentSize * 2;
    const toDisplayStartLocal = toLocal * segmentSize * 2;
    const switchLocal = direction === 1 ? toDisplayStartLocal : fromDisplayStartLocal;

    const startProgress =
      fromPhase === "author"
        ? startLocal * PHASE_BOUNDARY
        : PHASE_BOUNDARY + startLocal * PHASE_BOUNDARY;
    const endProgress =
      fromPhase === "author"
        ? endLocal * PHASE_BOUNDARY
        : PHASE_BOUNDARY + endLocal * PHASE_BOUNDARY;
    const switchProgress =
      fromPhase === "author"
        ? switchLocal * PHASE_BOUNDARY
        : PHASE_BOUNDARY + switchLocal * PHASE_BOUNDARY;

    const fromParagraph = fromPhase === "author" ? authorParagraphs[fromLocal] ?? "" : movieParagraphs[fromLocal] ?? "";
    const toParagraph = fromPhase === "author" ? authorParagraphs[toLocal] ?? "" : movieParagraphs[toLocal] ?? "";
    const maxLen = Math.max(fromParagraph.length, toParagraph.length);
    const durationMs = clamp(
      ((direction === 1 ? 920 : 860) + maxLen * 0.08) * 2,
      760 * 2,
      1400 * 2
    );

    if (transitionRafRef.current) window.cancelAnimationFrame(transitionRafRef.current);
    transitionRef.current = {
      from: fromGlobalIndex,
      to: toGlobalIndex,
      startTime: -1,
      durationMs,
      fromProgress: startProgress,
      toProgress: endProgress,
      direction,
      switchProgress,
    };
    displayScrollProgressRef.current = startProgress;
    setDisplayScrollProgress(startProgress);

    const tick = (now: number) => {
      const transition = transitionRef.current;
      if (!transition) return;
      if (transition.startTime < 0) transition.startTime = now;
      const t = clamp((now - transition.startTime) / transition.durationMs, 0, 1);
      const eased = easeInOutCubic(t);
      const next = lerp(transition.fromProgress, transition.toProgress, eased);
      displayScrollProgressRef.current = next;
      setDisplayScrollProgress(next);

      if (!timelineSwitchedRef.current) {
        const shouldSwitch =
          transition.direction === 1 ? next >= transition.switchProgress : next <= transition.switchProgress;
        if (shouldSwitch) {
          timelineSwitchedRef.current = true;
          timelineActiveGlobalIndexRef.current = transition.to;
          setTimelineActiveGlobalIndex(transition.to);
        }
      }

      if (t < 1) {
        transitionRafRef.current = window.requestAnimationFrame(tick);
        return;
      }

      transitionRef.current = null;
      transitionRafRef.current = null;
      timelineSwitchedRef.current = false;

      lockedGlobalIndexRef.current = transition.to;
      setLockedGlobalIndex(transition.to);
      timelineActiveGlobalIndexRef.current = transition.to;
      setTimelineActiveGlobalIndex(transition.to);
      displayScrollProgressRef.current = transition.toProgress;
      setDisplayScrollProgress(transition.toProgress);

      const pending = desiredGlobalIndexRef.current;
      if (pending === transition.to) return;
      if (Math.abs(pending - transition.to) > 1) {
        snapToGlobalIndex(pending);
        return;
      }
      startTransition(transition.to, transition.to + Math.sign(pending - transition.to));
    };

    transitionRafRef.current = window.requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (authorLen + movieLen <= 0) return;
    if (!initializedRef.current) {
      initializedRef.current = true;
      window.requestAnimationFrame(() => {
        snapToGlobalIndex(desiredGlobalIndex);
      });
      return;
    }

    if (transitionRef.current) return;
    const current = lockedGlobalIndexRef.current;
    const target = desiredGlobalIndexRef.current;
    if (target === current) return;

    if (Math.abs(target - current) > 1) {
      window.requestAnimationFrame(() => {
        snapToGlobalIndex(target);
      });
      return;
    }

    window.requestAnimationFrame(() => {
      startTransition(current, current + Math.sign(target - current));
    });
  }, [authorLen, movieLen, desiredGlobalIndex]);

  useEffect(() => {
    return () => {
      if (transitionRafRef.current) window.cancelAnimationFrame(transitionRafRef.current);
    };
  }, []);

  const scrollToGlobalProgress = (targetProgress: number) => {
    const container = authorContainerRef.current;
    const scroller = scrollerRef.current || (container?.parentElement as HTMLElement | null);
    if (!container || !scroller) return;

    const scrollerRect = scroller.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const containerTopInScroller = containerRect.top - scrollerRect.top + scroller.scrollTop;
    const viewportHeight = scroller.clientHeight || window.innerHeight;
    const totalScroll = containerRect.height - viewportHeight;
    if (totalScroll <= 0) return;

    const p = clamp(targetProgress, 0, 1);
    const top = containerTopInScroller + p * totalScroll;
    scroller.scrollTo({ top, behavior: "smooth" });
  };

  const jumpTo = (targetPhase: Phase, index: number) => {
    const seg = targetPhase === "author" ? authorSegmentSize : movieSegmentSize;
    const local = getLocalJumpProgress(index, seg);
    const global = targetPhase === "author" ? local * PHASE_BOUNDARY : PHASE_BOUNDARY + local * PHASE_BOUNDARY;
    scrollToGlobalProgress(global);
  };

  const combinedTimelineEvents = useMemo<CombinedEvent[]>(() => {
    return [
      ...authorTimelineEvents.map((event, idx) => ({ ...event, phase: "author" as const, index: idx })),
      ...movieTimelineEvents.map((event, idx) => ({ ...event, phase: "movies" as const, index: idx })),
    ];
  }, [authorTimelineEvents, movieTimelineEvents]);

  const visibleTimeline = useMemo(() => {
    const list = combinedTimelineEvents;
    const windowSize = 5;
    if (list.length <= windowSize) {
      return { start: 0, end: list.length, items: list, hasAbove: false, hasBelow: false };
    }

    const start = clamp(activeGlobalIndex - 2, 0, Math.max(0, list.length - windowSize));
    const end = Math.min(list.length, start + windowSize);
    return {
      start,
      end,
      items: list.slice(start, end),
      hasAbove: start > 0,
      hasBelow: end < list.length,
    };
  }, [activeGlobalIndex, combinedTimelineEvents]);

  return (
    <div className="doraemon-author" ref={authorContainerRef}>
      <div className="author-container">
        <div className="author-left">
          <div className="author-text">
            <h2 className="author-title">{currentTitle}</h2>
            <p className="author-subtitle">{currentSubtitle}</p>

            <div className="author-intro-text">
              {currentParagraphs.map((paragraph, index) => (
                <div
                  key={`paragraph-${phase}-${index}`}
                  className="paragraph"
                  data-index={index}
                  style={{
                    opacity: getParagraphOpacity(phaseProgress, currentSegmentSize, index),
                    transform: getParagraphTransform(phaseProgress, currentSegmentSize, index),
                  }}
                >
                  {getVisibleText(phaseProgress, currentSegmentSize, paragraph, index)}
                </div>
              ))}
            </div>

            {phase === "author" ? (
              <div className="author-links">
                <a
                  href="https://zh.wikipedia.org/wiki/藤子·F·不二雄"
                  target="_blank"
                  rel="noreferrer"
                  className="link-button"
                >
                  <span>维基百科</span>
                </a>
                <a
                  href="https://baike.baidu.com/item/藤子·F·不二雄"
                  target="_blank"
                  rel="noreferrer"
                  className="link-button"
                >
                  <span>百度百科</span>
                </a>
              </div>
            ) : (
              <div className="author-links" aria-hidden="true">
                <span className="link-button" style={{ pointerEvents: "none" }}>
                  <span>剧场版资料（占位）</span>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="author-right">
          <div className="author-images">
            {currentPhotos.map((photo, index) => (
              <div
                key={`photo-${phase}-${photo.src}-${index}`}
                className="photo-item"
                style={{
                  opacity: getPhotoOpacity(phaseProgress, currentSegmentSize, index),
                  transform: getPhotoTransform(phaseProgress, currentSegmentSize, index),
                }}
              >
                <img src={photo.src} alt={photo.caption} />
                <div className="photo-caption">{photo.caption}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="timeline-container" aria-label="时间轴">
        <div className="timeline-line" />

        <div className="timeline-section">
          {phase === "author" ? "作者" : "剧场版（占位）"}
        </div>

        {visibleTimeline.items.map((event, localIdx) => {
          const globalIdx = visibleTimeline.start + localIdx;
          const isActive = globalIdx === activeGlobalIndex;
          const isTopEdge = visibleTimeline.hasAbove && localIdx === 0 && !isActive;
          const isBottomEdge =
            visibleTimeline.hasBelow &&
            localIdx === visibleTimeline.items.length - 1 &&
            !isActive;

          return (
            <button
              key={`${event.phase}-${event.year}-${event.index}`}
              type="button"
              className={[
                "timeline-item",
                isActive ? "active" : "",
                isTopEdge || isBottomEdge ? "timeline-item--edge" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => jumpTo(event.phase, event.index)}
              aria-label={`跳转：${event.phase === "author" ? "作者" : "剧场版"} ${event.year}`}
            >
              <div className="timeline-dot" />
              <div className="timeline-content">
                <div className="timeline-year">{event.year}</div>
                <div className="timeline-description">{event.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
