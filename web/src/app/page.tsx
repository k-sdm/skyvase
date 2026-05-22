"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { VasePreview, DEFAULT_COLOUR_MAP, type ColourStop } from "@/components/vase-preview";

const SkyShader = dynamic(
  () => import("@/components/sky-shader").then((m) => m.SkyShader),
  { ssr: false }
);

const WINTER = { shift: 0.78, stretch: 0.25 };
const SUMMER = { shift: 0.10, stretch: 1.00 };

const DEFAULT_LAT = 51.77;

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

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function Home() {
  const [dayOfYear, setDayOfYear] = useState(() => {
    const now = new Date();
    return Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
    );
  });
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [vaseMode, setVaseMode] = useState(false);
  const [faded, setFaded] = useState(false);
  const [colourMap, setColourMap] = useState<ColourStop[]>(() =>
    DEFAULT_COLOUR_MAP.map((s) => ({ ...s }))
  );

  function updateColour(idx: number, hex: string) {
    setColourMap((prev) => prev.map((s, i) => (i === idx ? { ...s, hex } : s)));
  }

  const date = useMemo(() => {
    const d = new Date(2026, 0, 1);
    d.setDate(dayOfYear);
    return d;
  }, [dayOfYear]);

  const t = dateToT(date, lat);
  const yShift = lerp(WINTER.shift, SUMMER.shift, t);
  const vStretch = lerp(WINTER.stretch, SUMMER.stretch, t);
  const dl = daylightHours(date, lat);

  const labelStyle: React.CSSProperties = {
    fontSize: "0.7rem",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#a1a1aa",
    whiteSpace: "nowrap",
    minWidth: 52,
  };

  const valStyle: React.CSSProperties = {
    minWidth: 52,
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    fontSize: "0.72rem",
    color: "#a1a1aa",
  };

  function toggleVase() {
    if (!vaseMode) {
      setFaded(true);
      setTimeout(() => setVaseMode(true), 400);
    } else {
      setVaseMode(false);
      setTimeout(() => setFaded(false), 50);
    }
  }

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
        {vaseMode && (
          <VasePreview date={date} lat={lat} colourMap={colourMap} />
        )}
      </div>

      <div
        style={{
          position: "fixed",
          bottom: "2rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          background: vaseMode
            ? "rgba(0,0,0,0.08)"
            : "rgba(0,0,0,0.55)",
          backdropFilter: "blur(12px)",
          borderRadius: "12px",
          padding: "0.75rem 1.5rem",
          fontFamily: "system-ui, sans-serif",
          color: vaseMode ? "#18181b" : "#e4e4e7",
          fontSize: "0.82rem",
          minWidth: 380,
          transition: "background 0.4s, color 0.4s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ ...labelStyle, color: vaseMode ? "#71717a" : "#a1a1aa" }}>
            {formatDate(date)}
          </span>
          <input
            type="range"
            min={1}
            max={365}
            step={1}
            value={dayOfYear}
            onChange={(e) => setDayOfYear(parseInt(e.target.value))}
            style={{ flex: 1, accentColor: "#a78bfa" }}
          />
          <span style={{ ...valStyle, color: vaseMode ? "#71717a" : "#a1a1aa" }}>
            {dl.toFixed(1)}h
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ ...labelStyle, color: vaseMode ? "#71717a" : "#a1a1aa" }}>
            Lat
          </span>
          <input
            type="range"
            min={-66}
            max={66}
            step={0.5}
            value={lat}
            onChange={(e) => setLat(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: "#a78bfa" }}
          />
          <span style={{ ...valStyle, color: vaseMode ? "#71717a" : "#a1a1aa" }}>
            {lat.toFixed(1)}°
          </span>
        </div>
        {vaseMode && (
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.35rem",
            marginTop: "0.25rem",
            maxWidth: 380,
          }}>
            {colourMap.map((stop, i) => (
              <label
                key={stop.voltage}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.15rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="color"
                  value={stop.hex}
                  onChange={(e) => updateColour(i, e.target.value)}
                  style={{
                    width: 20,
                    height: 20,
                    border: "1px solid #d4d4d8",
                    borderRadius: 3,
                    padding: 0,
                    cursor: "pointer",
                    background: "none",
                  }}
                />
                <span style={{ fontSize: "0.5rem", color: "#a1a1aa" }}>{stop.voltage}V</span>
              </label>
            ))}
          </div>
        )}
        <button
          onClick={toggleVase}
          style={{
            marginTop: "0.25rem",
            background: vaseMode ? "#a78bfa" : "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: vaseMode ? "#0e0e10" : "#e4e4e7",
            borderRadius: "6px",
            padding: "0.4rem 0.75rem",
            fontFamily: "system-ui, sans-serif",
            fontSize: "0.7rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {vaseMode ? "Full Sky" : "Vase Preview"}
        </button>
      </div>
    </>
  );
}
