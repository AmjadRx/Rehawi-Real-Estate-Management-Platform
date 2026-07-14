import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb, tables } from "@/db";
import { apiHandler, jsonError, jsonOk, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { requireAdmin, requireUser } from "@/lib/auth/guard";
import { contactUpdate } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler(async (_r: NextRequest, { params }: Ctx) => {
  await requireUser();
  const { id } = await params;
  const db = await getDb();
  const [contact] = await db
    .select()
    .from(tables.contacts)
    .where(eq(tables.contacts.id, id))
    .limit(1);
  if (!contact) return jsonError(404, "Contact not found.");
  const properties = await db
    .select({
      propertyId: tables.propertyContacts.propertyId,
      relationshipNote: tables.propertyContacts.relationshipNote,
      name: tables.properties.name,
    })
    .from(tables.propertyContacts)
    .innerJoin(
      tables.properties,
      eq(tables.propertyContacts.propertyId, tables.properties.id),
    )
    .where(eq(tables.propertyContacts.contactId, id));
  return jsonOk({ contact, properties });
});

export const PATCH = apiHandler(async (request: NextRequest, { params }: Ctx) => {
  const user = await requireAdmin();
  const { id } = await params;
  const data = await parseBody(request, contactUpdate);
  const db = await getDb();
  const [row] = await db
    .update(tables.contacts)
    .set(data)
    .where(eq(tables.contacts.id, id))
    .returning();
  if (!row) return jsonError(404, "Contact not found.");
  await writeAudit({
    userId: user.id,
    action: "update",
    entityType: "contact",
    entityId: id,
    diff: { patch: data },
  });
  return jsonOk({ contact: row });
});

export const DELETE = apiHandler(async (_r: NextRequest, { params }: Ctx) => {
  const user = await requireAdmin();
  const { id } = await params;
  const db = await getDb();
  await db
    .delete(tables.propertyContacts)
    .where(eq(tables.propertyContacts.contactId, id));
  const [row] = await db
    .delete(tables.contacts)
    .where(eq(tables.contacts.id, id))
    .returning();
  if (!row) return jsonError(404, "Contact not found.");
  await writeAudit({
    userId: user.id,
    action: "delete",
    entityType: "contact",
    entityId: id,
    diff: { deleted: row },
  });
  return jsonOk();
});
