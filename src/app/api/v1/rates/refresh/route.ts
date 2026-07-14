import type { NextRequest } from "next/server";
import { apiHandler, jsonError, jsonOk } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { currentUser } from "@/lib/auth/guard";
import { refreshRates } from "@/lib/rates";

/**
 * POST /api/v1/rates/refresh — admin button, and Vercel Cron daily.
 * Cron authenticates with `Authorization: Bearer ${CRON_SECRET}`; that
 * path bypasses the session (checked here, before the admin guard).
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const isCron = !!cronSecret && auth === `Bearer ${cronSecret}`;

  if (!isCron) {
    const user = await currentUser();
    if (!user || user.role !== "admin") {
      return jsonError(403, "Admin access required.");
    }
  }

  const result = await refreshRates();
  const user = await currentUser();
  if (user) {
    await writeAudit({
      userId: user.id,
      action: "update",
      entityType: "exchange_rate",
      entityId: "*",
      diff: { refreshed: result },
    });
  }
  return jsonOk(result);
});
