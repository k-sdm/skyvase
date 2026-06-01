"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { MEMORY_VIDEO_VERSION, PAIR_COUNT } from "@/components/memory-vase";
import { VaseCarousel } from "@/components/vase-carousel";
import { fetchHere, HERE_QUERIES, searchPlace, type GeocodingResult } from "@/lib/geocode";
import { applyPageChrome } from "@/lib/sky-chrome";

const SkyShader = dynamic(
  () => import("@/components/sky-shader").then((m) => m.SkyShader),
  { ssr: false }
);

const DEFAULT_LAT = 51.5;

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

const NUM_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  couple: 2, few: 3,
};

function parseQuantity(tok: string): number | null {
  if (/^\d+$/.test(tok)) return parseInt(tok, 10);
  return tok in NUM_WORDS ? NUM_WORDS[tok] : null;
}

function shiftByUnit(base: Date, amount: number, unit: string): Date {
  const d = new Date(base);
  if (unit.startsWith("day")) d.setDate(d.getDate() + amount);
  else if (unit.startsWith("week")) d.setDate(d.getDate() + amount * 7);
  else if (unit.startsWith("month")) d.setMonth(d.getMonth() + amount);
  else if (unit.startsWith("year")) d.setFullYear(d.getFullYear() + amount);
  return d;
}

// Interpret relative phrases like "today", "yesterday", "a week ago",
// "3 months ago", "last year". Returns null if the input isn't relative.
function parseRelativeDate(input: string, now: Date): Date | null {
  const s = input.trim().toLowerCase().replace(/[.!]+$/, "");
  if (!s) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (s === "today" || s === "now" || s === "tonight") return today;
  if (s === "yesterday") return shiftByUnit(today, -1, "day");
  if (s === "tomorrow") return shiftByUnit(today, 1, "day");
  if (s === "day before yesterday" || s === "the day before yesterday") {
    return shiftByUnit(today, -2, "day");
  }

  let m = s.match(/^last\s+(day|week|month|year)$/);
  if (m) return shiftByUnit(today, -1, m[1]);

  m = s.match(/^(.+?)\s+(day|days|week|weeks|month|months|year|years)\s+(?:ago|back)$/);
  if (m) {
    const word = m[1].replace(/\s+of$/, "").trim().split(/\s+/).pop() ?? "";
    const n = parseQuantity(word);
    if (n !== null) return shiftByUnit(today, -n, m[2]);
  }

  return null;
}

// Parse a wide variety of UK-leaning date formats.
// Returns null when the input cannot confidently be turned into a date.
function parseDateFlexible(input: string): Date | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const relative = parseRelativeDate(trimmed, new Date());
  if (relative) return relative;

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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDDMMYYYY(d: Date): string {
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function ordinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

// Placeholder hint for the date field, e.g. "1st june 2026".
function formatPlaceholderDate(d: Date): string {
  return `${d.getDate()}${ordinalSuffix(d.getDate())} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
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
  // Location-field placeholder: the visitor's IP-detected city, with a
  // static fallback (only resolves on the deployed Vercel site).
  const [placePlaceholder, setPlacePlaceholder] = useState("London, England");

  const datePlaceholder = formatPlaceholderDate(new Date());

  useEffect(() => {
    setPairIdx(Math.floor(Math.random() * PAIR_COUNT));
  }, []);

  useEffect(() => {
    let active = true;
    fetchHere()
      .then((r) => {
        if (active && r?.name) setPlacePlaceholder(r.name);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
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
        const result = HERE_QUERIES.has(query.toLowerCase())
          ? await fetchHere(controller.signal)
          : await searchPlace(query, controller.signal);
        setResolved(result);
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
              your personal titanium vase anodised with the sky of{" "}
              <button
                type="button"
                onClick={backToSky}
                style={inlineLinkStyle}
                aria-label="edit memory"
              >
                {formatLongDate(dateForSky)} in {resolved?.name ?? placeLabel}
              </button>
            </p>

            <button
              type="button"
              onClick={handlePurchase}
              disabled={purchasing}
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
                cursor: purchasing ? "default" : "pointer",
                opacity: purchasing ? 0.6 : 1,
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
          <p style={promptStyle}>
            think back to a moment that means something to you
          </p>

          <div style={fieldGroupStyle}>
            <p style={promptStyle}>when did it happen?</p>
            <input
              className="memory-field"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder={datePlaceholder}
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              style={fieldStyle}
            />
          </div>

          <div style={fieldGroupStyle}>
            <p style={promptStyle}>and where were you in the world?</p>
            <input
              className="memory-field"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder={placePlaceholder}
              value={placeInput}
              onChange={(e) => setPlaceInput(e.target.value)}
              style={fieldStyle}
            />
          </div>

          <button
            type="button"
            className="embed-memory-btn"
            onClick={goToVase}
            disabled={!ready}
            aria-label="embed memory"
            style={{ pointerEvents: "auto" }}
          >
            <span className="embed-memory-btn__glow" aria-hidden>
              <span className="embed-memory-btn__glow-stroke" />
              <span className="embed-memory-btn__glow-stroke embed-memory-btn__glow-stroke--blur" />
            </span>
            <span className="embed-memory-btn__stroke-sharp" aria-hidden />
            embed memory
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

// Bright, non-italic prompt text — the questions the visitor reads.
const promptStyle: React.CSSProperties = {
  fontSize: "clamp(1.15rem, 4.5vw, 1.6rem)",
  lineHeight: 1.35,
  textAlign: "center",
  maxWidth: "28ch",
  letterSpacing: "0.01em",
  fontWeight: 300,
};

// Stacks a prompt directly above its input on its own line.
const fieldGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "0.5rem",
  width: "100%",
  maxWidth: "28ch",
};

const fieldStyle: React.CSSProperties = {
  pointerEvents: "auto",
  fontSize: "clamp(1.15rem, 4.5vw, 1.6rem)",
  fontWeight: 300,
  maxWidth: "28ch",
};
