import type { NextRequest } from "next/server";
import { apiHandler, jsonOk } from "@/lib/api";
import { requireUser } from "@/lib/auth/guard";
import { portfolioSummary } from "@/lib/portfolio";

/** GET /api/v1/portfolio/summary?owner=family|all|<ownerId> (§7) */
export const GET = apiHandler(async (request: NextRequest) => {
  await requireUser();
  const owner = request.nextUrl.searchParams.get("owner") ?? "family";
  const summary = await portfolioSummary(owner);
  return jsonOk({ summary });
});
