"use client";

import { useEffect, useState } from "react";
import { buildVaseGradient } from "@/components/vase-preview";

const VIDEO_COUNT = 3;

export interface MemoryVaseProps {
  date: Date;
  lat: number;
}

export function MemoryVase({ date, lat }: MemoryVaseProps) {
  // Choose a video on the client only to avoid hydration mismatch.
  const [videoIdx, setVideoIdx] = useState<number | null>(null);

  useEffect(() => {
    setVideoIdx(Math.floor(Math.random() * VIDEO_COUNT) + 1);
  }, []);

  const gradient = buildVaseGradient(date, lat);

  return (
    <div
      style={{
        position: "relative",
        width: "min(90vw, calc(70vh * 4 / 5))",
        aspectRatio: "4 / 5",
        overflow: "hidden",
        background: "#000",
      }}
    >
      {videoIdx !== null && (
        <video
          key={videoIdx}
          src={`/videos/${videoIdx}.mp4`}
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
            objectFit: "cover",
          }}
        />
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: gradient,
          WebkitMaskImage: "url(/overlay.svg)",
          maskImage: "url(/overlay.svg)",
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          mixBlendMode: "multiply",
          pointerEvents: "none",
        }}
        aria-hidden
      />
    </div>
  );
}
