"use client";

import { useRef, useState } from "react";
import { MemoryVase } from "@/components/memory-vase";

const SOURCE_WIDTH = 1080;
const SOURCE_HEIGHT = 1350;

// Slide 0 is the personalised vase (MemoryVase). Slides 1..N pull from
// /public/videos/carousel{n}.webm as plain looping background videos.
const CAROUSEL_VIDEOS = ["carousel3", "carousel2", "carousel1"] as const;
/** Bump when carousel .webm files change — busts CDN/browser cache on same paths. */
const CAROUSEL_VIDEO_VERSION = "2";
const TOTAL_SLIDES = 1 + CAROUSEL_VIDEOS.length;
const FADE_MS = 250;
// Minimum horizontal travel (px) to count a touch as a swipe rather than a tap.
const SWIPE_THRESHOLD = 40;

export interface VaseCarouselProps {
  date: Date;
  lat: number;
  pairIdx: number;
}

export function VaseCarousel({ date, lat, pairIdx }: VaseCarouselProps) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const goNext = () => setIndex((i) => (i + 1) % TOTAL_SLIDES);
  const goPrev = () => setIndex((i) => (i - 1 + TOTAL_SLIDES) % TOTAL_SLIDES);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start === null) return;
    const dx = e.changedTouches[0].clientX - start;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return; // a tap, not a swipe
    if (dx < 0) goNext();
    else goPrev();
  }

  return (
    <div
      className="vase-carousel"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
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
            src={`/videos/${name}.webm?v=${CAROUSEL_VIDEO_VERSION}`}
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
              objectFit: "fill",
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
