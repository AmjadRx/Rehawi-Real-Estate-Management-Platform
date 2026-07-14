import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb, tables } from "@/db";
import { apiHandler, jsonError, jsonOk, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { requireAdmin, requireUser } from "@/lib/auth/guard";
import { ownerUpdate } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler(async (_r: NextRequest, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const db = await getDb();
  const [row] = await db
    .select()
    .from(tables.owners)
    .where(eq(tables.owners.id, id))
    .limit(1);
  if (!row) return jsonError(404, "Owner not found.");
  // Bank details are admin-only (§4 v2).
  if (user.role !== "admin") {
    const { bankDetails: _bankDetails, ...rest } = row;
    return jsonOk({ owner: rest });
  }
  return jsonOk({ owner: row });
});

export const PATCH = apiHandler(async (request: NextRequest, { params }: Ctx) => {
  const user = await requireAdmin();
  const { id } = await params;
  const data = await parseBody(request, ownerUpdate);
  const db = await getDb();
  const [row] = await db
    .update(tables.owners)
    .set(data)
    .where(eq(tables.owners.id, id))
    .returning();
  if (!row) return jsonError(404, "Owner not found.");
  await writeAudit({
    userId: user.id,
    action: "update",
    entityType: "owner",
    entityId: id,
    diff: { patch: data },
  });
  return jsonOk({ owner: row });
});

export const DELETE = apiHandler(async (_r: NextRequest, { params }: Ctx) => {
  const user = await requireAdmin();
  const { id } = await params;
  const db = await getDb();
  const links = await db
    .select()
    .from(tables.propertyOwners)
    .where(eq(tables.propertyOwners.ownerId, id))
    .limit(1);
  if (links.length > 0) {
    return jsonError(
      409,
      "This owner still holds property shares. Reassign them first.",
    );
  }
  const [row] = await db
    .delete(tables.owners)
    .where(eq(tables.owners.id, id))
    .returning();
  if (!row) return jsonError(404, "Owner not found.");
  await writeAudit({
    userId: user.id,
    action: "delete",
    entityType: "owner",
    entityId: id,
    diff: { deleted: row },
  });
  return jsonOk();
});
