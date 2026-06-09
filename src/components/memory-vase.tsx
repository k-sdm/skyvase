"use client";

import { useEffect, useMemo, useState } from "react";
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

/** Bump when 1/2/3.webm change — busts CDN/browser cache on the same paths. */
export const MEMORY_VIDEO_VERSION = "2";

// Vase fade-in from white once it's fully composed.
const REVEAL_MS = 700;
// Colours rising from the bottom into their final positions.
const GRADIENT_RISE_MS = 1500;
// Safety net so a stalled asset never leaves the vase hidden.
const READY_TIMEOUT_MS = 1600;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const SVG_STYLE: React.CSSProperties = {
  display: "block",
  width: "100%",
  height: "100%",
};

/** CSS multiply — SVG <g> blend modes do not composite with HTML <video>. */
const MULTIPLY_LAYER_STYLE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  mixBlendMode: "multiply",
  pointerEvents: "none",
};

const MEDIA_STYLE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "fill",
  display: "block",
};

function overlayAssetUrl(pairIdx: number): string {
  return `/OVERLAY ${pairIdx + 1}.svg`;
}

export interface MemoryVaseProps {
  date: Date;
  lat: number;
  pairIdx: number;
}

export function MemoryVase({ date, lat, pairIdx }: MemoryVaseProps) {
  const [canPlayWebM, setCanPlayWebM] = useState<boolean | null>(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [progress, setProgress] = useState(0);

  const finalStops = useMemo(() => buildVaseGradientStops(date, lat), [date, lat]);
  const maskId = `memory-vase-mask-${pairIdx}`;
  const gradientId = `memory-vase-gradient-${pairIdx}`;
  const overlayUrl = overlayAssetUrl(pairIdx);

  useEffect(() => {
    const v = document.createElement("video");
    setCanPlayWebM(v.canPlayType("video/webm") !== "");
  }, []);

  // Preload the vase shape mask + glow so the coloured layer is composited the
  // moment the vase appears — never a frame of the un-coloured (bare) vase.
  useEffect(() => {
    let loaded = 0;
    const onOne = () => {
      loaded += 1;
      if (loaded >= 2) setAssetsReady(true);
    };
    const shape = new Image();
    shape.onload = onOne;
    shape.onerror = onOne;
    shape.src = overlayUrl;
    const glow = new Image();
    glow.onload = onOne;
    glow.onerror = onOne;
    glow.src = "/GLOW.svg";
  }, [overlayUrl]);

  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), READY_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, []);

  const ready = (mediaReady && assetsReady) || timedOut;

  // Once fully composed, ease the colours up from the bottom into their final
  // positions (the fade-in from white is driven by `ready` on the container).
  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const p = Math.min(1, (now - start) / GRADIENT_RISE_MS);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  // Start fully blue (every colour collapsed to the bottom) and let the warm
  // colours rise to their final offsets as `progress` eases to 1.
  const eased = easeOutCubic(progress);
  const stops = finalStops.map((s, i) =>
    i === 0 ? s : { color: s.color, offset: 1 - (1 - s.offset) * eased }
  );

  const oneBased = pairIdx + 1;

  return (
    <div
      className="memory-vase"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: "#fff",
        isolation: "isolate",
        opacity: ready ? 1 : 0,
        transition: `opacity ${REVEAL_MS}ms ease`,
      }}
    >
      {canPlayWebM !== false && (
        <video
          key={oneBased}
          className="memory-vase__video"
          src={`/videos/${oneBased}.webm?v=${MEMORY_VIDEO_VERSION}`}
          poster={`/videos/${oneBased}.jpg`}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedData={() => setMediaReady(true)}
          style={MEDIA_STYLE}
        />
      )}

      {canPlayWebM === false && (
        <img
          className="memory-vase__fallback"
          src={`/videos/${oneBased}.jpg`}
          alt=""
          onLoad={() => setMediaReady(true)}
          style={MEDIA_STYLE}
        />
      )}

      {/* Masked gradient + GLOW; multiply via CSS so it blends with the video */}
      <div className="memory-vase__multiply" aria-hidden style={MULTIPLY_LAYER_STYLE}>
        <svg
          className="memory-vase__overlay-svg"
          viewBox={`0 0 ${SOURCE_WIDTH} ${SOURCE_HEIGHT}`}
          preserveAspectRatio="none"
          style={SVG_STYLE}
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
                href={overlayUrl}
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
              href="/GLOW.svg"
              width={SOURCE_WIDTH}
              height={SOURCE_HEIGHT}
              preserveAspectRatio="none"
              style={{ mixBlendMode: "overlay" }}
              opacity={0.8}
            />
          </g>
        </svg>
      </div>
    </div>
  );
}
