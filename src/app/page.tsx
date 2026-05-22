"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { VasePreview } from "@/components/vase-preview";

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

export default function Home() {
  const [dateInput, setDateInput] = useState("");
  const [placeInput, setPlaceInput] = useState("");
  const [resolved, setResolved] = useState<GeocodingResult | null>(null);
  const [vaseMode, setVaseMode] = useState(false);
  const [faded, setFaded] = useState(false);

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

  return (
    <>
      <SkyShader yShift={yShift} vStretch={vStretch} />

      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#ffffff",
          zIndex: 2,
          opacity: faded ? 1 : 0,
          pointerEvents: faded ? "auto" : "none",
          transition: "opacity 0.4s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {vaseMode && <VasePreview date={dateForSky} lat={lat} />}
      </div>

      {!vaseMode && (
        <main
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 5,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2.5rem",
            padding: "2rem",
            pointerEvents: "none",
            color: "#ffffff",
          }}
        >
          <p
            style={{
              fontSize: "1.6rem",
              lineHeight: 1.35,
              textAlign: "center",
              maxWidth: "32ch",
              letterSpacing: "0.01em",
              fontWeight: 300,
            }}
          >
            think back to a memory in your life that&apos;s important to you
          </p>

          <input
            className="memory-field"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="enter the day when it happened"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            style={{
              pointerEvents: "auto",
              fontSize: "1.6rem",
              fontWeight: 300,
              maxWidth: "32ch",
            }}
          />

          <input
            className="memory-field"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="and where in the world it happened"
            value={placeInput}
            onChange={(e) => setPlaceInput(e.target.value)}
            style={{
              pointerEvents: "auto",
              fontSize: "1.6rem",
              fontWeight: 300,
              maxWidth: "32ch",
            }}
          />

          <button
            type="button"
            onClick={goToVase}
            disabled={!ready}
            aria-hidden={!ready}
            style={{
              pointerEvents: ready ? "auto" : "none",
              opacity: ready ? 1 : 0,
              transform: ready ? "translateY(0)" : "translateY(8px)",
              transition: "opacity 0.5s ease, transform 0.5s ease",
              background: "#ffffff",
              color: "#000000",
              border: "none",
              borderRadius: "9999px",
              padding: "0.8rem 2.2rem",
              fontFamily: "inherit",
              fontSize: "1.2rem",
              fontWeight: 300,
              cursor: ready ? "pointer" : "default",
              mixBlendMode: "screen",
            }}
          >
            see your vase
          </button>
        </main>
      )}

      {vaseMode && (
        <div
          style={{
            position: "fixed",
            bottom: "2rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
            fontFamily: "inherit",
            color: "#18181b",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "1rem", lineHeight: 1.3 }}>
            {formatLongDate(dateForSky)}
          </div>
          <div style={{ fontSize: "0.85rem", color: "#71717a" }}>{placeLabel}</div>
          <button
            onClick={backToSky}
            style={{
              marginTop: "0.5rem",
              background: "transparent",
              border: "none",
              color: "#71717a",
              fontFamily: "inherit",
              fontSize: "0.85rem",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            edit memory
          </button>
        </div>
      )}
    </>
  );
}
