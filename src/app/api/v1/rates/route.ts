import { asc } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb, tables } from "@/db";
import { apiHandler, jsonOk, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { requireAdmin, requireUser } from "@/lib/auth/guard";
import { upsertManualRate } from "@/lib/rates";
import { rateUpsert } from "@/lib/validation";

export const GET = apiHandler(async () => {
  await requireUser();
  const db = await getDb();
  const rows = await db
    .select()
    .from(tables.exchangeRates)
    .orderBy(asc(tables.exchangeRates.currency));
  return jsonOk({ rates: rows });
});

/** Manual override for currencies the feed lacks (e.g. SYP). Admin only. */
export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireAdmin();
  const data = await parseBody(request, rateUpsert);
  const row = await upsertManualRate(data.currency, data.rateToEur);
  await writeAudit({
    userId: user.id,
    action: "update",
    entityType: "exchange_rate",
    entityId: data.currency,
    diff: { manualRate: data.rateToEur },
  });
  return jsonOk({ rate: row });
});
