import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth/guard";
import { loadPropertyDetail } from "@/lib/property-detail";
import { PropertyDetailView } from "./property-detail-view";
import { getDb, tables } from "@/db";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await loadPropertyDetail(id);
  return { title: detail?.property.name ?? "Property" };
}

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, user, db] = await Promise.all([
    loadPropertyDetail(id),
    currentUser(),
    getDb(),
  ]);
  if (!detail) notFound();

  const allOwners = await db
    .select()
    .from(tables.owners)
    .orderBy(asc(tables.owners.name));
  const allContacts = await db
    .select()
    .from(tables.contacts)
    .orderBy(asc(tables.contacts.name));

  // §3.3 v4: viewers are strictly read-only; editing is admin-only.
  const canEdit = user?.role === "admin";

  return (
    <PropertyDetailView
      detail={detail}
      canEdit={canEdit}
      owners={allOwners.map((o) => ({ id: o.id, name: o.name }))}
      allContacts={allContacts.map((c) => ({
        id: c.id,
        name: c.name,
        role: c.role,
        companyName: c.companyName,
      }))}
    />
  );
}
