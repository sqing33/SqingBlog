"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";

import { charactIntro, type CharacterIntroItem } from "@/content/charactIntro";

type MapLocation = {
  id: number;
  name: string;
  engName: keyof typeof charactIntro;
  lng: number;
  lat: number;
  img: string;
};

type TileCoord = { x: number; y: number };

type BMapTileLayer = { getTilesUrl?: (tileCoord: TileCoord, zoom: number) => string };

type BMapMarker = {
  setTitle?: (title: string) => void;
  setIcon?: (icon: unknown) => void;
  addEventListener: (event: string, handler: () => void) => void;
};

type BMapMap = {
  addControl: (control: unknown) => void;
  centerAndZoom: (point: unknown, zoom: number) => void;
  enablePinchToZoom?: (enable: boolean) => void;
  enableScrollWheelZoom?: (enable: boolean) => void;
  addOverlay: (overlay: unknown) => void;
  addEventListener?: (event: string, handler: () => void) => void;
  getZoom?: () => number;
  setZoom?: (zoom: number) => void;
  setCenter?: (point: unknown) => void;
  clearOverlays?: () => void;
};

type BMapApi = {
  TileLayer: new () => BMapTileLayer;
  MapType: new (
    name: string,
    tileLayer: BMapTileLayer,
    options: { minZoom: number; maxZoom: number }
  ) => unknown;
  Map: new (container: HTMLElement, options: { mapType: unknown }) => BMapMap;
  NavigationControl: new () => unknown;
  Point: new (lng: number, lat: number) => unknown;
  Marker: new (point: unknown) => BMapMarker;
  Icon: new (
    url: string,
    size: unknown,
    options: { imageSize: unknown; imageOffset: unknown }
  ) => unknown;
  Size: new (width: number, height: number) => unknown;
};

declare global {
  interface Window {
    BMap?: unknown;
    BMapGL?: unknown;
  }
}

const addressIcon = "/assets/map/address.png";
const cloudImg = "/assets/map/cloud.png";
const backImg = "/assets/map/back.png";

const locations: MapLocation[] = [
  {
    id: 1,
    name: "大雄家",
    engName: "Nobita",
    lng: 27,
    lat: -51,
    img: "/assets/map/character/Nobita/home.jpg",
  },
  {
    id: 3,
    name: "胖虎家",
    engName: "Giant",
    lng: 12.5,
    lat: 24.5,
    img: "/assets/map/character/Giant/home.jpg",
  },
];

function getIntroList(engName: keyof typeof charactIntro) {
  const group = charactIntro[engName] || {};
  const keys = Object.keys(group).sort((a, b) => Number(a) - Number(b));
  return keys.map((k) => group[k] as CharacterIntroItem);
}

export function DoraemonMap({ variant = "card" }: { variant?: "card" | "fullscreen" } = {}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [cloudEnter, setCloudEnter] = useState(false);
  const [cloudLeave, setCloudLeave] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const introList = useMemo(() => {
    if (!selectedLocation) return [];
    return getIntroList(selectedLocation.engName);
  }, [selectedLocation]);

  const activeIntro = introList[activeIndex] ?? null;

  useEffect(() => {
    if (!mapReady) return;
    if (!mapRef.current) return;

    const BMap = (window.BMap ?? window.BMapGL) as BMapApi | undefined;
    if (!BMap) return;

    const tileLayer = new BMap.TileLayer();
    tileLayer.getTilesUrl = (tileCoord, zoom) => {
      const { x, y } = tileCoord;
      return `/map/${zoom}/tile-${x}_${y}.png`;
    };

    const MyMap = new BMap.MapType("MyMap", tileLayer, {
      minZoom: 4,
      maxZoom: 5,
    });

    const map = new BMap.Map(mapRef.current, { mapType: MyMap });
    map.addControl(new BMap.NavigationControl());
    map.centerAndZoom(new BMap.Point(0, 0), 4);
    map.enablePinchToZoom?.(true);
    map.enableScrollWheelZoom?.(true);

    const markers: BMapMarker[] = [];

    const buildIcon = (size: number) =>
      new BMap.Icon(addressIcon, new BMap.Size(size, size), {
        imageSize: new BMap.Size(size, size),
        imageOffset: new BMap.Size(0, 0),
      });

    for (const loc of locations) {
      const point = new BMap.Point(loc.lng, loc.lat);
      const marker = new BMap.Marker(point);
      marker.setTitle?.(loc.name);
      marker.setIcon?.(buildIcon(50));

      marker.addEventListener("click", () => {
        if (map.getZoom?.() === 4) {
          map.setZoom?.(5);
          map.setCenter?.(point);
          return;
        }

        setSelectedLocation(loc);
        setActiveIndex(0);

        setCloudEnter(true);
        window.setTimeout(() => setOverlayVisible(true), 650);
        window.setTimeout(() => setCloudEnter(false), 1500);
      });

      map.addOverlay(marker);
      markers.push(marker);
    }

    map.addEventListener?.("zoomend", () => {
      const zoomValue = map.getZoom?.();
      const size = zoomValue === 5 ? 120 : 50;
      for (const marker of markers) {
        marker.setIcon?.(buildIcon(size));
      }
    });

    return () => {
      try {
        map.clearOverlays?.();
      } catch {
        // ignore
      }
    };
  }, [mapReady]);

  const isFullscreen = variant === "fullscreen";

  return (
    <div
      className={
        isFullscreen
          ? "relative w-screen overflow-hidden bg-transparent"
          : "relative overflow-hidden rounded-2xl border bg-background/60"
      }
    >
      <Script
        src={`https://api.map.baidu.com/api?v=3.0&ak=${process.env.NEXT_PUBLIC_BAIDU_MAP_AK || ""}&type=${process.env.NEXT_PUBLIC_BAIDU_MAP_TYPE || "WebGL"}`}
        strategy="afterInteractive"
        onLoad={() => setMapReady(true)}
      />

      <div
        ref={mapRef}
        className={
          isFullscreen
            ? "w-full h-[calc(100vh-100px)] md:h-[calc(100vh-60px)]"
            : "h-[70vh] w-full"
        }
      />

      <div
        className={[
          "pointer-events-none absolute left-0 top-0 z-30",
          "translate-x-[-220vw] translate-y-[-79vh]",
          cloudEnter ? "animate-[cloud_1.5s_ease-in-out]" : "",
          cloudLeave ? "animate-[cloudBack_1.5s_ease-in-out]" : "",
        ].join(" ")}
        style={{ width: "230vw", height: "230vh" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cloudImg} alt="" className="h-full w-full" />
      </div>

      {overlayVisible && selectedLocation && activeIntro ? (
        <div
          className="absolute inset-0 z-40"
          style={{
            background: `url(${selectedLocation.img}) no-repeat center bottom / cover`,
          }}
        >
          <button
            type="button"
            className="absolute left-4 top-4"
            onClick={() => {
              setCloudLeave(true);
              window.setTimeout(() => setOverlayVisible(false), 700);
              window.setTimeout(() => setCloudLeave(false), 1500);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={backImg} alt="back" className="h-20 w-20 cursor-pointer" />
          </button>

          <div className="absolute left-1/2 top-24 w-[min(560px,90vw)] -translate-x-1/2 rounded-xl border bg-white/85 p-4 text-center shadow-lg">
            <h2 className="text-lg font-semibold">
              {activeIntro.name}{" "}
              {activeIntro.realname ? (
                <span className="text-sm text-muted-foreground">
                  （全名 {activeIntro.realname}）
                </span>
              ) : null}
            </h2>
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              {activeIntro.birthday ? <p>生日：{activeIntro.birthday}</p> : null}
              {activeIntro.age ? <p>年龄：{activeIntro.age}</p> : null}
              {activeIntro.height ? (
                <p>
                  {activeIntro.height}
                  {activeIntro.weight ? `，${activeIntro.weight}` : ""}
                </p>
              ) : null}
              <p>{activeIntro.nature}</p>
              {activeIntro.favorite ? <p>喜欢：{activeIntro.favorite}</p> : null}
              {activeIntro.fear ? <p>不喜欢：{activeIntro.fear}</p> : null}
            </div>
          </div>

          <div className="absolute bottom-0 left-1/2 flex h-[280px] -translate-x-1/2 items-end gap-1 px-2 pb-2">
            {introList.map((item, idx) => (
              <button
                key={`${item.name}-${idx}`}
                type="button"
                className={[
                  "overflow-hidden rounded-lg border bg-white/70 shadow-sm transition",
                  idx === activeIndex ? "ring-2 ring-sky-400" : "",
                ].join(" ")}
                onClick={() => setActiveIndex(idx)}
                title={item.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.img}
                  alt=""
                  className="h-[180px] w-auto object-contain sm:h-[240px]"
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        @keyframes cloud {
          0% {
            transform: translate(-220vw, -79vh);
            z-index: 99999;
          }
          100% {
            transform: translate(65vw, -79vh);
            z-index: 99999;
          }
        }

        @keyframes cloudBack {
          0% {
            transform: translate(65vw, -79vh) scaleX(-1);
            z-index: 99999;
          }
          100% {
            transform: translate(-220vw, -79vh) scaleX(-1);
            z-index: 99999;
          }
        }

        .BMap_cpyCtrl,
        .BMap_stdMpCtrl,
        .anchorBL {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
