import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb, tables } from "@/db";
import { apiHandler, jsonError, jsonOk } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";

/**
 * POST /api/v1/users/:id/clear-password (admin only, §3.2 v4): the
 * forgotten-password flow. Clearing the hash lets the user repeat
 * first-time setup with the family SETUP_CODE.
 */
export const POST = apiHandler(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const admin = await requireAdmin();
    const { id } = await params;
    const db = await getDb();
    const [row] = await db
      .update(tables.users)
      .set({ passwordHash: null })
      .where(eq(tables.users.id, id))
      .returning();
    if (!row) return jsonError(404, "No such user.");

    await writeAudit({
      userId: admin.id,
      action: "update",
      entityType: "user",
      entityId: id,
      diff: { clearedPassword: true },
    });
    return jsonOk({ cleared: true });
  },
);
