import type { NextRequest } from "next/server";
import { apiHandler, jsonError, jsonOk } from "@/lib/api";
import { requireUser } from "@/lib/auth/guard";

/**
 * GET /api/v1/geo/search?q=&country= (§7 v4): server-side proxy to Google
 * Places Autocomplete. The GOOGLE_MAPS_API_KEY never ships to clients; the
 * app and the wizard call this endpoint instead.
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

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const country = request.nextUrl.searchParams.get("country")?.trim() ?? "";
  if (q.length < 2) return jsonOk({ suggestions: [] });

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/autocomplete/json",
  );
  url.searchParams.set("input", q);
  url.searchParams.set("key", key);
  if (/^[a-z]{2}$/i.test(country)) {
    url.searchParams.set("components", `country:${country.toLowerCase()}`);
  }

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return jsonError(502, "Address search is unavailable right now.");
  const data = (await res.json()) as {
    status: string;
    predictions?: Array<{
      place_id: string;
      description: string;
      structured_formatting?: { main_text?: string; secondary_text?: string };
    }>;
  };
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error("[geo] autocomplete error:", data.status);
    return jsonError(502, "Address search is unavailable right now.");
  }

  return jsonOk({
    suggestions: (data.predictions ?? []).map((p) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text ?? p.description,
      secondaryText: p.structured_formatting?.secondary_text ?? "",
    })),
  });
});
