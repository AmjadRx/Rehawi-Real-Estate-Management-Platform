import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb, tables } from "@/db";
import {
  computePropertyFinancials,
  type PropertyFinancials,
} from "@/lib/finance";
import { getBaseCurrency, getRates } from "@/lib/portfolio";

export type PropertyDetail = NonNullable<
  Awaited<ReturnType<typeof loadPropertyDetail>>
>;

/** Full profile payload for /properties/[id] (§6.4) — one round trip. */
export async function loadPropertyDetail(id: string) {
  const db = await getDb();

  const [property] = await db
    .select()
    .from(tables.properties)
    .where(
      and(eq(tables.properties.id, id), isNull(tables.properties.deletedAt)),
    )
    .limit(1);
  if (!property) return null;

  const [
    rates,
    baseCurrency,
    owners,
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
    getRates(),
    getBaseCurrency(),
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

  const financials: PropertyFinancials = computePropertyFinancials(
    {
      payments,
      installments,
      leases: leases.map((l) => ({
        rentAmount: l.rentAmount,
        currency: l.currency,
        frequency: l.frequency,
        status: l.status,
      })),
      income,
      expenses,
      currentValue: property.currentValue
        ? { amount: property.currentValue, currency: property.currency }
        : null,
    },
    rates,
    baseCurrency,
  );

  return {
    property,
    baseCurrency,
    financials,
    owners: owners.map((o) => ({ ...o, sharePct: parseFloat(o.sharePct) })),
    payments,
    installments,
    leases,
    income,
    expenses,
    contacts,
    documents,
    constructionUpdates,
    maintenance,
  };
}
