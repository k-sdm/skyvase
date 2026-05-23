"use client";

import { useEffect, useState } from "react";
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

const LAYER_BASE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none",
};

function overlayMaskStyle(pairIdx: number): React.CSSProperties {
  const url = `url("/OVERLAY ${pairIdx + 1}.svg")`;
  return {
    WebkitMaskImage: url,
    maskImage: url,
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
  };
}

export interface MemoryVaseProps {
  date: Date;
  lat: number;
  pairIdx: number;
}

export function MemoryVase({ date, lat, pairIdx }: MemoryVaseProps) {
  const [canPlayWebM, setCanPlayWebM] = useState<boolean | null>(null);
  const stops = buildVaseGradientStops(date, lat);
  const gradientId = `memory-vase-gradient-${pairIdx}`;
  const maskStyle = overlayMaskStyle(pairIdx);

  useEffect(() => {
    const v = document.createElement("video");
    setCanPlayWebM(v.canPlayType("video/webm") !== "");
  }, []);

  const oneBased = pairIdx + 1;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: "#000",
      }}
    >
      {canPlayWebM !== false && (
        <video
          key={oneBased}
          src={`/videos/${oneBased}.webm`}
          poster={`/videos/${oneBased}.jpg`}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "fill",
            display: "block",
          }}
        />
      )}

      {canPlayWebM === false && (
        <img
          src={`/videos/${oneBased}.jpg`}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "fill",
            display: "block",
          }}
        />
      )}

      {/* Radial gradient — multiply, masked to OVERLAY silhouette */}
      <svg
        viewBox={`0 0 ${SOURCE_WIDTH} ${SOURCE_HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden
        style={{
          ...LAYER_BASE,
          mixBlendMode: "multiply",
          display: "block",
          ...maskStyle,
        }}
      >
        <defs>
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
        <rect
          width={SOURCE_WIDTH}
          height={SOURCE_HEIGHT}
          fill={`url(#${gradientId})`}
        />
      </svg>

      {/* GLOW.svg — overlay, same mask */}
      <img
        src="/GLOW.svg"
        alt=""
        aria-hidden
        style={{
          ...LAYER_BASE,
          objectFit: "fill",
          mixBlendMode: "overlay",
          display: "block",
          ...maskStyle,
        }}
      />
    </div>
  );
}
