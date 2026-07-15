import type { NextRequest } from "next/server";
import { apiHandler, jsonError, jsonOk } from "@/lib/api";
import { requireUser } from "@/lib/auth/guard";

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

function component(
  components: AddressComponent[],
  type: string,
): AddressComponent | undefined {
  return components.find((c) => c.types.includes(type));
}

/**
 * GET /api/v1/geo/details?placeId= (§7 v4): resolves a picked suggestion to
 * verified address parts + lat/lng, computed server-side so coordinates are
 * never typed by users.
 */
export const GET = apiHandler(async (request: NextRequest) => {
  await requireUser();
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return jsonError(
      503,
      "Address search is not configured. Set GOOGLE_MAPS_API_KEY to enable it.",
    );
  }

  const placeId = request.nextUrl.searchParams.get("placeId")?.trim();
  if (!placeId) return jsonError(400, "placeId is required.");

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "geometry,address_component,formatted_address");
  url.searchParams.set("key", key);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return jsonError(502, "Address lookup is unavailable right now.");
  const data = (await res.json()) as {
    status: string;
    result?: {
      formatted_address?: string;
      geometry?: { location?: { lat: number; lng: number } };
      address_components?: AddressComponent[];
    };
  };
  if (data.status !== "OK" || !data.result) {
    console.error("[geo] details error:", data.status);
    return jsonError(502, "Address lookup is unavailable right now.");
  }

  const parts = data.result.address_components ?? [];
  const streetNumber = component(parts, "street_number")?.long_name;
  const route = component(parts, "route")?.long_name;
  const addressLine =
    [route, streetNumber].filter(Boolean).join(" ") ||
    data.result.formatted_address ||
    null;

  return jsonOk({
    place: {
      placeId,
      lat: data.result.geometry?.location?.lat ?? null,
      lng: data.result.geometry?.location?.lng ?? null,
      country: component(parts, "country")?.long_name ?? null,
      countryCode: component(parts, "country")?.short_name ?? null,
      state:
        component(parts, "administrative_area_level_1")?.long_name ?? null,
      city:
        component(parts, "locality")?.long_name ??
        component(parts, "postal_town")?.long_name ??
        component(parts, "administrative_area_level_2")?.long_name ??
        null,
      postalCode: component(parts, "postal_code")?.long_name ?? null,
      addressLine,
      formattedAddress: data.result.formatted_address ?? null,
    },
  });
});
