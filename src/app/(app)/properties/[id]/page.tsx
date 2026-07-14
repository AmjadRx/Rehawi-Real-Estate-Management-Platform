import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth/guard";
import { loadPropertyDetail } from "@/lib/property-detail";
import { PropertyHeader } from "./property-header";
import { PropertyTabs } from "./property-tabs";
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

  // §7 v2 self-service: admins edit everything; other users edit the
  // properties they created (the API enforces the same rule).
  const canEdit =
    user?.role === "admin" ||
    (!!user && detail.property.createdBy === user.id);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <PropertyHeader
        detail={detail}
        canEdit={canEdit}
        owners={allOwners.map((o) => ({ id: o.id, name: o.name }))}
      />
      <PropertyTabs
        detail={detail}
        canEdit={canEdit}
        allContacts={allContacts.map((c) => ({
          id: c.id,
          name: c.name,
          role: c.role,
          companyName: c.companyName,
        }))}
      />
    </div>
  );
}
