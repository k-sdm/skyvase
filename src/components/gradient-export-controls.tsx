"use client";

import { useState } from "react";
import {
  copyLinearGradientCss,
  downloadGradientJson,
  downloadLinearGradientSvg,
  downloadRadialGradientSvg,
} from "@/lib/gradient-export";

interface GradientExportControlsProps {
  date: Date;
  lat: number;
  placeName: string;
}

const linkStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  font: "inherit",
  fontSize: "clamp(0.7rem, 2.2vw, 0.8rem)",
  fontWeight: 300,
  color: "rgba(0,0,0,0.45)",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  cursor: "pointer",
  letterSpacing: "0.02em",
};

export function GradientExportControls({
  date,
  lat,
  placeName,
}: GradientExportControlsProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopyCss() {
    try {
      await copyLinearGradientCss(date, lat);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <p
      style={{
        margin: 0,
        textAlign: "center",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "0.35rem 0.65rem",
        maxWidth: "36ch",
      }}
    >
      <button type="button" style={linkStyle} onClick={handleCopyCss}>
        {copied ? "css copied" : "copy css"}
      </button>
      <span style={{ color: "rgba(0,0,0,0.25)" }} aria-hidden>
        ·
      </span>
      <button
        type="button"
        style={linkStyle}
        onClick={() => downloadLinearGradientSvg(date, lat, placeName)}
      >
        linear svg
      </button>
      <span style={{ color: "rgba(0,0,0,0.25)" }} aria-hidden>
        ·
      </span>
      <button
        type="button"
        style={linkStyle}
        onClick={() => downloadRadialGradientSvg(date, lat, placeName)}
      >
        radial svg
      </button>
      <span style={{ color: "rgba(0,0,0,0.25)" }} aria-hidden>
        ·
      </span>
      <button
        type="button"
        style={linkStyle}
        onClick={() => downloadGradientJson(date, lat, placeName)}
      >
        json
      </button>
    </p>
  );
}
