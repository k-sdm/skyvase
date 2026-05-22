"use client";

import { useEffect, useState } from "react";
import { buildVaseGradientStops } from "@/components/vase-preview";

// Native dimensions of every video + matching overlay.
const SOURCE_WIDTH = 1080;
const SOURCE_HEIGHT = 1350;

// Approximate vase silhouette extent within the 1080x1350 viewBox.
// Used to place a radial gradient whose concentric rings bend with the
// cylinder rather than running as straight horizontal bands.
const VASE_TOP_Y = 466;
const VASE_BOTTOM_Y = 1214;
const VASE_HALF_WIDTH = 150;

// Focus point sits above the vase so the *bottom* arcs of the gradient
// rings show through the silhouette — gives a subtle smile-shape
// (valley in the middle, lifting at the edges) that reads as cylinder
// curvature. Lower FOCUS_Y closer to VASE_TOP_Y for a more exaggerated
// bend; push it more negative for almost-flat bands.
const FOCUS_X = SOURCE_WIDTH / 2;
const FOCUS_Y = -1500;
const TOP_DIST = VASE_TOP_Y - FOCUS_Y;
const BOTTOM_DIST = VASE_BOTTOM_Y - FOCUS_Y;
const CURVE_RADIUS = Math.sqrt(
  VASE_HALF_WIDTH * VASE_HALF_WIDTH + BOTTOM_DIST * BOTTOM_DIST
);
const RADIAL_START = TOP_DIST / CURVE_RADIUS;
const RADIAL_END = BOTTOM_DIST / CURVE_RADIUS;

function mapToRadialOffset(linearOffset: number): number {
  return RADIAL_START + linearOffset * (RADIAL_END - RADIAL_START);
}

// Vase silhouettes extracted from public/OVERLAY 1-3.svg.
// Each path is hand-aligned to its matching video frame.
const VASE_PATHS: readonly string[] = [
  // overlay 1 — matches /videos/1.webm
  "M409.5 1179C409.5 1162.21 410.831 699.328 411.499 469.492C411.499 469.213 411.674 469.003 411.953 469.008C418.748 469.12 500.478 470.448 554 470C607.916 469.548 691.059 466.294 698.031 466.019C698.317 466.007 698.498 466.224 698.495 466.51C696.333 700.159 692.417 1172.37 692.003 1188.4C692 1188.52 691.962 1188.54 691.876 1188.63C682.565 1198.14 634.661 1214 560 1214C485 1214 409.5 1200 409.5 1179Z",
  // overlay 2 — matches /videos/2.webm
  "M406.5 1182C406.5 1165.21 403.005 703.155 408.987 469.496C408.994 469.216 409.227 469.011 409.507 469.023C410.837 469.085 414.726 469.262 420.52 469.513C420.787 469.524 420.985 469.743 420.924 470.003C420.168 473.229 414.139 488.273 421 489C423.956 489.313 424.705 495.071 425.5 499.5C425.984 502.197 429.754 502.222 432.5 501.5C437.417 500.208 444.785 484.148 449 476.5C450.348 474.054 453.145 475.332 454.932 476.457C454.977 476.486 455.028 476.507 455.08 476.52C460.553 477.842 462.937 473.672 463.418 471.684C463.479 471.429 463.702 471.235 463.964 471.244C492.425 472.28 526.722 473.32 553.5 473.5C624.361 473.976 690.247 470.38 696.514 470.028C696.803 470.012 696.998 470.23 696.995 470.519C694.828 704.223 688.426 1174.1 688.002 1189.91C688 1190.02 687.967 1190.04 687.896 1190.13C678.69 1201.1 638.2 1213.5 560 1214C485.001 1214.48 406.5 1203 406.5 1182Z",
  // overlay 3 — matches /videos/3.webm
  "M405.5 1179.5C405.5 1162.71 407.331 697.755 407.999 467.936C407.999 467.68 408.193 467.48 408.447 467.453C417.346 466.515 425.804 465.575 433.467 465.037C433.755 465.017 434 465.246 434 465.535V470.675C434 470.873 434.097 471.046 434.284 471.11C439.577 472.916 472.229 473.428 476.549 472.645C476.819 472.596 476.844 472.342 476.651 472.146L469.325 464.733C469.016 464.419 469.231 463.887 469.672 463.882C490.921 463.618 515.896 464 555 464C643.75 464 691.049 467.12 696.056 467.469C696.319 467.487 696.498 467.692 696.496 467.955C694.33 701.697 688.421 1175.31 688.002 1190.92C688 1191.02 687.973 1191.04 687.915 1191.12C679.205 1203.09 634.255 1216.5 559.5 1216.5C484.5 1216.5 405.5 1207 405.5 1179.5Z",
];

export const PAIR_COUNT = VASE_PATHS.length;
const GRADIENT_ID = "memory-vase-gradient";

export interface MemoryVaseProps {
  date: Date;
  lat: number;
  pairIdx: number;
}

export function MemoryVase({ date, lat, pairIdx }: MemoryVaseProps) {
  const [canPlayWebM, setCanPlayWebM] = useState<boolean | null>(null);
  const stops = buildVaseGradientStops(date, lat);

  useEffect(() => {
    const v = document.createElement("video");
    setCanPlayWebM(v.canPlayType("video/webm") !== "");
  }, []);

  const oneBased = pairIdx + 1;
  const vasePath = VASE_PATHS[pairIdx];

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
          <radialGradient
            id={GRADIENT_ID}
            cx={FOCUS_X}
            cy={FOCUS_Y}
            r={CURVE_RADIUS}
            fx={FOCUS_X}
            fy={FOCUS_Y}
            gradientUnits="userSpaceOnUse"
          >
            {stops.map((s, i) => (
              <stop
                key={i}
                offset={`${(mapToRadialOffset(s.offset) * 100).toFixed(3)}%`}
                stopColor={s.color}
              />
            ))}
          </radialGradient>
        </defs>
        <path d={vasePath} fill={`url(#${GRADIENT_ID})`} />
      </svg>
    </div>
  );
}
