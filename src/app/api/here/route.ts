import { NextRequest, NextResponse } from "next/server";
import type { GeocodingResult } from "@/lib/geocode";

// Reads Vercel's per-request IP geolocation headers, so this must run at
// request time rather than being prerendered.
export const dynamic = "force-dynamic";

function decode(value: string | null): string | undefined {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function GET(req: NextRequest) {
  const h = req.headers;
  const lat = parseFloat(h.get("x-vercel-ip-latitude") ?? "");
  const lon = parseFloat(h.get("x-vercel-ip-longitude") ?? "");

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "location unavailable" }, { status: 404 });
  }

  const city = decode(h.get("x-vercel-ip-city"));
  const region = decode(h.get("x-vercel-ip-country-region"));

  const result: GeocodingResult = {
    latitude: lat,
    longitude: lon,
    name: city ?? region ?? "your location",
  };

  return NextResponse.json(result);
}
