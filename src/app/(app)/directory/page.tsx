import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { getDb, tables } from "@/db";
import { currentUser } from "@/lib/auth/guard";
import { DirectoryView } from "./directory-view";

export const metadata: Metadata = { title: "Directory" };
export const dynamic = "force-dynamic";

export default async function DirectoryPage() {
  const [db, user] = await Promise.all([getDb(), currentUser()]);

  const [contacts, links] = await Promise.all([
    db.select().from(tables.contacts).orderBy(asc(tables.contacts.name)),
    db
      .select({
        contactId: tables.propertyContacts.contactId,
        propertyId: tables.propertyContacts.propertyId,
        propertyName: tables.properties.name,
      })
      .from(tables.propertyContacts)
      .innerJoin(
        tables.properties,
        eq(tables.propertyContacts.propertyId, tables.properties.id),
      ),
  ]);

  const linksByContact = new Map<
    string,
    Array<{ id: string; name: string }>
  >();
  for (const link of links) {
    const list = linksByContact.get(link.contactId) ?? [];
    list.push({ id: link.propertyId, name: link.propertyName });
    linksByContact.set(link.contactId, list);
  }

  return (
    <DirectoryView
      contacts={contacts.map((c) => ({
        id: c.id,
        name: c.name,
        companyName: c.companyName,
        role: c.role,
        phones: c.phones,
        email: c.email,
        whatsapp: c.whatsapp,
        website: c.website,
        notes: c.notes,
        properties: linksByContact.get(c.id) ?? [],
      }))}
      isAdmin={user?.role === "admin"}
    />
  );
}
