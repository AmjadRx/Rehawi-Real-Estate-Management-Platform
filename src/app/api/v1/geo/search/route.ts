import type { NextRequest } from "next/server";
import { apiHandler, jsonError, jsonOk } from "@/lib/api";
import { requireUser } from "@/lib/auth/guard";
import { geoSearch } from "@/lib/geocoder";

/**
 * GET /api/v1/geo/search?q=&country= (§7): server-side address search.
 * Upstream is a free geocoder (Nominatim by default, Geoapify when
 * GEOCODER_API_KEY is set); no key ever ships to clients.
 */
export const GET = apiHandler(async (request: NextRequest) => {
  await requireUser();
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const country = request.nextUrl.searchParams.get("country")?.trim() ?? "";
  if (q.length < 2) return jsonOk({ suggestions: [] });

  try {
    return jsonOk({ suggestions: await geoSearch(q, country) });
  } catch (error) {
    console.error("[geo] search failed:", error);
    return jsonError(502, "Address search is unavailable right now.");
  }
});
