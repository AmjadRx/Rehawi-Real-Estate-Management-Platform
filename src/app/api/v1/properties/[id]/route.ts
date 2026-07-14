import { and, asc, eq, isNull } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb, tables } from "@/db";
import { apiHandler, jsonError, jsonOk, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { requireAdmin, requireUser } from "@/lib/auth/guard";
import { propertyUpdate } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler(async (_request: NextRequest, { params }: Ctx) => {
  await requireUser();
  const { id } = await params;
  const db = await getDb();

  const [property] = await db
    .select()
    .from(tables.properties)
    .where(
      and(eq(tables.properties.id, id), isNull(tables.properties.deletedAt)),
    )
    .limit(1);
  if (!property) return jsonError(404, "Property not found.");

  const [
    ownerLinks,
    payments,
    installments,
    leases,
    income,
    expenses,
    contacts,
    documents,
    constructionUpdates,
    maintenance,
  ] = await Promise.all([
    db
      .select({
        ownerId: tables.propertyOwners.ownerId,
        sharePct: tables.propertyOwners.sharePct,
        isLegalOwner: tables.propertyOwners.isLegalOwner,
        name: tables.owners.name,
        kind: tables.owners.kind,
        isFamily: tables.owners.isFamily,
      })
      .from(tables.propertyOwners)
      .innerJoin(
        tables.owners,
        eq(tables.propertyOwners.ownerId, tables.owners.id),
      )
      .where(eq(tables.propertyOwners.propertyId, id)),
    db
      .select()
      .from(tables.payments)
      .where(eq(tables.payments.propertyId, id))
      .orderBy(asc(tables.payments.paidOn)),
    db
      .select()
      .from(tables.installments)
      .where(eq(tables.installments.propertyId, id))
      .orderBy(asc(tables.installments.dueDate)),
    db.select().from(tables.leases).where(eq(tables.leases.propertyId, id)),
    db
      .select()
      .from(tables.income)
      .where(eq(tables.income.propertyId, id))
      .orderBy(asc(tables.income.receivedOn)),
    db
      .select()
      .from(tables.expenses)
      .where(eq(tables.expenses.propertyId, id))
      .orderBy(asc(tables.expenses.spentOn)),
    db
      .select({
        contact: tables.contacts,
        relationshipNote: tables.propertyContacts.relationshipNote,
      })
      .from(tables.propertyContacts)
      .innerJoin(
        tables.contacts,
        eq(tables.propertyContacts.contactId, tables.contacts.id),
      )
      .where(eq(tables.propertyContacts.propertyId, id)),
    db
      .select()
      .from(tables.documents)
      .where(
        and(
          eq(tables.documents.propertyId, id),
          isNull(tables.documents.deletedAt),
        ),
      ),
    db
      .select()
      .from(tables.constructionUpdates)
      .where(eq(tables.constructionUpdates.propertyId, id))
      .orderBy(asc(tables.constructionUpdates.updateDate)),
    db
      .select()
      .from(tables.maintenance)
      .where(eq(tables.maintenance.propertyId, id)),
  ]);

  return jsonOk({
    property,
    owners: ownerLinks,
    payments,
    installments,
    leases,
    income,
    expenses,
    contacts,
    documents,
    constructionUpdates,
    maintenance,
  });
});

export const PATCH = apiHandler(
  async (request: NextRequest, { params }: Ctx) => {
    const user = await requireAdmin();
    const { id } = await params;
    const data = await parseBody(request, propertyUpdate);
    const db = await getDb();

    const [before] = await db
      .select()
      .from(tables.properties)
      .where(eq(tables.properties.id, id))
      .limit(1);
    if (!before || before.deletedAt) {
      return jsonError(404, "Property not found.");
    }

    const [after] = await db
      .update(tables.properties)
      .set({
        ...data,
        lat: data.lat !== undefined ? (data.lat === null ? null : String(data.lat)) : undefined,
        lng: data.lng !== undefined ? (data.lng === null ? null : String(data.lng)) : undefined,
        sizeSqm:
          data.sizeSqm !== undefined
            ? data.sizeSqm === null
              ? null
              : String(data.sizeSqm)
            : undefined,
        updatedAt: new Date(),
      })
      .where(eq(tables.properties.id, id))
      .returning();

    await writeAudit({
      userId: user.id,
      action: "update",
      entityType: "property",
      entityId: id,
      diff: { patch: data },
    });
    return jsonOk({ property: after });
  },
);

/** Soft delete (§10.5) — recoverable; hard purge is a manual admin operation. */
export const DELETE = apiHandler(
  async (_request: NextRequest, { params }: Ctx) => {
    const user = await requireAdmin();
    const { id } = await params;
    const db = await getDb();
    const [row] = await db
      .update(tables.properties)
      .set({ deletedAt: new Date() })
      .where(
        and(eq(tables.properties.id, id), isNull(tables.properties.deletedAt)),
      )
      .returning();
    if (!row) return jsonError(404, "Property not found.");
    await writeAudit({
      userId: user.id,
      action: "delete",
      entityType: "property",
      entityId: id,
      diff: { softDeleted: true },
    });
    return jsonOk();
  },
);
