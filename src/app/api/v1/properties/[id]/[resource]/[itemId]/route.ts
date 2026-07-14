import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { apiHandler, jsonError, jsonOk, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { requireCanEditProperty } from "@/lib/auth/permissions";
import { getSubresource } from "@/lib/subresources";

type Ctx = { params: Promise<{ id: string; resource: string; itemId: string }> };

export const PATCH = apiHandler(
  async (request: NextRequest, { params }: Ctx) => {
    const user = await requireUser();
    const { id, resource, itemId } = await params;
    await requireCanEditProperty(user, id);
    const sub = getSubresource(resource);
    if (!sub) return jsonError(404, "Unknown resource.");
    const data = await parseBody(request, sub.update);
    const db = await getDb();
    const [row] = await db
      .update(sub.table)
      .set(data as object)
      .where(and(eq(sub.table.id, itemId), eq(sub.table.propertyId, id)))
      .returning();
    if (!row) return jsonError(404, "Not found.");
    await writeAudit({
      userId: user.id,
      action: "update",
      entityType: sub.entityType,
      entityId: itemId,
      diff: { patch: data },
    });
    return jsonOk({ item: row });
  },
);

export const DELETE = apiHandler(
  async (_request: NextRequest, { params }: Ctx) => {
    const user = await requireUser();
    const { id, resource, itemId } = await params;
    await requireCanEditProperty(user, id);
    const sub = getSubresource(resource);
    if (!sub) return jsonError(404, "Unknown resource.");
    const db = await getDb();
    const [row] = await db
      .delete(sub.table)
      .where(and(eq(sub.table.id, itemId), eq(sub.table.propertyId, id)))
      .returning();
    if (!row) return jsonError(404, "Not found.");
    await writeAudit({
      userId: user.id,
      action: "delete",
      entityType: sub.entityType,
      entityId: itemId,
      diff: { deleted: row },
    });
    return jsonOk();
  },
);
