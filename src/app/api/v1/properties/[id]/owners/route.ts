import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb, tables } from "@/db";
import { apiHandler, jsonError, jsonOk, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { requireAdmin, requireUser } from "@/lib/auth/guard";
import { propertyOwnerSet } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler(async (_request: NextRequest, { params }: Ctx) => {
  await requireUser();
  const { id } = await params;
  const db = await getDb();
  const rows = await db
    .select({
      ownerId: tables.propertyOwners.ownerId,
      sharePct: tables.propertyOwners.sharePct,
      isLegalOwner: tables.propertyOwners.isLegalOwner,
      name: tables.owners.name,
      kind: tables.owners.kind,
      isFamily: tables.owners.isFamily,
    })
    .from(tables.propertyOwners)
    .innerJoin(tables.owners, eq(tables.propertyOwners.ownerId, tables.owners.id))
    .where(eq(tables.propertyOwners.propertyId, id));
  return jsonOk({ owners: rows });
});

/**
 * Replace the full owner/share set for a property. Shares must sum to 100
 * (validated by schema). PUT semantics keep share math atomic and simple.
 */
export const PUT = apiHandler(async (request: NextRequest, { params }: Ctx) => {
  const user = await requireAdmin();
  const { id } = await params;
  const data = await parseBody(request, propertyOwnerSet);
  const db = await getDb();

  const [property] = await db
    .select({ id: tables.properties.id })
    .from(tables.properties)
    .where(eq(tables.properties.id, id))
    .limit(1);
  if (!property) return jsonError(404, "Property not found.");

  await db
    .delete(tables.propertyOwners)
    .where(eq(tables.propertyOwners.propertyId, id));
  await db.insert(tables.propertyOwners).values(
    data.owners.map((o) => ({
      propertyId: id,
      ownerId: o.ownerId,
      sharePct: String(o.sharePct),
      isLegalOwner: o.isLegalOwner,
    })),
  );

  await writeAudit({
    userId: user.id,
    action: "update",
    entityType: "property_owners",
    entityId: id,
    diff: { set: data.owners },
  });
  return jsonOk({ owners: data.owners });
});
