"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MEMORY_VIDEO_VERSION, PAIR_COUNT } from "@/components/memory-vase";
import { VaseCarousel } from "@/components/vase-carousel";
import { Calendar } from "@/components/calendar";
import { WorldMapPicker, type MapSelection } from "@/components/world-map-picker";
import { applyPageChrome } from "@/lib/sky-chrome";

const SkyShader = dynamic(
  () => import("@/components/sky-shader").then((m) => m.SkyShader),
  { ssr: false }
);

const DEFAULT_LAT = 51.5;

function formatLongDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

// Fallback label when a map click lands in the ocean (no country).
function formatCoords(lat: number, lng: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(1)}°${ns}, ${Math.abs(lng).toFixed(1)}°${ew}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDDMMYYYY(d: Date): string {
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function Store() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [place, setPlace] = useState<MapSelection | null>(null);
  const [vaseMode, setVaseMode] = useState(false);
  const [faded, setFaded] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [soldOut, setSoldOut] = useState(false);
  // Pick the video/overlay pair on mount so we can preload the WebM before
  // the user ever clicks through to the vase page.
  const [pairIdx, setPairIdx] = useState<number | null>(null);

  useEffect(() => {
    setPairIdx(Math.floor(Math.random() * PAIR_COUNT));
  }, []);

  useEffect(() => {
    applyPageChrome();
  }, []);

  // Check edition availability when the vase view opens.
  useEffect(() => {
    if (!vaseMode) return;
    let active = true;
    fetch("/api/checkout")
      .then((r) => r.json())
      .then((d) => {
        if (active) setSoldOut(!!d.soldOut);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [vaseMode]);

  const dateForSky = selectedDate ?? new Date();
  const lat = place?.lat ?? DEFAULT_LAT;
  const ready = selectedDate !== null && place !== null;

  const placeLabel = place ? place.name ?? formatCoords(place.lat, place.lng) : "";

  function goToVase() {
    if (!ready) return;
    setFaded(true);
    setTimeout(() => setVaseMode(true), 400);
  }

  function backToSky() {
    setVaseMode(false);
    setTimeout(() => setFaded(false), 50);
  }

  async function handlePurchase() {
    if (!selectedDate || !place || purchasing || soldOut) return;
    setPurchasing(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formatDDMMYYYY(selectedDate),
          location: `${place.lng}, ${place.lat}`,
          placeName: placeLabel,
        }),
      });
      const data = await res.json();
      if (res.status === 409 || data.error === "sold_out") {
        setSoldOut(true);
        setPurchasing(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setPurchasing(false);
    } catch {
      setPurchasing(false);
    }
  }

  return (
    <>
      {!vaseMode && <div className="viewport-bleed sky-backdrop" aria-hidden />}
      <SkyShader />

      {/* Hidden preloader so the WebM is already in cache before the user
          transitions to the vase page. */}
      {pairIdx !== null && !vaseMode && (
        <video
          src={`/videos/${pairIdx + 1}.webm?v=${MEMORY_VIDEO_VERSION}`}
          preload="auto"
          muted
          playsInline
          aria-hidden
          tabIndex={-1}
          style={{
            position: "fixed",
            top: -2,
            left: -2,
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: "none",
          }}
        />
      )}

      <div
        className="viewport-fill"
        style={{
          background: "#ffffff",
          zIndex: 2,
          opacity: faded ? 1 : 0,
          pointerEvents: faded ? "auto" : "none",
          transition: "opacity 0.4s ease",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "clamp(1.25rem, 4vw, 2rem)",
          padding: "clamp(1rem, 5vw, 2rem)",
          color: "#18181b",
          fontFamily: "inherit",
        }}
      >
        {vaseMode && pairIdx !== null && (
          <>
            <VaseCarousel date={dateForSky} lat={lat} pairIdx={pairIdx} />

            <p
              style={{
                fontSize: "clamp(0.95rem, 3.2vw, 1.05rem)",
                color: "#18181b",
                textAlign: "center",
                maxWidth: "36ch",
                lineHeight: 1.55,
                fontWeight: 300,
                letterSpacing: "0.01em",
              }}
            >
              titanium vase anodised with the sky of{" "}
              <button
                type="button"
                onClick={backToSky}
                style={inlineLinkStyle}
                aria-label="edit memory"
              >
                {formatLongDate(dateForSky)} in {place?.name ?? placeLabel}
              </button>
            </p>

            <p
              style={{
                // Matches the description colour and (desktop) size; scales down
                // on narrow phones so the line never wraps or overflows.
                fontSize: "clamp(0.55rem, 2.5vw, 1.05rem)",
                color: "#18181b",
                textAlign: "center",
                whiteSpace: "nowrap",
                lineHeight: 1.55,
                fontWeight: 300,
                letterSpacing: "0.01em",
              }}
            >
              Limited edition of 50, please allow up to 6 weeks before shipping
            </p>

            <button
              type="button"
              onClick={handlePurchase}
              disabled={purchasing || soldOut}
              style={{
                background: "transparent",
                color: "#18181b",
                border: "1px solid #000",
                borderRadius: "9999px",
                padding: "0.95rem 2rem",
                fontFamily: "inherit",
                fontSize: "clamp(0.95rem, 3.2vw, 1.05rem)",
                fontWeight: 300,
                letterSpacing: "0.01em",
                cursor: purchasing || soldOut ? "default" : "pointer",
                opacity: purchasing || soldOut ? 0.6 : 1,
                transition: "opacity 0.2s ease",
              }}
            >
              {soldOut ? "sold out" : purchasing ? "redirecting\u2026" : "purchase"}
            </button>
          </>
        )}
      </div>

      {!vaseMode && (
        <main
          className="viewport-fill"
          style={{
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "clamp(1.25rem, 4vw, 1.75rem)",
            padding: "clamp(1rem, 5vw, 2rem)",
            pointerEvents: "none",
            color: "#ffffff",
          }}
        >
          <p style={promptStyle}>think of a memory</p>

          <Calendar value={selectedDate} onSelect={setSelectedDate} />

          <WorldMapPicker value={place} onSelect={setPlace} />

          <button
            type="button"
            className={`embed-memory-btn${ready ? " is-active" : ""}`}
            onClick={goToVase}
            disabled={!ready}
            aria-label="continue"
            style={{ pointerEvents: "auto" }}
          >
            <span className="embed-memory-btn__glow" aria-hidden>
              <span className="embed-memory-btn__glow-stroke" />
              <span className="embed-memory-btn__glow-stroke embed-memory-btn__glow-stroke--blur" />
            </span>
            <span className="embed-memory-btn__stroke-sharp" aria-hidden />
            continue
          </button>
        </main>
      )}

      {!vaseMode && (
        <footer className="site-footer">
          <a
            href="https://www.instagram.com/kiran.sdm/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Kiran Scott de Martinville on Instagram"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ksdm.svg" alt="KSDM" className="site-footer__logo" />
          </a>
        </footer>
      )}
    </>
  );
}

const inlineLinkStyle: React.CSSProperties = {
  display: "inline",
  background: "transparent",
  border: "none",
  padding: 0,
  margin: 0,
  font: "inherit",
  color: "inherit",
  cursor: "pointer",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  lineHeight: "inherit",
};

// Shared text size — identical to the "embed memory" button so the prompts,
// inputs and button all read at the same scale. Text wraps as needed rather
// than shrinking to fit one line.
const TEXT_SIZE = "clamp(1.15rem, 4.5vw, 1.6rem)";

// Bright, non-italic prompt text — the questions the visitor reads.
const promptStyle: React.CSSProperties = {
  fontSize: TEXT_SIZE,
  lineHeight: 1.35,
  textAlign: "center",
  maxWidth: "28ch",
  letterSpacing: "0.01em",
  fontWeight: 300,
};

// Locked teaser: just the sky shader, no store. Selected per deployment via the
// NEXT_PUBLIC_SITE_MODE env var (set it to "teaser"; anything else = full store).
function Teaser() {
  useEffect(() => {
    applyPageChrome();
  }, []);
  return (
    <>
      <div className="viewport-bleed sky-backdrop" aria-hidden />
      <SkyShader />
    </>
  );
}

export default function Page() {
  if (process.env.NEXT_PUBLIC_SITE_MODE === "teaser") return <Teaser />;
  return <Store />;
}
