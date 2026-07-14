import type { NextRequest } from "next/server";
import { z } from "zod";
import { getDb, tables } from "@/db";
import { apiHandler, jsonOk, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { requireAdmin, requireUser } from "@/lib/auth/guard";

const schema = z.object({
  baseCurrency: z.string().length(3).transform((s) => s.toUpperCase()),
});

export const GET = apiHandler(async () => {
  await requireUser();
  const db = await getDb();
  const rows = await db.select().from(tables.settings);
  return jsonOk({
    settings: Object.fromEntries(rows.map((r) => [r.key, r.value])),
  });
});

export const PUT = apiHandler(async (request: NextRequest) => {
  const user = await requireAdmin();
  const data = await parseBody(request, schema);
  const db = await getDb();
  await db
    .insert(tables.settings)
    .values({ key: "base_currency", value: data.baseCurrency })
    .onConflictDoUpdate({
      target: tables.settings.key,
      set: { value: data.baseCurrency },
    });
  await writeAudit({
    userId: user.id,
    action: "update",
    entityType: "settings",
    entityId: "base_currency",
    diff: { baseCurrency: data.baseCurrency },
  });
  return jsonOk({ baseCurrency: data.baseCurrency });
});
