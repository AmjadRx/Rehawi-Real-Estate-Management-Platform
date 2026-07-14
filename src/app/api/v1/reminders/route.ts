import { asc } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb, tables } from "@/db";
import { apiHandler, jsonOk, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { requireAdmin, requireUser } from "@/lib/auth/guard";
import { reminderCreate } from "@/lib/validation";

export const GET = apiHandler(async () => {
  await requireUser();
  const db = await getDb();
  const rows = await db
    .select()
    .from(tables.reminders)
    .orderBy(asc(tables.reminders.dueDate));
  return jsonOk({ reminders: rows });
});

export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireAdmin();
  const data = await parseBody(request, reminderCreate);
  const db = await getDb();
  const [row] = await db.insert(tables.reminders).values(data).returning();
  await writeAudit({
    userId: user.id,
    action: "create",
    entityType: "reminder",
    entityId: row.id,
    diff: { created: data },
  });
  return jsonOk({ reminder: row }, { status: 201 });
});
