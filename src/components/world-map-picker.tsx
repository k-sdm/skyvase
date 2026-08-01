"use client";

import { useEffect, useMemo, useState } from "react";

export interface MapSelection {
  lat: number;
  lng: number;
  name: string | null;
}

type Ring = [number, number][];
type PolygonCoords = Ring[]; // [outer, ...holes]
interface Feature {
  n: string;
  t: "Polygon" | "MultiPolygon";
  c: PolygonCoords | PolygonCoords[];
}
interface WorldData {
  features: Feature[];
}

// Equirectangular projection into a 360 x 180 viewBox (0,0 = top-left = -180,90).
const proj = (lng: number, lat: number): [number, number] => [lng + 180, 90 - lat];

function ringPath(ring: Ring): string {
  let d = "";
  for (let i = 0; i < ring.length; i++) {
    const [x, y] = proj(ring[i][0], ring[i][1]);
    d += `${i === 0 ? "M" : "L"}${x} ${y}`;
  }
  return d + "Z";
}

function featurePath(f: Feature): string {
  if (f.t === "Polygon") return (f.c as PolygonCoords).map(ringPath).join("");
  return (f.c as PolygonCoords[]).map((poly) => poly.map(ringPath).join("")).join("");
}

// Ray-casting point-in-ring; even–odd count across a polygon's rings handles holes.
function ringContains(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function polyContains(lng: number, lat: number, rings: PolygonCoords): boolean {
  let count = 0;
  for (const ring of rings) if (ringContains(lng, lat, ring)) count++;
  return count % 2 === 1;
}

function countryAt(lng: number, lat: number, features: Feature[]): string | null {
  for (const f of features) {
    if (f.t === "Polygon") {
      if (polyContains(lng, lat, f.c as PolygonCoords)) return f.n;
    } else {
      for (const poly of f.c as PolygonCoords[]) {
        if (polyContains(lng, lat, poly)) return f.n;
      }
    }
  }
  return null;
}

export interface WorldMapPickerProps {
  value: MapSelection | null;
  onSelect: (selection: MapSelection) => void;
}

export function WorldMapPicker({ value, onSelect }: WorldMapPickerProps) {
  const [data, setData] = useState<WorldData | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/world.min.json")
      .then((r) => r.json())
      .then((d: WorldData) => {
        if (active) setData(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const paths = useMemo(
    () => (data ? data.features.map((f) => featurePath(f)) : []),
    [data]
  );

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!data) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const lng = px * 360 - 180;
    const lat = 90 - py * 180;
    onSelect({ lat, lng, name: countryAt(lng, lat, data.features) });
  }

  return (
    <div
      className="map-picker"
      onClick={handleClick}
      style={{ opacity: data ? 1 : 0, transition: "opacity 0.5s ease" }}
      role="button"
      aria-label="pick a location on the world map"
    >
      <svg viewBox="0 0 360 180" preserveAspectRatio="none" className="map-picker__svg">
        {paths.map((d, i) => (
          <path key={i} d={d} className="map-picker__land" />
        ))}
      </svg>
      {value && (
        <span
          className="map-picker__pin"
          style={{
            left: `${((value.lng + 180) / 360) * 100}%`,
            top: `${((90 - value.lat) / 180) * 100}%`,
          }}
          aria-hidden
        />
      )}
    </div>
  );
}
