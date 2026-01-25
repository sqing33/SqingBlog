"use client";

import {
  Disc3,
  Pause,
  Play,
  RefreshCcw,
  SkipBack,
  SkipForward,
} from "lucide-react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Track = {
  id: string;
  file: string;
  title: string;
  url: string;
};

type MusicListResponse = {
  ok?: boolean;
  message?: string;
  data?: {
    tracks?: Track[];
  };
};

type MusicMetaResponse = {
  ok?: boolean;
  message?: string;
  data?: {
    coverDataUrl?: string | null;
    lyrics?: string | null;
  };
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function HomeMusicPlayer({
  className,
  open: controlledOpen,
  onOpenChange,
  showMobileWidget = true,
  autoExpandMobileWidget = false,
  onCoverDataUrlChange,
  onPlayingChange,
}: {
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showMobileWidget?: boolean;
  autoExpandMobileWidget?: boolean;
  onCoverDataUrlChange?: (coverDataUrl: string | null) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoPlayAfterChangeRef = useRef(false);
  const metaAbortRef = useRef<AbortController | null>(null);
  const metaCacheRef = useRef(
    new Map<string, { coverDataUrl: string | null; lyrics: string | null }>()
  );
  const isPlayingRef = useRef(false);

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (typeof controlledOpen === "boolean") {
      onOpenChange?.(next);
      return;
    }
    setUncontrolledOpen(next);
  };
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [coverDataUrl, setCoverDataUrl] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  useEffect(() => {
    onCoverDataUrlChange?.(coverDataUrl);
  }, [coverDataUrl, onCoverDataUrlChange]);

  useEffect(() => {
    onPlayingChange?.(isPlaying);
  }, [isPlaying, onPlayingChange]);

  useEffect(() => {
    if (!showMobileWidget) return;
    if (!autoExpandMobileWidget) return;
    setMobileExpanded(true);
  }, [autoExpandMobileWidget, showMobileWidget]);

  const trackList = tracks ?? [];
  const activeTrack = trackList[activeIndex];
  const hasLoaded = tracks !== null;
  const hasTracks = trackList.length > 0;
  const previewOpen = !open && isHovering;
  const previewSize = 5;
  const previewStart =
    trackList.length > previewSize
      ? Math.min(
          Math.max(activeIndex - 2, 0),
          Math.max(trackList.length - previewSize, 0)
        )
      : 0;
  const previewTracks = trackList.slice(previewStart, previewStart + previewSize);

  const loadMeta = useCallback(async (file: string | null) => {
    metaAbortRef.current?.abort();
    metaAbortRef.current = null;

    if (!file) {
      setCoverDataUrl(null);
      setLyrics(null);
      return;
    }

    const cached = metaCacheRef.current.get(file);
    if (cached) {
      setCoverDataUrl(cached.coverDataUrl);
      setLyrics(cached.lyrics);
      return;
    }

    setCoverDataUrl(null);
    setLyrics(null);

    const controller = new AbortController();
    metaAbortRef.current = controller;

    try {
      const res = await fetch(`/api/music/meta?file=${encodeURIComponent(file)}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) return;
      const json = (await res.json()) as MusicMetaResponse;
      const next = {
        coverDataUrl: json?.data?.coverDataUrl ?? null,
        lyrics: json?.data?.lyrics ?? null,
      };
      metaCacheRef.current.set(file, next);
      setCoverDataUrl(next.coverDataUrl);
      setLyrics(next.lyrics);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }, []);

  const loadTracks = useCallback(async (opts?: {
    autoplay?: boolean;
    prevFile?: string | null;
    wasPlaying?: boolean;
  }) => {
    try {
      setLoadError(null);

      const prevFile = opts?.prevFile ?? null;
      const audio = audioRef.current;
      const autoplay =
        opts?.autoplay ??
        (audio ? !audio.paused : (opts?.wasPlaying ?? isPlayingRef.current));

      const res = await fetch("/api/music", { cache: "no-store" });
      if (!res.ok) {
        setTracks([]);
        setLoadError("音乐列表加载失败");
        await loadMeta(null);
        return;
      }

      const json = (await res.json()) as MusicListResponse;
      const nextTracks = (json?.data?.tracks ?? []).filter(
        (t): t is Track => Boolean(t?.url && t?.title && t?.file)
      );

      setTracks(nextTracks);

      const idx = prevFile
        ? nextTracks.findIndex((t) => t.file === prevFile)
        : -1;
      const nextIndex = idx >= 0 ? idx : 0;
      const nextFile = nextTracks[nextIndex]?.file ?? null;
      setCurrentTime(0);
      setDuration(0);
      autoPlayAfterChangeRef.current = autoplay;
      setActiveIndex(nextIndex);
      await loadMeta(nextFile);
    } catch (err) {
      setTracks([]);
      setLoadError(err instanceof Error ? err.message : "音乐列表加载失败");
      await loadMeta(null);
    }
  }, [loadMeta]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadTracks({ autoplay: false, prevFile: null, wasPlaying: false });
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadTracks]);

  const requestTrackChange = (nextIndex: number, autoplay: boolean) => {
    if (!trackList.length) return;
    const bounded =
      ((nextIndex % trackList.length) + trackList.length) % trackList.length;
    setCurrentTime(0);
    setDuration(0);
    autoPlayAfterChangeRef.current = autoplay;
    setActiveIndex(bounded);
    void loadMeta(trackList[bounded]?.file ?? null);
  };

  const handleTogglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!hasLoaded) {
      await loadTracks({
        autoplay: true,
        prevFile: activeTrack?.file ?? null,
        wasPlaying: isPlaying,
      });
      return;
    }

    if (!hasTracks || !activeTrack?.url) return;

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        // ignore autoplay failures
      }
      return;
    }

    audio.pause();
  };

  const handlePrev = () => {
    if (!hasTracks) return;
    const audio = audioRef.current;
    const autoplay = audio ? !audio.paused : isPlaying;
    requestTrackChange(activeIndex - 1, autoplay);
  };

  const handleNext = () => {
    if (!hasTracks) return;
    const audio = audioRef.current;
    const autoplay = audio ? !audio.paused : isPlaying;
    requestTrackChange(activeIndex + 1, autoplay);
  };

  const handleEnded = () => {
    if (!hasTracks) return;
    const next = (activeIndex + 1) % trackList.length;
    requestTrackChange(next, true);
  };

  const headerTitle = hasTracks ? (activeTrack?.title ?? "正在播放") : "音乐播放器";

  const stopOpen = (e: SyntheticEvent) => {
    e.stopPropagation();
  };

  const handleMobileExpand = async (e: SyntheticEvent) => {
    e.stopPropagation();
    if (!mobileExpanded) {
      setMobileExpanded(true);
      if (!isPlaying) {
        await handleTogglePlay();
      }
    }
  };

  const handleMobileCollapse = (e: SyntheticEvent) => {
    e.stopPropagation();
    setMobileExpanded(false);
  };

  return (
    <>
      {/* Mobile Mobile Compact/Expanded Widget */}
      {showMobileWidget ? (
        <div
          className={cn(
            "md:hidden fixed z-50 transition-all duration-300 ease-spring",
            mobileExpanded
              ? "inset-x-4 top-4 w-auto rounded-2xl border border-black/15 bg-white/95 shadow-xl p-2"
              : "right-4 top-4 size-12 rounded-xl border border-black/15 bg-white/90 shadow-lg overflow-hidden"
          )}
        >
          {!mobileExpanded ? (
            <button
              type="button"
              aria-label="展开音乐播放器"
              className="size-full flex items-center justify-center relative"
              onClick={handleMobileExpand}
            >
              <div
                className={cn(
                  "relative size-9 rounded-full overflow-hidden shadow-sm ring-1 ring-black/5 transition-transform duration-[3s] linear",
                  isPlaying ? "animate-spin" : ""
                )}
                style={{ animationDuration: "10s" }}
              >
                {coverDataUrl ? (
                  <Image
                    src={coverDataUrl}
                    alt="cover"
                    fill
                    sizes="36px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <Disc3 className="size-full p-1.5 text-[#3F3E3E]/40 bg-black/5" />
                )}
              </div>
            </button>
          ) : (
            <div
              role="button"
              tabIndex={0}
              aria-label="收起音乐播放器"
              className="flex items-center gap-2"
              onClick={handleMobileCollapse}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                handleMobileCollapse(e);
              }}
            >
              <div
                className="relative size-10 shrink-0 rounded-full overflow-hidden border border-black/10"
                onClick={async (e) => {
                  e.stopPropagation();
                  await handleTogglePlay();
                }}
              >
                {coverDataUrl ? (
                  <Image
                    src={coverDataUrl}
                    alt="cover"
                    fill
                    sizes="40px"
                    className={cn(
                      "object-cover transition-opacity",
                      isPlaying ? "opacity-100" : "opacity-80"
                    )}
                    unoptimized
                  />
                ) : (
                  <Disc3 className="h-full w-full p-2 text-[#3F3E3E]/40 bg-gray-100" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  {isPlaying ? (
                    <Pause className="size-4 text-white drop-shadow-md" />
                  ) : (
                    <Play className="size-4 text-white drop-shadow-md ml-0.5" />
                  )}
                </div>
              </div>

              <button
                type="button"
                aria-label="打开音乐播放器详情"
                className="flex-1 min-w-0 flex flex-col justify-center text-left"
                onClick={async (e) => {
                  e.stopPropagation();
                  setOpen(true);
                  if (!hasLoaded) {
                    await loadTracks({
                      autoplay: false,
                      prevFile: activeTrack?.file ?? null,
                      wasPlaying: isPlaying,
                    });
                  }
                }}
              >
                <div className="truncate font-medium text-[#3F3E3E] text-[13px]">
                  {hasTracks
                    ? (activeTrack?.title ?? "正在播放")
                    : hasLoaded
                      ? "无音乐"
                      : "点击播放"}
                </div>
                <div className="text-xs text-[#3F3E3E]/60">
                  {formatTime(currentTime)} / {duration ? formatTime(duration) : "--:--"}
                </div>
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* Desktop Widget (>= md) */}
      <div
        className={cn(
          "hidden md:block w-[min(20rem,92vw)] overflow-hidden rounded-2xl border border-black/15 bg-white/95 text-left shadow-[0_12px_40px_rgba(0,0,0,0.18)]",
          className
        )}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div
          role="button"
          tabIndex={0}
          aria-label="打开音乐播放器"
          onClick={async () => {
            setOpen(true);
            if (!hasLoaded) {
              await loadTracks({
                autoplay: false,
                prevFile: activeTrack?.file ?? null,
                wasPlaying: isPlaying,
              });
            }
          }}
          onKeyDown={async (e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            setOpen(true);
            if (!hasLoaded) {
              await loadTracks({
                autoplay: false,
                prevFile: activeTrack?.file ?? null,
                wasPlaying: isPlaying,
              });
            }
          }}
          className="flex h-16 w-full items-center p-2 text-left cursor-pointer select-none"
        >
          <audio
            ref={audioRef}
            src={activeTrack?.url}
            preload="metadata"
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              setDuration(Number.isFinite(d) ? d : 0);
            }}
            onPlay={() => {
              setIsPlaying(true);
              isPlayingRef.current = true;
            }}
            onPause={() => {
              setIsPlaying(false);
              isPlayingRef.current = false;
            }}
            onEnded={handleEnded}
            onCanPlay={async () => {
              if (!autoPlayAfterChangeRef.current) return;
              autoPlayAfterChangeRef.current = false;
              try {
                await audioRef.current?.play();
              } catch {
                // ignore
              }
            }}
          />

          <div className="min-w-0 flex-1 overflow-hidden px-2">
            <div className="truncate font-medium text-[#3F3E3E] text-sm">
              {hasTracks
                ? (activeTrack?.title ?? "正在播放")
                : hasLoaded
                ? "public/music 下没有音频文件"
                : "点击播放加载音乐"}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[#3F3E3E]/70 text-xs">
              <span>
                {formatTime(currentTime)} /{" "}
                {duration ? formatTime(duration) : "--:--"}
              </span>
              {loadError ? <span className="truncate">· {loadError}</span> : null}
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={isPlaying ? "暂停" : "播放"}
            disabled={hasLoaded && !hasTracks}
            className={cn(
              "group relative size-12 shrink-0 rounded-full hover:bg-transparent active:bg-transparent"
            )}
            onPointerDown={stopOpen}
            onClick={async (e) => {
              stopOpen(e);
              await handleTogglePlay();
            }}
          >
            <div
              className={cn(
                "absolute inset-0 overflow-hidden rounded-full transition-opacity duration-200",
                isPlaying ? "home-music-disc-spin" : "group-hover:opacity-60"
              )}
            >
              <div className="relative h-full w-full">
                {coverDataUrl ? (
                  <Image
                    src={coverDataUrl}
                    alt={activeTrack?.title ? `${activeTrack.title} cover` : "cover"}
                    fill
                    sizes="48px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <Disc3 className="h-full w-full text-[#3F3E3E]/25" />
                )}
              </div>
            </div>

            {isPlaying ? (
              <Pause className="relative size-5 text-[#3F3E3E]/75" />
            ) : (
              <Play className="relative size-5 text-[#3F3E3E]/75 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            )}
          </Button>
        </div>

        <div
          aria-hidden={!previewOpen}
          className={cn(
            "overflow-hidden transition-[max-height,opacity] duration-200",
            previewOpen ? "max-h-[260px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="border-t border-black/10 p-2">
            <div className="rounded-md border bg-white/70">
              {hasTracks ? (
                <div className="divide-y">
                  {previewTracks.map((t, offset) => {
                    const idx = previewStart + offset;
                    const active = idx === activeIndex;
                    return (
                      <button
                        key={t.id ?? t.file}
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm",
                          "hover:bg-accent",
                          active ? "bg-accent/60" : ""
                        )}
                        onClick={() => {
                          const audio = audioRef.current;
                          const autoplay = audio ? !audio.paused : isPlaying;
                          requestTrackChange(idx, autoplay);
                        }}
                      >
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {t.title}
                        </span>
                        {active ? (
                          <span className="shrink-0 text-xs opacity-70">
                            {isPlaying ? "播放中" : "已暂停"}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 text-muted-foreground text-sm">
                  {hasLoaded
                    ? loadError
                      ? `加载失败：${loadError}`
                      : "没有找到音频文件"
                    : "加载中..."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{headerTitle}</DialogTitle>
            <DialogDescription>
              来自 <code className="rounded bg-muted px-1 py-0.5">public/music</code>
              ，点击播放列表可切歌。
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="list">
            <div className="flex items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="list">列表</TabsTrigger>
                <TabsTrigger value="lyrics">歌词</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="上一首"
                  disabled={!hasTracks}
                  onClick={handlePrev}
                >
                  <SkipBack />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={isPlaying ? "暂停" : "播放"}
                  disabled={hasLoaded && !hasTracks}
                  onClick={async () => {
                    await handleTogglePlay();
                  }}
                >
                  {isPlaying ? <Pause /> : <Play />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="下一首"
                  disabled={!hasTracks}
                  onClick={handleNext}
                >
                  <SkipForward />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await loadTracks({
                      autoplay: false,
                      prevFile: activeTrack?.file ?? null,
                      wasPlaying: isPlaying,
                    });
                  }}
                >
                  <RefreshCcw />
                  刷新
                </Button>
              </div>
            </div>

            <TabsContent value="list" className="mt-3">
              <div className="max-h-[320px] overflow-auto rounded-md border">
                {hasTracks ? (
                  <div className="divide-y">
                    {trackList.map((t, idx) => {
                      const active = idx === activeIndex;
                      return (
                        <button
                          key={t.id ?? t.file}
                          type="button"
                          className={cn(
                            "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm",
                            "hover:bg-accent",
                            active ? "bg-accent/60" : ""
                          )}
                          onClick={() => {
                            const audio = audioRef.current;
                            const autoplay = audio ? !audio.paused : isPlaying;
                            requestTrackChange(idx, autoplay);
                          }}
                        >
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {t.title}
                          </span>
                          {active ? (
                            <span className="shrink-0 text-xs opacity-70">
                              {isPlaying ? "播放中" : "已暂停"}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-muted-foreground text-sm">
                    {loadError
                      ? `加载失败：${loadError}`
                      : "没有找到音频文件（支持 mp3/m4a/aac/wav/ogg/flac/webm）。"}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="lyrics" className="mt-3">
              <div className="max-h-[320px] min-w-0 overflow-auto rounded-md border p-4 text-sm leading-6 whitespace-pre-wrap break-all">
                {lyrics ? lyrics : "当前歌曲未内嵌歌词"}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
