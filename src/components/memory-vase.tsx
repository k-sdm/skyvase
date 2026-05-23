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
  const stops = buildVaseGradientStops(date, lat);
  const maskId = `memory-vase-mask-${pairIdx}`;
  const gradientId = `memory-vase-gradient-${pairIdx}`;
  const overlayUrl = overlayAssetUrl(pairIdx);

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
        isolation: "isolate",
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
          style={MEDIA_STYLE}
        />
      )}

      {canPlayWebM === false && (
        <img
          src={`/videos/${oneBased}.jpg`}
          alt=""
          style={MEDIA_STYLE}
        />
      )}

      {/* Masked gradient + GLOW; multiply via CSS so it blends with the video */}
      <div aria-hidden style={MULTIPLY_LAYER_STYLE}>
        <svg
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
            />
          </g>
        </svg>
      </div>
    </div>
  );
}
