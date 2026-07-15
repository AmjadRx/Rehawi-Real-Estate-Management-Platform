/**
 * Free geocoding upstreams for the /api/v1/geo proxy (§7). The proxy
 * contract is unchanged; only the provider behind it varies:
 *
 * - GEOCODER_API_KEY set  → Geoapify (free tier ~3k requests/day).
 * - No key                → Nominatim (OpenStreetMap): zero signup,
 *                           rate-limited, fine for family-scale use.
 *
 * No Google Cloud account is needed anywhere. Keys never ship to clients.
 */

export interface GeoSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface GeoPlace {
  placeId: string;
  lat: number | null;
  lng: number | null;
  country: string | null;
  countryCode: string | null;
  state: string | null;
  city: string | null;
  postalCode: string | null;
  addressLine: string | null;
  formattedAddress: string | null;
}

export function geocoderProvider(): "geoapify" | "nominatim" {
  return process.env.GEOCODER_API_KEY ? "geoapify" : "nominatim";
}

/** Nominatim usage policy requires an identifying User-Agent. */
const NOMINATIM_HEADERS = {
  "User-Agent": "RehawiEstates/1.0 (family portfolio; rehawi.com)",
};

interface NominatimAddress {
  country?: string;
  country_code?: string;
  state?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  postcode?: string;
  road?: string;
  house_number?: string;
}

interface NominatimResult {
  osm_type?: string;
  osm_id?: number;
  lat?: string;
  lon?: string;
  display_name?: string;
  name?: string;
  address?: NominatimAddress;
}

function nominatimPlace(placeId: string, r: NominatimResult): GeoPlace {
  const a = r.address ?? {};
  return {
    placeId,
    lat: r.lat ? parseFloat(r.lat) : null,
    lng: r.lon ? parseFloat(r.lon) : null,
    country: a.country ?? null,
    countryCode: a.country_code?.toUpperCase() ?? null,
    state: a.state ?? null,
    city: a.city ?? a.town ?? a.village ?? a.municipality ?? null,
    postalCode: a.postcode ?? null,
    addressLine:
      [a.road, a.house_number].filter(Boolean).join(" ") ||
      r.display_name ||
      null,
    formattedAddress: r.display_name ?? null,
  };
}

async function nominatimSearch(
  q: string,
  country: string,
): Promise<GeoSuggestion[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");
  if (/^[a-z]{2}$/i.test(country)) {
    url.searchParams.set("countrycodes", country.toLowerCase());
  }
  const res = await fetch(url, { headers: NOMINATIM_HEADERS, cache: "no-store" });
  if (!res.ok) throw new Error(`nominatim search ${res.status}`);
  const data = (await res.json()) as NominatimResult[];
  return data
    .filter((r) => r.osm_type && r.osm_id !== undefined)
    .map((r) => {
      const main = r.name || r.display_name?.split(",")[0] || "";
      return {
        placeId: `osm:${r.osm_type![0].toUpperCase()}${r.osm_id}`,
        description: r.display_name ?? main,
        mainText: main,
        secondaryText:
          r.display_name?.split(",").slice(1).join(",").trim() ?? "",
      };
    });
}

async function nominatimDetails(placeId: string): Promise<GeoPlace | null> {
  const match = /^osm:([NWR])(\d+)$/.exec(placeId);
  if (!match) return null;
  const url = new URL("https://nominatim.openstreetmap.org/lookup");
  url.searchParams.set("osm_ids", `${match[1]}${match[2]}`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  const res = await fetch(url, { headers: NOMINATIM_HEADERS, cache: "no-store" });
  if (!res.ok) throw new Error(`nominatim lookup ${res.status}`);
  const data = (await res.json()) as NominatimResult[];
  if (!data[0]) return null;
  return nominatimPlace(placeId, data[0]);
}

interface GeoapifyProps {
  place_id?: string;
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  lat?: number;
  lon?: number;
  country?: string;
  country_code?: string;
  state?: string;
  city?: string;
  postcode?: string;
  street?: string;
  housenumber?: string;
}

function geoapifyPlace(placeId: string, p: GeoapifyProps): GeoPlace {
  return {
    placeId,
    lat: p.lat ?? null,
    lng: p.lon ?? null,
    country: p.country ?? null,
    countryCode: p.country_code?.toUpperCase() ?? null,
    state: p.state ?? null,
    city: p.city ?? null,
    postalCode: p.postcode ?? null,
    addressLine:
      [p.street, p.housenumber].filter(Boolean).join(" ") ||
      p.address_line1 ||
      null,
    formattedAddress: p.formatted ?? null,
  };
}

async function geoapifySearch(
  q: string,
  country: string,
): Promise<GeoSuggestion[]> {
  const url = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
  url.searchParams.set("text", q);
  url.searchParams.set("limit", "6");
  url.searchParams.set("format", "json");
  url.searchParams.set("apiKey", process.env.GEOCODER_API_KEY!);
  if (/^[a-z]{2}$/i.test(country)) {
    url.searchParams.set("filter", `countrycode:${country.toLowerCase()}`);
  }
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`geoapify search ${res.status}`);
  const data = (await res.json()) as { results?: GeoapifyProps[] };
  return (data.results ?? [])
    .filter((p) => p.place_id)
    .map((p) => ({
      placeId: `gpf:${p.place_id}`,
      description: p.formatted ?? p.address_line1 ?? "",
      mainText: p.address_line1 ?? p.formatted ?? "",
      secondaryText: p.address_line2 ?? "",
    }));
}

async function geoapifyDetails(placeId: string): Promise<GeoPlace | null> {
  const id = placeId.replace(/^gpf:/, "");
  const url = new URL("https://api.geoapify.com/v2/place-details");
  url.searchParams.set("id", id);
  url.searchParams.set("apiKey", process.env.GEOCODER_API_KEY!);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`geoapify details ${res.status}`);
  const data = (await res.json()) as {
    features?: Array<{ properties?: GeoapifyProps }>;
  };
  const props = data.features?.[0]?.properties;
  if (!props) return null;
  return geoapifyPlace(placeId, props);
}

export function geoSearch(q: string, country: string): Promise<GeoSuggestion[]> {
  return geocoderProvider() === "geoapify"
    ? geoapifySearch(q, country)
    : nominatimSearch(q, country);
}

export function geoDetails(placeId: string): Promise<GeoPlace | null> {
  return placeId.startsWith("gpf:")
    ? geoapifyDetails(placeId)
    : nominatimDetails(placeId);
}
