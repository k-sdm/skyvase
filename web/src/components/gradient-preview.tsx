"use client";

import { VOLTAGE_COLOURS } from "@/lib/constants";

interface GradientPreviewProps {
  className?: string;
  dayFraction?: number;
}

/**
 * Renders a CSS gradient approximating the anodisation colour zones.
 * dayFraction 0 = deep winter (mostly blue), 1 = midsummer (broad warm gradient).
 */
export function GradientPreview({
  className = "",
  dayFraction = 0.6,
}: GradientPreviewProps) {
  const nightEnd = Math.round((1 - dayFraction) * 60 + 10);
  const sunsetStart = Math.round(100 - dayFraction * 20 - 10);

  const blue = VOLTAGE_COLOURS[1].colour;
  const teal = VOLTAGE_COLOURS[4].colour;
  const pink = VOLTAGE_COLOURS[5].colour;

  const gradient = `linear-gradient(to bottom, ${blue} 0%, ${blue} ${nightEnd}%, ${teal} ${sunsetStart}%, ${pink} 100%)`;

  return (
    <div
      className={className}
      style={{ background: gradient }}
      role="img"
      aria-label="Anodisation colour gradient preview"
    />
  );
}
