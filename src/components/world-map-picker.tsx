"use client";

import { useEffect, useState } from "react";

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

// Geographic bounds of /map.svg. It spans the full longitude and is cropped
// vertically (no Antarctica). If picks land off, tune LAT_TOP / LAT_BOTTOM.
const LON_MIN = -180;
const LON_MAX = 180;
const LAT_TOP = 83.6;
const LAT_BOTTOM = -58.2;

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
  // Country geometry, only used to name the picked point (not rendered).
  const [features, setFeatures] = useState<Feature[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/world.min.json")
      .then((r) => r.json())
      .then((d: { features: Feature[] }) => {
        if (active) setFeatures(d.features.filter((f) => f.n !== "Antarctica"));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    const lng = LON_MIN + fx * (LON_MAX - LON_MIN);
    const lat = LAT_TOP - fy * (LAT_TOP - LAT_BOTTOM);
    onSelect({ lat, lng, name: countryAt(lng, lat, features) });
  }

  const crossX = value ? ((value.lng - LON_MIN) / (LON_MAX - LON_MIN)) * 100 : 0;
  const crossY = value ? ((LAT_TOP - value.lat) / (LAT_TOP - LAT_BOTTOM)) * 100 : 0;

  return (
    <div
      className="map-picker"
      onClick={handleClick}
      role="button"
      aria-label="pick a location on the world map"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/map.svg" alt="" className="map-picker__img" draggable={false} />
      {value && (
        <>
          <span className="map-picker__cross-v" style={{ left: `${crossX}%` }} aria-hidden />
          <span className="map-picker__cross-h" style={{ top: `${crossY}%` }} aria-hidden />
        </>
      )}
    </div>
  );
}
