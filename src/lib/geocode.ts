/** Open-Meteo geocoding helpers — better ranking for states / regions. */

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  name: string;
  country?: string;
  admin1?: string;
}

interface RawGeocodeResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  admin2?: string;
  population?: number;
  feature_code?: string;
}

const COUNTRY_ALIASES: Record<string, string> = {
  us: "US",
  usa: "US",
  uk: "GB",
  gb: "GB",
  "united states": "US",
  "united states of america": "US",
  "united kingdom": "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
};

/** Geographic centroids for US states (for queries like "utah", "texas"). */
const US_STATE_CENTROIDS: Record<string, { lat: number; lon: number; name: string }> = {
  alabama: { lat: 32.81, lon: -86.79, name: "Alabama" },
  alaska: { lat: 61.37, lon: -152.4, name: "Alaska" },
  arizona: { lat: 33.73, lon: -111.43, name: "Arizona" },
  arkansas: { lat: 34.97, lon: -92.37, name: "Arkansas" },
  california: { lat: 36.12, lon: -119.68, name: "California" },
  colorado: { lat: 39.06, lon: -105.31, name: "Colorado" },
  connecticut: { lat: 41.6, lon: -72.68, name: "Connecticut" },
  delaware: { lat: 39.32, lon: -75.51, name: "Delaware" },
  florida: { lat: 27.77, lon: -81.64, name: "Florida" },
  georgia: { lat: 33.04, lon: -83.64, name: "Georgia" },
  hawaii: { lat: 21.09, lon: -157.5, name: "Hawaii" },
  idaho: { lat: 44.24, lon: -114.48, name: "Idaho" },
  illinois: { lat: 40.35, lon: -88.99, name: "Illinois" },
  indiana: { lat: 39.85, lon: -86.26, name: "Indiana" },
  iowa: { lat: 42.01, lon: -93.21, name: "Iowa" },
  kansas: { lat: 38.53, lon: -96.73, name: "Kansas" },
  kentucky: { lat: 37.67, lon: -84.67, name: "Kentucky" },
  louisiana: { lat: 31.17, lon: -91.87, name: "Louisiana" },
  maine: { lat: 44.69, lon: -69.38, name: "Maine" },
  maryland: { lat: 39.05, lon: -76.64, name: "Maryland" },
  massachusetts: { lat: 42.23, lon: -71.53, name: "Massachusetts" },
  michigan: { lat: 43.33, lon: -84.54, name: "Michigan" },
  minnesota: { lat: 45.69, lon: -93.9, name: "Minnesota" },
  mississippi: { lat: 32.74, lon: -89.68, name: "Mississippi" },
  missouri: { lat: 38.46, lon: -92.29, name: "Missouri" },
  montana: { lat: 46.92, lon: -110.45, name: "Montana" },
  nebraska: { lat: 41.13, lon: -98.04, name: "Nebraska" },
  nevada: { lat: 38.31, lon: -117.06, name: "Nevada" },
  "new hampshire": { lat: 43.45, lon: -71.56, name: "New Hampshire" },
  "new jersey": { lat: 40.06, lon: -74.41, name: "New Jersey" },
  "new mexico": { lat: 34.84, lon: -106.25, name: "New Mexico" },
  "new york": { lat: 42.17, lon: -74.95, name: "New York" },
  "north carolina": { lat: 35.63, lon: -79.81, name: "North Carolina" },
  "north dakota": { lat: 47.53, lon: -99.78, name: "North Dakota" },
  ohio: { lat: 40.39, lon: -82.76, name: "Ohio" },
  oklahoma: { lat: 35.57, lon: -96.93, name: "Oklahoma" },
  oregon: { lat: 44.57, lon: -122.07, name: "Oregon" },
  pennsylvania: { lat: 40.59, lon: -77.21, name: "Pennsylvania" },
  "rhode island": { lat: 41.68, lon: -71.51, name: "Rhode Island" },
  "south carolina": { lat: 33.86, lon: -80.95, name: "South Carolina" },
  "south dakota": { lat: 44.3, lon: -99.44, name: "South Dakota" },
  tennessee: { lat: 35.75, lon: -86.69, name: "Tennessee" },
  texas: { lat: 31.97, lon: -99.9, name: "Texas" },
  utah: { lat: 39.32, lon: -111.09, name: "Utah" },
  vermont: { lat: 44.05, lon: -72.71, name: "Vermont" },
  virginia: { lat: 37.52, lon: -78.85, name: "Virginia" },
  washington: { lat: 47.4, lon: -121.49, name: "Washington" },
  "west virginia": { lat: 38.64, lon: -80.62, name: "West Virginia" },
  wisconsin: { lat: 44.27, lon: -89.62, name: "Wisconsin" },
  wyoming: { lat: 42.76, lon: -107.3, name: "Wyoming" },
  "district of columbia": { lat: 38.91, lon: -77.01, name: "District of Columbia" },
  dc: { lat: 38.91, lon: -77.01, name: "District of Columbia" },
};

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function parsePlaceQuery(input: string): { name: string; countryCode?: string } {
  const trimmed = input.trim();
  const comma = trimmed.lastIndexOf(",");
  if (comma > 0) {
    const place = trimmed.slice(0, comma).trim();
    const countryPart = normalize(trimmed.slice(comma + 1));
    const code = COUNTRY_ALIASES[countryPart];
    if (code && place) return { name: place, countryCode: code };
  }
  return { name: trimmed };
}

function usStateForQuery(query: string): (typeof US_STATE_CENTROIDS)[string] | null {
  const key = normalize(query);
  return US_STATE_CENTROIDS[key] ?? null;
}

function scoreResult(query: string, r: RawGeocodeResult, countryCode?: string): number {
  const q = normalize(query);
  const name = normalize(r.name);
  const admin1 = r.admin1 ? normalize(r.admin1) : "";
  const pop = r.population ?? 0;

  let score = 0;

  if (name === q) score += 1000;
  else if (name.startsWith(q) || q.startsWith(name)) score += 150;

  // "utah" → prefer places in Utah (admin1), not a village named Utah elsewhere
  if (admin1 === q) score += 900;
  else if (admin1 && (admin1.includes(q) || q.includes(admin1))) score += 350;

  score += Math.log10(pop + 1) * 60;

  const fc = r.feature_code ?? "";
  if (fc.startsWith("ADM")) score += 400;
  if (fc === "PPLA" || fc === "PPLA2" || fc === "PPLC") score += 200;

  if (US_STATE_CENTROIDS[q] && r.country_code === "US") score += 500;

  if (countryCode && r.country_code === countryCode) score += 800;
  else if (countryCode && r.country_code !== countryCode) score -= 400;

  // Tiny homonym towns (e.g. Utah, Papua New Guinea)
  if (name === q && admin1 !== q && pop < 50_000) score -= 700;

  return score;
}

function toGeocodingResult(
  query: string,
  r: RawGeocodeResult,
  forceAdmin1Name = false
): GeocodingResult {
  const q = normalize(query);
  const useAdmin1 =
    forceAdmin1Name || (r.admin1 && normalize(r.admin1) === q && normalize(r.name) !== q);

  return {
    latitude: r.latitude,
    longitude: r.longitude,
    name: useAdmin1 ? r.admin1! : r.name,
    country: r.country,
    admin1: useAdmin1 ? undefined : r.admin1,
  };
}

export function pickBestGeocodeResult(
  query: string,
  results: RawGeocodeResult[],
  countryCode?: string
): GeocodingResult | null {
  if (!results.length) return null;

  const q = normalize(query);
  const usState = usStateForQuery(query);

  let best = results[0];
  let bestScore = -Infinity;

  for (const r of results) {
    const s = scoreResult(query, r, countryCode);
    if (s > bestScore) {
      bestScore = s;
      best = r;
    }
  }

  // API often lacks admin1 entries for US states — use centroid when query is a state name
  const admin1Match = results.some((r) => r.admin1 && normalize(r.admin1) === q);
  if (usState && (!admin1Match || bestScore < 1200)) {
    const inState = results
      .filter((r) => r.country_code === "US" && r.admin1 && normalize(r.admin1) === q)
      .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))[0];

    if (inState && (inState.population ?? 0) >= 50_000) {
      return toGeocodingResult(query, inState, true);
    }

    return {
      latitude: usState.lat,
      longitude: usState.lon,
      name: usState.name,
      country: "United States",
    };
  }

  return toGeocodingResult(query, best, normalize(best.admin1 ?? "") === q);
}

/** Words that mean "use my current (rough, IP-based) location". */
export const HERE_QUERIES = new Set([
  "here",
  "my location",
  "current location",
  "where i am",
]);

/** Resolve the visitor's approximate location from Vercel's IP geo headers. */
export async function fetchHere(signal?: AbortSignal): Promise<GeocodingResult | null> {
  const res = await fetch("/api/here", { signal });
  if (!res.ok) return null;
  const data = await res.json();
  if (typeof data?.latitude !== "number" || typeof data?.longitude !== "number") {
    return null;
  }
  return data as GeocodingResult;
}

export async function searchPlace(
  input: string,
  signal?: AbortSignal
): Promise<GeocodingResult | null> {
  const { name, countryCode } = parsePlaceQuery(input);
  if (!name) return null;

  const params = new URLSearchParams({
    name,
    count: "20",
    language: "en",
    format: "json",
  });
  if (countryCode) params.set("countryCode", countryCode);

  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?${params}`,
    { signal }
  );
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.results?.length) {
    const usState = usStateForQuery(name);
    if (usState && (!countryCode || countryCode === "US")) {
      return {
        latitude: usState.lat,
        longitude: usState.lon,
        name: usState.name,
        country: "United States",
      };
    }
    return null;
  }

  return pickBestGeocodeResult(name, data.results, countryCode);
}
