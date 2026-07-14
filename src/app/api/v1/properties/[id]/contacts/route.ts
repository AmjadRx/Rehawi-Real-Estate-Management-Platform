import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb, tables } from "@/db";
import { apiHandler, jsonError, jsonOk, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { requireCanEditProperty } from "@/lib/auth/permissions";
import { propertyContactLink } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler(async (_request: NextRequest, { params }: Ctx) => {
  await requireUser();
  const { id } = await params;
  const db = await getDb();
  const rows = await db
    .select({
      contact: tables.contacts,
      relationshipNote: tables.propertyContacts.relationshipNote,
    })
    .from(tables.propertyContacts)
    .innerJoin(
      tables.contacts,
      eq(tables.propertyContacts.contactId, tables.contacts.id),
    )
    .where(eq(tables.propertyContacts.propertyId, id));
  return jsonOk({ contacts: rows });
});

export const POST = apiHandler(async (request: NextRequest, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  await requireCanEditProperty(user, id);
  const data = await parseBody(request, propertyContactLink);
  const db = await getDb();
  await db
    .insert(tables.propertyContacts)
    .values({
      propertyId: id,
      contactId: data.contactId,
      relationshipNote: data.relationshipNote ?? null,
    })
    .onConflictDoNothing();
  await writeAudit({
    userId: user.id,
    action: "create",
    entityType: "property_contact",
    entityId: `${id}:${data.contactId}`,
  });
  return jsonOk({}, { status: 201 });
});

export const DELETE = apiHandler(
  async (request: NextRequest, { params }: Ctx) => {
    const user = await requireUser();
    const { id } = await params;
    await requireCanEditProperty(user, id);
    const contactId = request.nextUrl.searchParams.get("contactId");
    if (!contactId) return jsonError(400, "contactId is required.");
    const db = await getDb();
    await db
      .delete(tables.propertyContacts)
      .where(
        and(
          eq(tables.propertyContacts.propertyId, id),
          eq(tables.propertyContacts.contactId, contactId),
        ),
      );
    await writeAudit({
      userId: user.id,
      action: "delete",
      entityType: "property_contact",
      entityId: `${id}:${contactId}`,
    });
    return jsonOk();
  },
);
