import type { NextRequest } from "next/server";
import { apiHandler, jsonError, jsonOk } from "@/lib/api";
import { requireUser } from "@/lib/auth/guard";
import { geoDetails } from "@/lib/geocoder";

/**
 * GET /api/v1/geo/details?placeId= (§7): resolves a picked suggestion to
 * verified address parts + lat/lng, computed server-side, never typed by
 * users. Provider-agnostic: works with Nominatim and Geoapify IDs.
 */
export const GET = apiHandler(async (request: NextRequest) => {
  await requireUser();
  const placeId = request.nextUrl.searchParams.get("placeId")?.trim();
  if (!placeId) return jsonError(400, "placeId is required.");

  try {
    const place = await geoDetails(placeId);
    if (!place) return jsonError(404, "That place could not be resolved.");
    return jsonOk({ place });
  } catch (error) {
    console.error("[geo] details failed:", error);
    return jsonError(502, "Address lookup is unavailable right now.");
  }
});
