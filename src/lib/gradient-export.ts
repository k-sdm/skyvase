import {
  buildVaseGradientForExport,
  buildVaseGradientStopsForExport,
  type GradientStop,
} from "@/components/vase-preview";
import {
  buildRadialStopElements,
  mapLinearStopToRadialOffset,
  VASE_RADIAL_GRADIENT,
  VASE_SOURCE_HEIGHT,
  VASE_SOURCE_WIDTH,
} from "@/lib/vase-radial-gradient";

function sanitizeFilenamePart(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function gradientFilename(date: Date, placeName: string, ext: string): string {
  const d = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const place = sanitizeFilenamePart(placeName) || "location";
  return `sky-vase-gradient-${d}-${place}.${ext}`;
}

function downloadText(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function linearStopElements(stops: GradientStop[]): string {
  return stops
    .map(
      (s) =>
        `      <stop offset="${(s.offset * 100).toFixed(2)}%" stop-color="${s.color}" />`
    )
    .join(`\n`);
}

/** Tall linear strip — easiest to recreate as a vertical gradient in Figma. */
export function buildLinearGradientSvg(date: Date, lat: number): string {
  const stops = buildVaseGradientStopsForExport(date, lat);
  const w = 400;
  const h = 1000;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="linear" x1="0" y1="0" x2="0" y2="1">
${linearStopElements(stops)}
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#linear)" />
</svg>`;
}

/** Radial gradient matching the vase overlay (same geometry as the site). */
export function buildRadialGradientSvg(date: Date, lat: number): string {
  const stops = buildVaseGradientStopsForExport(date, lat);
  const { cx, cy, r, fx, fy } = VASE_RADIAL_GRADIENT;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${VASE_SOURCE_WIDTH}" height="${VASE_SOURCE_HEIGHT}" viewBox="0 0 ${VASE_SOURCE_WIDTH} ${VASE_SOURCE_HEIGHT}">
  <defs>
    <radialGradient id="radial" cx="${cx}" cy="${cy}" r="${r}" fx="${fx}" fy="${fy}" gradientUnits="userSpaceOnUse">
${buildRadialStopElements(stops)}
    </radialGradient>
  </defs>
  <rect width="${VASE_SOURCE_WIDTH}" height="${VASE_SOURCE_HEIGHT}" fill="url(#radial)" />
</svg>`;
}

export function buildGradientJson(date: Date, lat: number, placeName: string) {
  const stops = buildVaseGradientStopsForExport(date, lat);
  return JSON.stringify(
    {
      place: placeName,
      date: date.toISOString().slice(0, 10),
      latitude: lat,
      linearCss: buildVaseGradientForExport(date, lat),
      linearStops: stops.map((s) => ({
        offsetPercent: Math.round(s.offset * 1000) / 10,
        color: s.color,
      })),
      stopCount: stops.length,
      radialStops: stops.map((s) => ({
        offsetPercent: Math.round(mapLinearStopToRadialOffset(s.offset) * 1000) / 10,
        color: s.color,
      })),
      radialGeometry: VASE_RADIAL_GRADIENT,
    },
    null,
    2
  );
}

export function copyLinearGradientCss(date: Date, lat: number): Promise<void> {
  return navigator.clipboard.writeText(buildVaseGradientForExport(date, lat));
}

export function downloadLinearGradientSvg(date: Date, lat: number, placeName: string) {
  downloadText(
    buildLinearGradientSvg(date, lat),
    gradientFilename(date, placeName, "linear.svg"),
    "image/svg+xml"
  );
}

export function downloadRadialGradientSvg(date: Date, lat: number, placeName: string) {
  downloadText(
    buildRadialGradientSvg(date, lat),
    gradientFilename(date, placeName, "radial.svg"),
    "image/svg+xml"
  );
}

export function downloadGradientJson(date: Date, lat: number, placeName: string) {
  downloadText(
    buildGradientJson(date, lat, placeName),
    gradientFilename(date, placeName, "json"),
    "application/json"
  );
}
