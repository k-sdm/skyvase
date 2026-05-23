"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildVaseGradientStops } from "@/components/vase-preview";
import {
  radialStopOffsetPercent,
  VASE_RADIAL_GRADIENT,
  VASE_SOURCE_HEIGHT,
  VASE_SOURCE_WIDTH,
} from "@/lib/vase-radial-gradient";

const SOURCE_WIDTH = VASE_SOURCE_WIDTH;
const SOURCE_HEIGHT = VASE_SOURCE_HEIGHT;

export const PAIR_COUNT = 3;

function assetUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.href).href;
}

function overlayAssetPath(pairIdx: number): string {
  return `/OVERLAY ${pairIdx + 1}.svg`;
}

export interface MemoryVaseProps {
  date: Date;
  lat: number;
  pairIdx: number;
}

export function MemoryVase({ date, lat, pairIdx }: MemoryVaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackImgRef = useRef<HTMLImageElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayImgRef = useRef<HTMLImageElement | null>(null);

  const [canPlayWebM, setCanPlayWebM] = useState<boolean | null>(null);

  const stops = useMemo(() => buildVaseGradientStops(date, lat), [date, lat]);
  const maskId = `memory-vase-mask-${pairIdx}`;
  const gradientId = `memory-vase-gradient-${pairIdx}`;
  const overlayPath = overlayAssetPath(pairIdx);
  const overlayHref = assetUrl(overlayPath);
  const glowHref = assetUrl("/GLOW.svg");

  useEffect(() => {
    const v = document.createElement("video");
    setCanPlayWebM(v.canPlayType("video/webm") !== "");
  }, []);

  // Rasterise masked SVG (gradient + GLOW) for canvas multiply — updates when memory changes.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      overlayImgRef.current = img;
      URL.revokeObjectURL(blobUrl);
    };
    img.onerror = () => URL.revokeObjectURL(blobUrl);
    img.src = blobUrl;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [maskId, gradientId, overlayHref, glowHref, date, lat]);

  // Canvas compositing: video × multiply overlay (CSS blend fails on <video> in Firefox/Safari).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;

    const draw = () => {
      const container = containerRef.current;
      if (!container) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        const dpr = window.devicePixelRatio || 1;
        const pw = Math.round(w * dpr);
        const ph = Math.round(h * dpr);
        if (canvas.width !== pw || canvas.height !== ph) {
          canvas.width = pw;
          canvas.height = ph;
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, pw, ph);

        const media =
          canPlayWebM !== false ? videoRef.current : fallbackImgRef.current;
        const overlay = overlayImgRef.current;

        if (media) {
          const ready =
            media instanceof HTMLVideoElement
              ? media.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
              : media.complete && media.naturalWidth > 0;

          if (ready) {
            ctx.globalCompositeOperation = "source-over";
            ctx.drawImage(media, 0, 0, pw, ph);

            if (overlay?.complete && overlay.naturalWidth > 0) {
              ctx.globalCompositeOperation = "multiply";
              ctx.drawImage(overlay, 0, 0, pw, ph);
            }
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [canPlayWebM]);

  const oneBased = pairIdx + 1;
  const hiddenMediaStyle: React.CSSProperties = {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    pointerEvents: "none",
    overflow: "hidden",
  };

  return (
    <div
      ref={containerRef}
      className="memory-vase"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: "#000",
      }}
    >
      {canPlayWebM !== false && (
        <video
          ref={videoRef}
          key={oneBased}
          className="memory-vase__video"
          src={`/videos/${oneBased}.webm`}
          poster={`/videos/${oneBased}.jpg`}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden
          style={hiddenMediaStyle}
        />
      )}

      {canPlayWebM === false && (
        <img
          ref={fallbackImgRef}
          className="memory-vase__fallback"
          src={`/videos/${oneBased}.jpg`}
          alt=""
          aria-hidden
          style={hiddenMediaStyle}
        />
      )}

      <canvas
        ref={canvasRef}
        className="memory-vase__canvas"
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          pointerEvents: "none",
        }}
      />

      {/* Source SVG for overlay rasterisation — not painted to screen */}
      <svg
        ref={svgRef}
        className="memory-vase__overlay-svg"
        viewBox={`0 0 ${SOURCE_WIDTH} ${SOURCE_HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x={0}
            y={0}
            width={SOURCE_WIDTH}
            height={SOURCE_HEIGHT}
          >
            <image
              href={overlayHref}
              width={SOURCE_WIDTH}
              height={SOURCE_HEIGHT}
              preserveAspectRatio="none"
            />
          </mask>
          <radialGradient
            id={gradientId}
            cx={VASE_RADIAL_GRADIENT.cx}
            cy={VASE_RADIAL_GRADIENT.cy}
            r={VASE_RADIAL_GRADIENT.r}
            fx={VASE_RADIAL_GRADIENT.fx}
            fy={VASE_RADIAL_GRADIENT.fy}
            gradientUnits="userSpaceOnUse"
          >
            {stops.map((s, i) => (
              <stop
                key={i}
                offset={radialStopOffsetPercent(s.offset)}
                stopColor={s.color}
              />
            ))}
          </radialGradient>
        </defs>
        <g mask={`url(#${maskId})`}>
          <rect
            width={SOURCE_WIDTH}
            height={SOURCE_HEIGHT}
            fill={`url(#${gradientId})`}
          />
          <image
            href={glowHref}
            width={SOURCE_WIDTH}
            height={SOURCE_HEIGHT}
            preserveAspectRatio="none"
          />
        </g>
      </svg>
    </div>
  );
}
