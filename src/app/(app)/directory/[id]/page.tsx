import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, tables } from "@/db";
import { currentUser } from "@/lib/auth/guard";
import { ContactProfile } from "./contact-profile";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const db = await getDb();
  const [contact] = await db
    .select({ name: tables.contacts.name })
    .from(tables.contacts)
    .where(eq(tables.contacts.id, id))
    .limit(1);
  return { title: contact?.name ?? "Contact" };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [db, user] = await Promise.all([getDb(), currentUser()]);

  const [contact] = await db
    .select()
    .from(tables.contacts)
    .where(eq(tables.contacts.id, id))
    .limit(1);
  if (!contact) notFound();

  const [links, documents] = await Promise.all([
    db
      .select({
        propertyId: tables.propertyContacts.propertyId,
        relationshipNote: tables.propertyContacts.relationshipNote,
        name: tables.properties.name,
        city: tables.properties.city,
        country: tables.properties.country,
      })
      .from(tables.propertyContacts)
      .innerJoin(
        tables.properties,
        eq(tables.propertyContacts.propertyId, tables.properties.id),
      )
      .where(eq(tables.propertyContacts.contactId, id)),
    db
      .select()
      .from(tables.documents)
      .where(
        and(
          eq(tables.documents.contactId, id),
          isNull(tables.documents.deletedAt),
        ),
      ),
  ]);

  return (
    <ContactProfile
      contact={{
        id: contact.id,
        name: contact.name,
        companyName: contact.companyName,
        role: contact.role,
        phones: contact.phones,
        email: contact.email,
        whatsapp: contact.whatsapp,
        address: contact.address,
        website: contact.website,
        notes: contact.notes,
      }}
      properties={links.map((l) => ({
        id: l.propertyId,
        name: l.name,
        city: l.city,
        country: l.country,
        relationshipNote: l.relationshipNote,
      }))}
      documents={documents.map((d) => ({
        id: d.id,
        filename: d.filename,
        category: d.category,
        uploadedAt: d.uploadedAt.toISOString(),
      }))}
      isAdmin={user?.role === "admin"}
    />
  );
}
