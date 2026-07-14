import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, tables } from "@/db";
import { currentUser } from "@/lib/auth/guard";
import { OwnerProfile } from "./owner-profile";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const db = await getDb();
  const [owner] = await db
    .select({ name: tables.owners.name })
    .from(tables.owners)
    .where(eq(tables.owners.id, id))
    .limit(1);
  return { title: owner?.name ?? "Owner" };
}

export default async function OwnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [db, user] = await Promise.all([getDb(), currentUser()]);

  const [owner] = await db
    .select()
    .from(tables.owners)
    .where(eq(tables.owners.id, id))
    .limit(1);
  if (!owner) notFound();

  const [links, documents] = await Promise.all([
    db
      .select({
        propertyId: tables.propertyOwners.propertyId,
        sharePct: tables.propertyOwners.sharePct,
        isLegalOwner: tables.propertyOwners.isLegalOwner,
        name: tables.properties.name,
        city: tables.properties.city,
        country: tables.properties.country,
      })
      .from(tables.propertyOwners)
      .innerJoin(
        tables.properties,
        eq(tables.propertyOwners.propertyId, tables.properties.id),
      )
      .where(eq(tables.propertyOwners.ownerId, id)),
    db
      .select()
      .from(tables.documents)
      .where(
        and(eq(tables.documents.ownerId, id), isNull(tables.documents.deletedAt)),
      ),
  ]);

  const isAdmin = user?.role === "admin";

  return (
    <OwnerProfile
      owner={{
        id: owner.id,
        kind: owner.kind,
        name: owner.name,
        isFamily: owner.isFamily,
        email: owner.email,
        phones: owner.phones ?? [],
        socialLinks: (owner.socialLinks ?? {}) as Record<string, string>,
        // Bank details are admin-only (§4 v2): never rendered for viewers.
        bankDetails: isAdmin
          ? ((owner.bankDetails ?? {}) as Record<string, string>)
          : null,
        notes: owner.notes,
      }}
      properties={links.map((l) => ({
        id: l.propertyId,
        name: l.name,
        city: l.city,
        country: l.country,
        sharePct: parseFloat(l.sharePct),
        isLegalOwner: l.isLegalOwner,
      }))}
      documents={documents.map((d) => ({
        id: d.id,
        filename: d.filename,
        category: d.category,
        mime: d.mime,
        uploadedAt: d.uploadedAt.toISOString(),
      }))}
      isAdmin={isAdmin}
    />
  );
}
