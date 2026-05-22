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

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatLongDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

interface GeocodingResult {
  latitude: number;
  longitude: number;
  name: string;
  country?: string;
  admin1?: string;
}

async function geocodeLocation(query: string): Promise<GeocodingResult | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  const r = data.results[0];
  return {
    latitude: r.latitude,
    longitude: r.longitude,
    name: r.name,
    country: r.country,
    admin1: r.admin1,
  };
}

export default function Home() {
  const [dateStr, setDateStr] = useState(() => toISODate(new Date()));
  const [locationInput, setLocationInput] = useState("");
  const [resolved, setResolved] = useState<GeocodingResult | null>(null);
  const [vaseMode, setVaseMode] = useState(false);
  const [faded, setFaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const date = useMemo(() => new Date(dateStr + "T12:00:00"), [dateStr]);
  const lat = resolved?.latitude ?? DEFAULT_LAT;

  const t = dateToT(date, lat);
  const yShift = lerp(WINTER.shift, SUMMER.shift, t);
  const vStretch = lerp(WINTER.stretch, SUMMER.stretch, t);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = locationInput.trim();
    if (!trimmed) {
      setError("Enter a place name.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await geocodeLocation(trimmed);
      if (!result) {
        setError("Couldn't find that place. Try a city or town name.");
        return;
      }
      setResolved(result);
      setFaded(true);
      setTimeout(() => setVaseMode(true), 400);
    } catch {
      setError("Something went wrong looking up that location.");
    } finally {
      setLoading(false);
    }
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
        {vaseMode && <VasePreview date={date} lat={lat} />}
      </div>

      {!vaseMode ? (
        <form
          onSubmit={handleSubmit}
          style={{
            position: "fixed",
            bottom: "2rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(12px)",
            borderRadius: "12px",
            padding: "1.1rem 1.5rem",
            fontFamily: "system-ui, sans-serif",
            color: "#e4e4e7",
            fontSize: "0.82rem",
            width: "min(440px, calc(100vw - 2rem))",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.85rem",
              lineHeight: 1.45,
              color: "#e4e4e7",
            }}
          >
            Think of a memory important to you, and enter the day and place
            where it happened.
          </p>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              required
              style={inputStyle}
            />
            <input
              type="text"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="e.g. London"
              required
              style={{ ...inputStyle, flex: 1, minWidth: 140 }}
            />
          </div>

          {error && (
            <span style={{ fontSize: "0.72rem", color: "#fca5a5" }}>{error}</span>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? "rgba(167,139,250,0.5)" : "#a78bfa",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#0e0e10",
              borderRadius: "6px",
              padding: "0.55rem 0.75rem",
              fontFamily: "system-ui, sans-serif",
              fontSize: "0.72rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: loading ? "default" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {loading ? "Finding place\u2026" : "See your vase"}
          </button>
        </form>
      ) : (
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
            gap: "0.6rem",
            background: "rgba(0,0,0,0.04)",
            backdropFilter: "blur(8px)",
            borderRadius: "12px",
            padding: "0.75rem 1.25rem",
            fontFamily: "system-ui, sans-serif",
            color: "#18181b",
            fontSize: "0.82rem",
            textAlign: "center",
          }}
        >
          <div style={{ lineHeight: 1.4 }}>
            <div style={{ fontWeight: 500 }}>{formatLongDate(date)}</div>
            <div style={{ color: "#71717a", fontSize: "0.74rem" }}>{placeLabel}</div>
          </div>
          <button
            onClick={backToSky}
            style={{
              background: "transparent",
              border: "1px solid rgba(0,0,0,0.15)",
              color: "#18181b",
              borderRadius: "6px",
              padding: "0.4rem 0.85rem",
              fontFamily: "system-ui, sans-serif",
              fontSize: "0.68rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Edit memory
          </button>
        </div>
      )}
    </>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "#e4e4e7",
  borderRadius: "6px",
  padding: "0.45rem 0.65rem",
  fontFamily: "system-ui, sans-serif",
  fontSize: "0.78rem",
  outline: "none",
  colorScheme: "dark",
};
