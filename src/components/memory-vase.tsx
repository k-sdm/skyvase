"use client";

import { useEffect, useState } from "react";
import { buildVaseGradientStops } from "@/components/vase-preview";

const VIDEO_COUNT = 3;

// Native dimensions of both the video footage and the overlay vector.
const SOURCE_WIDTH = 1080;
const SOURCE_HEIGHT = 1350;

// Vase silhouette extracted from public/overlay.svg so it can be inlined
// and filled with a date-dependent linear gradient.
const VASE_PATH_D =
  "M409.5 1179C409.5 1162.21 410.831 699.328 411.499 469.492C411.499 469.213 411.674 469.003 411.953 469.008C418.748 469.12 500.478 470.448 554 470C607.916 469.548 691.059 466.294 698.031 466.019C698.317 466.007 698.498 466.224 698.495 466.51C696.333 700.159 692.417 1172.37 692.003 1188.4C692 1188.52 691.962 1188.54 691.876 1188.63C682.565 1198.14 634.661 1214 560 1214C485 1214 409.5 1200 409.5 1179Z";

const GRADIENT_ID = "memory-vase-gradient";

export interface MemoryVaseProps {
  date: Date;
  lat: number;
}

export function MemoryVase({ date, lat }: MemoryVaseProps) {
  const [videoIdx, setVideoIdx] = useState<number | null>(null);
  const stops = buildVaseGradientStops(date, lat);

  useEffect(() => {
    setVideoIdx(Math.floor(Math.random() * VIDEO_COUNT) + 1);
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: `min(90vw, calc(70vh * ${SOURCE_WIDTH} / ${SOURCE_HEIGHT}))`,
        aspectRatio: `${SOURCE_WIDTH} / ${SOURCE_HEIGHT}`,
        overflow: "hidden",
        background: "#000",
      }}
    >
      {videoIdx !== null && (
        <video
          key={videoIdx}
          src={`/videos/${videoIdx}.webm`}
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

      <svg
        viewBox={`0 0 ${SOURCE_WIDTH} ${SOURCE_HEIGHT}`}
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          mixBlendMode: "multiply",
          pointerEvents: "none",
          display: "block",
        }}
        aria-hidden
      >
        <defs>
          <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
            {stops.map((s, i) => (
              <stop
                key={i}
                offset={`${(s.offset * 100).toFixed(2)}%`}
                stopColor={s.color}
              />
            ))}
          </linearGradient>
        </defs>
        <path d={VASE_PATH_D} fill={`url(#${GRADIENT_ID})`} />
      </svg>
    </div>
  );
}
