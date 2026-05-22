"use client";

import { useState } from "react";
import { MemoryVase } from "@/components/memory-vase";

const SOURCE_WIDTH = 1080;
const SOURCE_HEIGHT = 1350;

// Slide 0 is the personalised vase (MemoryVase). Slides 1..N pull from
// /public/videos/carousel{n}.webm as plain looping background videos.
const CAROUSEL_VIDEOS = [
  "carousel1",
  "carousel2",
  "carousel3",
  "carousel4",
  "carousel5",
] as const;
const TOTAL_SLIDES = 1 + CAROUSEL_VIDEOS.length;
const FADE_MS = 250;

export interface VaseCarouselProps {
  date: Date;
  lat: number;
  pairIdx: number;
}

export function VaseCarousel({ date, lat, pairIdx }: VaseCarouselProps) {
  const [index, setIndex] = useState(0);

  const goNext = () => setIndex((i) => (i + 1) % TOTAL_SLIDES);
  const goPrev = () => setIndex((i) => (i - 1 + TOTAL_SLIDES) % TOTAL_SLIDES);

  return (
    <div
      style={{
        position: "relative",
        width: `min(90vw, calc(70vh * 4 / 5))`,
        aspectRatio: "4 / 5",
        overflow: "hidden",
        background: "#000",
        userSelect: "none",
      }}
    >
      {/* Slide 0 — personalised vase + gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: index === 0 ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease`,
          pointerEvents: "none",
        }}
        aria-hidden={index !== 0}
      >
        <MemoryVase date={date} lat={lat} pairIdx={pairIdx} />
      </div>

      {/* Slides 1..N — carousel background videos */}
      {CAROUSEL_VIDEOS.map((name, i) => {
        const slideIdx = i + 1;
        return (
          <video
            key={name}
            src={`/videos/${name}.webm`}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-hidden={index !== slideIdx}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: index === slideIdx ? 1 : 0,
              transition: `opacity ${FADE_MS}ms ease`,
              pointerEvents: "none",
              display: "block",
            }}
          />
        );
      })}

      {/* Left half — previous */}
      <button
        type="button"
        aria-label="Previous slide"
        onClick={goPrev}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "50%",
          height: "100%",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 0,
          margin: 0,
          zIndex: 2,
        }}
      />

      {/* Right half — next */}
      <button
        type="button"
        aria-label="Next slide"
        onClick={goNext}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "50%",
          height: "100%",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 0,
          margin: 0,
          zIndex: 2,
        }}
      />

      {/* Dots */}
      <div
        style={{
          position: "absolute",
          bottom: "clamp(0.75rem, 2.5vw, 1.25rem)",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "0.4rem",
          padding: "0.4rem 0.6rem",
          borderRadius: "999px",
          background: "rgba(0, 0, 0, 0.32)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          pointerEvents: "none",
          zIndex: 3,
        }}
        aria-hidden
      >
        {Array.from({ length: TOTAL_SLIDES }, (_, i) => (
          <span
            key={i}
            style={{
              display: "block",
              width: "0.42rem",
              height: "0.42rem",
              borderRadius: "50%",
              background: i === index ? "#fff" : "rgba(255,255,255,0.45)",
              transition: "background 200ms ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
