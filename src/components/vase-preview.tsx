"use client";

export interface ColourStop {
  voltage: number;
  hex: string;
}

export const DEFAULT_COLOUR_MAP: ColourStop[] = [
  { voltage: 0,  hex: "#8a8a8a" },
  { voltage: 10, hex: "#8B7355" },
  { voltage: 15, hex: "#6B4C8A" },
  { voltage: 20, hex: "#1a3a6b" },
  { voltage: 25, hex: "#1e5799" },
  { voltage: 30, hex: "#3a8fd4" },
  { voltage: 37, hex: "#5baed6" },
  { voltage: 42, hex: "#a8c4d4" },
  { voltage: 47, hex: "#c0c0c0" },
  { voltage: 50, hex: "#c4a64e" },
  { voltage: 54, hex: "#daa520" },
  { voltage: 58, hex: "#d4843a" },
  { voltage: 64, hex: "#a82020" },
  { voltage: 72, hex: "#882288" },
  { voltage: 80, hex: "#3a2080" },
  { voltage: 90, hex: "#1a4020" },
];

const V1 = 20, V2_START = 20, V2_END = 54, V3 = 64;
const Z1_BASE = 0.25, Z1_RANGE = 0.50, Z3_MIN = 0.015, Z3_MAX = 0.075;

function hexToRgb(h: string): [number, number, number] {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b]
    .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0"))
    .join("");
}

function voltageToColour(v: number, map: ColourStop[]): string {
  if (v <= map[0].voltage) return map[0].hex;
  if (v >= map[map.length - 1].voltage) return map[map.length - 1].hex;
  for (let i = 0; i < map.length - 1; i++) {
    if (v >= map[i].voltage && v <= map[i + 1].voltage) {
      const t = (v - map[i].voltage) / (map[i + 1].voltage - map[i].voltage);
      const a = hexToRgb(map[i].hex);
      const b = hexToRgb(map[i + 1].hex);
      return rgbToHex(a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2]));
    }
  }
  return "#888";
}

function daylightHours(date: Date, lat: number): number {
  const doy = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const decRad = ((23.45 * Math.PI) / 180) * Math.sin(((2 * Math.PI) / 365) * (doy - 81));
  const latRad = (lat * Math.PI) / 180;
  const cosHA =
    (-Math.sin((-0.83 * Math.PI) / 180) - Math.sin(latRad) * Math.sin(decRad)) /
    (Math.cos(latRad) * Math.cos(decRad));
  const ha = Math.acos(Math.max(-1, Math.min(1, cosHA)));
  return (2 * ha * 180) / (Math.PI * 15);
}

function computeZones(date: Date, lat: number) {
  const yr = date.getFullYear();
  const summerDl = daylightHours(new Date(yr, 5, 21), lat);
  const winterDl = daylightHours(new Date(yr, 11, 21), lat);
  const dl = daylightHours(date, lat);
  const range = summerDl - winterDl;
  const t = range > 0 ? (dl - winterDl) / range : 0.5;

  let zone1 = Z1_BASE + Z1_RANGE * (1 - t);
  let zone3 = Z3_MIN + Z3_MAX * t;
  let zone2 = Math.max(0.05, 1 - zone1 - zone3);
  const total = zone1 + zone2 + zone3;
  return { zone1: zone1 / total, zone2: zone2 / total, zone3: zone3 / total };
}

function buildGradientCSS(
  zones: { zone1: number; zone2: number; zone3: number },
  map: ColourStop[],
): string {
  const stops: string[] = [];
  const z1E = zones.zone1 * 100;
  const z2E = (zones.zone1 + zones.zone2) * 100;

  stops.push(`${voltageToColour(V1, map)} 0%`, `${voltageToColour(V1, map)} ${z1E.toFixed(1)}%`);
  for (let i = 0; i <= 12; i++) {
    const f = i / 12;
    const pct = z1E + f * (z2E - z1E);
    const v = V2_START + f * (V2_END - V2_START);
    stops.push(`${voltageToColour(v, map)} ${pct.toFixed(1)}%`);
  }
  stops.push(`${voltageToColour(V3, map)} ${z2E.toFixed(1)}%`, `${voltageToColour(V3, map)} 100%`);
  return `linear-gradient(to bottom, ${stops.join(", ")})`;
}

export interface VasePreviewProps {
  date: Date;
  lat: number;
  colourMap: ColourStop[];
}

export function VasePreview({ date, lat, colourMap }: VasePreviewProps) {
  const zones = computeZones(date, lat);
  const sorted = [...colourMap].sort((a, b) => a.voltage - b.voltage);
  const gradient = buildGradientCSS(zones, sorted);

  return (
    <div
      style={{
        height: "20vh",
        aspectRatio: "8 / 20",
        background: gradient,
        boxShadow:
          "inset -8px 0 20px rgba(255,255,255,0.06), inset 8px 0 14px rgba(0,0,0,0.3), 0 4px 30px rgba(0,0,0,0.15)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.08) 35%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0) 65%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
