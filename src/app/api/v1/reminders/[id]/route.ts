import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb, tables } from "@/db";
import { apiHandler, jsonError, jsonOk, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { reminderUpdate } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = apiHandler(async (request: NextRequest, { params }: Ctx) => {
  const user = await requireAdmin();
  const { id } = await params;
  const data = await parseBody(request, reminderUpdate);
  const db = await getDb();
  const [row] = await db
    .update(tables.reminders)
    .set(data)
    .where(eq(tables.reminders.id, id))
    .returning();
  if (!row) return jsonError(404, "Reminder not found.");
  await writeAudit({
    userId: user.id,
    action: "update",
    entityType: "reminder",
    entityId: id,
    diff: { patch: data },
  });
  return jsonOk({ reminder: row });
});

export const DELETE = apiHandler(async (_r: NextRequest, { params }: Ctx) => {
  const user = await requireAdmin();
  const { id } = await params;
  const db = await getDb();
  const [row] = await db
    .delete(tables.reminders)
    .where(eq(tables.reminders.id, id))
    .returning();
  if (!row) return jsonError(404, "Reminder not found.");
  await writeAudit({
    userId: user.id,
    action: "delete",
    entityType: "reminder",
    entityId: id,
    diff: { deleted: row },
  });
  return jsonOk();
});
