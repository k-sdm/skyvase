"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { PAIR_COUNT } from "@/components/memory-vase";
import { VaseCarousel } from "@/components/vase-carousel";
import { applyPageChrome } from "@/lib/sky-chrome";

const SkyShader = dynamic(
  () => import("@/components/sky-shader").then((m) => m.SkyShader),
  { ssr: false }
);

const WINTER = { shift: 0.78, stretch: 0.25 };
const SUMMER = { shift: 0.10, stretch: 1.00 };

const DEFAULT_LAT = 51.5;

function daylightHours(date: Date, lat: number): number {
  const doy = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const decRad = (23.45 * Math.PI) / 180 * Math.sin(((2 * Math.PI) / 365) * (doy - 81));
  const latRad = (lat * Math.PI) / 180;
  const cosHA = (-Math.sin((-0.83 * Math.PI) / 180) - Math.sin(latRad) * Math.sin(decRad))
    / (Math.cos(latRad) * Math.cos(decRad));
  const ha = Math.acos(Math.max(-1, Math.min(1, cosHA)));
  return (2 * ha * 180) / (Math.PI * 15);
}

const MAX_LAT = 66;
const GLOBAL_MIN_DL = daylightHours(new Date(2026, 11, 21), MAX_LAT);
const GLOBAL_MAX_DL = daylightHours(new Date(2026, 5, 21), MAX_LAT);

function dateToT(date: Date, lat: number): number {
  const dl = daylightHours(date, lat);
  const range = GLOBAL_MAX_DL - GLOBAL_MIN_DL;
  return Math.max(0, Math.min(1, (dl - GLOBAL_MIN_DL) / range));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function formatLongDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function monthFromName(s: string): number | null {
  const lower = s.toLowerCase().replace(/\.$/, "");
  if (lower.length < 3) return null;
  for (let i = 0; i < 12; i++) {
    if (MONTH_NAMES[i].startsWith(lower)) return i;
  }
  return null;
}

function isValidYMD(d: Date, y: number, m: number, day: number): boolean {
  return d.getFullYear() === y && d.getMonth() === m && d.getDate() === day;
}

// Parse a wide variety of UK-leaning date formats.
// Returns null when the input cannot confidently be turned into a date.
function parseDateFlexible(input: string): Date | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let m = trimmed.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  if (m) {
    const y = +m[1], mo = +m[2] - 1, d = +m[3];
    const date = new Date(y, mo, d);
    if (isValidYMD(date, y, mo, d)) return date;
  }

  m = trimmed.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{2,4})$/);
  if (m) {
    const d = +m[1], mo = +m[2] - 1;
    let y = +m[3];
    if (y < 100) y += y >= 70 ? 1900 : 2000;
    const date = new Date(y, mo, d);
    if (isValidYMD(date, y, mo, d)) return date;
  }

  const tokens = trimmed.split(/[\s,]+/).filter(Boolean);
  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;

  for (const tok of tokens) {
    const monIdx = monthFromName(tok);
    if (monIdx !== null && month === null) {
      month = monIdx;
      continue;
    }
    const stripped = tok.replace(/(st|nd|rd|th)$/i, "");
    const n = parseInt(stripped, 10);
    if (isNaN(n)) continue;
    if (n >= 1900 && n <= 2100 && year === null) {
      year = n;
    } else if (n >= 1 && n <= 31 && day === null) {
      day = n;
    } else if (year === null) {
      year = n < 100 ? (n >= 70 ? 1900 + n : 2000 + n) : n;
    }
  }

  if (month !== null && day !== null) {
    const y = year ?? new Date().getFullYear();
    const date = new Date(y, month, day);
    if (isValidYMD(date, y, month, day)) return date;
  }

  return null;
}

interface GeocodingResult {
  latitude: number;
  longitude: number;
  name: string;
  country?: string;
  admin1?: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDDMMYYYY(d: Date): string {
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
}

export default function Home() {
  const [dateInput, setDateInput] = useState("");
  const [placeInput, setPlaceInput] = useState("");
  const [resolved, setResolved] = useState<GeocodingResult | null>(null);
  const [vaseMode, setVaseMode] = useState(false);
  const [faded, setFaded] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  // Pick the video/overlay pair on mount so we can preload the WebM before
  // the user ever clicks through to the vase page.
  const [pairIdx, setPairIdx] = useState<number | null>(null);

  useEffect(() => {
    setPairIdx(Math.floor(Math.random() * PAIR_COUNT));
  }, []);

  const parsedDate = useMemo(() => parseDateFlexible(dateInput), [dateInput]);

  useEffect(() => {
    const query = placeInput.trim();
    if (!query) {
      setResolved(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const r = data.results[0];
          setResolved({
            latitude: r.latitude,
            longitude: r.longitude,
            name: r.name,
            country: r.country,
            admin1: r.admin1,
          });
        } else {
          setResolved(null);
        }
      } catch {
        // request aborted or network error; ignore
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [placeInput]);

  const dateForSky = parsedDate ?? new Date();
  const lat = resolved?.latitude ?? DEFAULT_LAT;

  const t = dateToT(dateForSky, lat);
  const yShift = lerp(WINTER.shift, SUMMER.shift, t);
  const vStretch = lerp(WINTER.stretch, SUMMER.stretch, t);

  useEffect(() => {
    applyPageChrome();
  }, []);

  const ready = parsedDate !== null && resolved !== null;

  function goToVase() {
    if (!ready) return;
    setFaded(true);
    setTimeout(() => setVaseMode(true), 400);
  }

  function backToSky() {
    setVaseMode(false);
    setTimeout(() => setFaded(false), 50);
  }

  const placeLabel = resolved
    ? [resolved.name, resolved.admin1, resolved.country].filter(Boolean).join(", ")
    : "";

  async function handlePurchase() {
    if (!parsedDate || !resolved || purchasing) return;
    setPurchasing(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formatDDMMYYYY(parsedDate),
          location: `${resolved.longitude}, ${resolved.latitude}`,
          placeName: placeLabel,
        }),
      });
      const data = await res.json();
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
      <SkyShader yShift={yShift} vStretch={vStretch} />

      {/* Hidden preloader so the WebM is already in cache before the user
          transitions to the vase page. */}
      {pairIdx !== null && !vaseMode && (
        <video
          src={`/videos/${pairIdx + 1}.webm`}
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
              <button
                type="button"
                onClick={backToSky}
                style={inlineLinkStyle}
                aria-label="edit memory"
              >
                {formatLongDate(dateForSky)}
              </button>
              {", "}
              <button
                type="button"
                onClick={backToSky}
                style={inlineLinkStyle}
                aria-label="edit memory"
              >
                {resolved?.name ?? placeLabel}
              </button>
            </p>

            <button
              type="button"
              onClick={handlePurchase}
              disabled={purchasing}
              style={{
                background: "#000",
                color: "#fff",
                border: "none",
                borderRadius: "9999px",
                padding: "0.95rem 2rem",
                fontFamily: "inherit",
                fontSize: "clamp(0.95rem, 3.2vw, 1.05rem)",
                fontWeight: 300,
                letterSpacing: "0.01em",
                cursor: purchasing ? "default" : "pointer",
                opacity: purchasing ? 0.6 : 1,
                width: "clamp(180px, 55vw, 220px)",
                transition: "opacity 0.2s ease",
              }}
            >
              {purchasing ? "redirecting\u2026" : "purchase"}
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
            gap: "clamp(1.5rem, 5vw, 2.5rem)",
            padding: "clamp(1rem, 5vw, 2rem)",
            pointerEvents: "none",
            color: "#ffffff",
          }}
        >
          <p
            style={{
              fontSize: "clamp(1.15rem, 4.5vw, 1.6rem)",
              lineHeight: 1.35,
              textAlign: "center",
              maxWidth: "28ch",
              letterSpacing: "0.01em",
              fontWeight: 300,
            }}
          >
            think back to a moment that means something to you
          </p>

          <input
            className="memory-field"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="enter the date when it happened"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            style={{
              pointerEvents: "auto",
              fontSize: "clamp(1.15rem, 4.5vw, 1.6rem)",
              fontWeight: 300,
              maxWidth: "28ch",
            }}
          />

          <input
            className="memory-field"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="and where you were in the world"
            value={placeInput}
            onChange={(e) => setPlaceInput(e.target.value)}
            style={{
              pointerEvents: "auto",
              fontSize: "clamp(1.15rem, 4.5vw, 1.6rem)",
              fontWeight: 300,
              maxWidth: "28ch",
            }}
          />

          <button
            type="button"
            onClick={goToVase}
            disabled={!ready}
            aria-hidden={!ready}
            aria-label="embed memory"
            style={{
              pointerEvents: ready ? "auto" : "none",
              opacity: ready ? 1 : 0,
              transform: ready ? "translateY(0)" : "translateY(8px)",
              transition: "opacity 0.5s ease, transform 0.5s ease",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: ready ? "pointer" : "default",
              display: "block",
            }}
          >
            <svg
              viewBox="0 0 220 56"
              preserveAspectRatio="xMidYMid meet"
              role="presentation"
              aria-hidden="true"
              style={{
                width: "clamp(180px, 55vw, 220px)",
                height: "auto",
                display: "block",
              }}
            >
              <defs>
                <mask id="embed-memory-cutout">
                  <rect width="220" height="56" fill="#fff" />
                  <text
                    x="110"
                    y="28"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#000"
                    style={{
                      fontFamily: "var(--font-kh-teka), system-ui, sans-serif",
                      fontSize: 20,
                      fontWeight: 300,
                      letterSpacing: "0.01em",
                    }}
                  >
                    embed memory
                  </text>
                </mask>
              </defs>
              <rect
                width="220"
                height="56"
                rx="28"
                ry="28"
                fill="#fff"
                mask="url(#embed-memory-cutout)"
              />
            </svg>
          </button>
        </main>
      )}

      {!vaseMode && (
        <footer className="site-footer">
          A project by{" "}
          <a
            href="https://www.instagram.com/kiran.sdm/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "inherit",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
              pointerEvents: "auto",
            }}
          >
            Kiran Scott de Martinville
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
