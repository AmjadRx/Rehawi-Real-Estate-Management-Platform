import { addMonths, format, subMonths } from "date-fns";
import type { Database } from "./index";
import * as t from "./schema";

const day = (d: Date) => format(d, "yyyy-MM-dd");

/**
 * Development seed — the owner's 3-asset scenario from §5 of the
 * architecture document, used by the verification pass:
 *
 *   - one completed apartment rented at €500/month
 *   - one under construction (€1.8M paid of €2.5M)
 *   - one planned & half-paid (€1.0M paid of €2.0M)
 *
 * Family profile must show: total invested €3,000,000, monthly €500,
 * estimated full return ≈ 500 years.
 */
export async function seed(db: Database) {
  const now = new Date();

  await db
    .insert(t.settings)
    .values([{ key: "base_currency", value: "EUR" }])
    .onConflictDoNothing();

  await db
    .insert(t.exchangeRates)
    .values([
      { currency: "EUR", rateToEur: "1", source: "manual" },
      { currency: "USD", rateToEur: "0.92", source: "api" },
      { currency: "AED", rateToEur: "0.25", source: "api" },
      { currency: "SYP", rateToEur: "0.00007", source: "manual" },
    ])
    .onConflictDoNothing();

  /* contacts ------------------------------------------------------------ */
  const [developer, manager, plumber, lawyer, tenant] = await db
    .insert(t.contacts)
    .values([
      {
        name: "Samir Khoury",
        companyName: "Emaar Properties",
        role: "developer",
        phones: ["+971501234567"],
        email: "samir@example.com",
        whatsapp: "+971501234567",
      },
      {
        name: "Layla Haddad",
        companyName: "Haddad Property Management",
        role: "property_manager",
        phones: ["+4915212345678"],
        email: "layla@example.com",
        whatsapp: "+4915212345678",
      },
      {
        name: "Omar Aziz",
        companyName: "Aziz Sanitär",
        role: "plumber",
        phones: ["+493012345678"],
      },
      {
        name: "Dr. Karim Nassar",
        companyName: "Nassar & Partner",
        role: "lawyer",
        phones: ["+4917612345678"],
        email: "karim@example.com",
      },
      {
        name: "Jonas Weber",
        role: "tenant",
        phones: ["+4917698765432"],
        email: "jonas@example.com",
      },
    ])
    .returning();

  /* owners --------------------------------------------------------------- */
  const [amjad, father, sister, partnerCo] = await db
    .insert(t.owners)
    .values([
      { kind: "person", name: "Amjad Rehawi", isFamily: true },
      { kind: "person", name: "Mohammed Rehawi", isFamily: true },
      { kind: "person", name: "Rana Rehawi", isFamily: true },
      { kind: "company", name: "Al Noor Investments LLC", isFamily: false },
    ])
    .returning();

  /* 1 — completed & rented: Berlin apartment ----------------------------- */
  const [apartment] = await db
    .insert(t.properties)
    .values({
      name: "Kreuzberg Apartment",
      type: "residential",
      status: "completed",
      occupancy: "rented",
      currency: "EUR",
      purchasePrice: "200000",
      currentValue: "240000",
      country: "Germany",
      city: "Berlin",
      addressLine: "Oranienstraße 12",
      postalCode: "10999",
      lat: "52.5010",
      lng: "13.4180",
      sizeSqm: "78",
      yearBuilt: 1998,
      floors: 1,
      units: 1,
      managerContactId: manager.id,
      description:
        "Two-bedroom apartment in Kreuzberg, fully renovated in 2021 and rented since early last year.",
    })
    .returning();

  await db.insert(t.propertyOwners).values([
    { propertyId: apartment.id, ownerId: amjad.id, sharePct: "50", isLegalOwner: true },
    { propertyId: apartment.id, ownerId: father.id, sharePct: "30", isLegalOwner: false },
    { propertyId: apartment.id, ownerId: sister.id, sharePct: "20", isLegalOwner: false },
  ]);

  await db.insert(t.payments).values({
    propertyId: apartment.id,
    kind: "purchase",
    amount: "200000",
    currency: "EUR",
    paidOn: day(subMonths(now, 30)),
    notes: "Full purchase price at notary",
  });

  const [lease] = await db
    .insert(t.leases)
    .values({
      propertyId: apartment.id,
      tenantName: "Jonas Weber",
      tenantContactId: tenant.id,
      rentAmount: "500",
      currency: "EUR",
      frequency: "monthly",
      startDate: day(subMonths(now, 6)),
      endDate: day(addMonths(now, 18)),
      depositAmount: "1500",
      status: "active",
    })
    .returning();

  // six months of rent received so far
  for (let i = 5; i >= 0; i--) {
    await db.insert(t.income).values({
      propertyId: apartment.id,
      leaseId: lease.id,
      kind: "rent",
      amount: "500",
      currency: "EUR",
      receivedOn: day(subMonths(now, i)),
    });
  }

  await db.insert(t.maintenance).values({
    propertyId: apartment.id,
    title: "Bathroom tap dripping",
    description: "Tenant reports a dripping tap in the main bathroom.",
    priority: "low",
    status: "open",
    assignedContactId: plumber.id,
    openedOn: day(subMonths(now, 1)),
  });

  await db.insert(t.propertyContacts).values([
    { propertyId: apartment.id, contactId: manager.id, relationshipNote: "Manages lease & tenant" },
    { propertyId: apartment.id, contactId: plumber.id },
    { propertyId: apartment.id, contactId: tenant.id, relationshipNote: "Current tenant" },
  ]);

  /* 2 — under construction: Dubai tower ---------------------------------- */
  const [tower] = await db
    .insert(t.properties)
    .values({
      name: "Marina Heights Tower — Unit 2304",
      type: "commercial",
      status: "under_construction",
      occupancy: "n/a",
      currency: "EUR",
      purchasePrice: "2500000",
      country: "United Arab Emirates",
      city: "Dubai",
      addressLine: "Dubai Marina, Plot 47",
      lat: "25.0800",
      lng: "55.1400",
      sizeSqm: "410",
      developerContactId: developer.id,
      description:
        "Full-floor commercial unit in a marina tower, handover expected next year.",
    })
    .returning();

  await db.insert(t.propertyOwners).values([
    { propertyId: tower.id, ownerId: amjad.id, sharePct: "40", isLegalOwner: false },
    { propertyId: tower.id, ownerId: father.id, sharePct: "40", isLegalOwner: true },
    { propertyId: tower.id, ownerId: partnerCo.id, sharePct: "20", isLegalOwner: false },
  ]);

  await db.insert(t.payments).values([
    {
      propertyId: tower.id,
      kind: "down_payment",
      amount: "1000000",
      currency: "EUR",
      paidOn: day(subMonths(now, 18)),
      milestoneLabel: "Contract signing",
    },
    {
      propertyId: tower.id,
      kind: "installment",
      amount: "500000",
      currency: "EUR",
      paidOn: day(subMonths(now, 10)),
      milestoneLabel: "Foundation complete",
    },
    {
      propertyId: tower.id,
      kind: "installment",
      amount: "300000",
      currency: "EUR",
      paidOn: day(subMonths(now, 3)),
      milestoneLabel: "Structure 50%",
    },
  ]);

  await db.insert(t.installments).values([
    {
      propertyId: tower.id,
      label: "Structure complete",
      dueDate: day(addMonths(now, 2)),
      amount: "350000",
      currency: "EUR",
      status: "upcoming",
    },
    {
      propertyId: tower.id,
      label: "Handover",
      dueDate: day(addMonths(now, 9)),
      amount: "350000",
      currency: "EUR",
      status: "upcoming",
    },
  ]);

  await db.insert(t.constructionUpdates).values([
    {
      propertyId: tower.id,
      updateDate: day(subMonths(now, 10)),
      progressPct: 25,
      note: "Foundation poured and certified.",
    },
    {
      propertyId: tower.id,
      updateDate: day(subMonths(now, 3)),
      progressPct: 50,
      note: "Core structure reached floor 23 of 45.",
    },
    {
      propertyId: tower.id,
      updateDate: day(subMonths(now, 1)),
      progressPct: 62,
      note: "Facade installation started on lower floors.",
    },
  ]);

  await db.insert(t.propertyContacts).values([
    { propertyId: tower.id, contactId: developer.id, relationshipNote: "Developer — Emaar" },
    { propertyId: tower.id, contactId: lawyer.id, relationshipNote: "Contract review" },
  ]);

  await db.insert(t.reminders).values({
    propertyId: tower.id,
    kind: "installment_due",
    dueDate: day(addMonths(now, 2)),
    message: "Installment 'Structure complete' (€350,000) due.",
  });

  /* 3 — planned & half-paid: Damascus land -------------------------------- */
  const [land] = await db
    .insert(t.properties)
    .values({
      name: "Mezzeh Development Plot",
      type: "land",
      status: "planned",
      occupancy: "n/a",
      currency: "EUR",
      purchasePrice: "2000000",
      country: "Syria",
      city: "Damascus",
      addressLine: "Mezzeh, Western Villas district",
      lat: "33.5020",
      lng: "36.2320",
      sizeSqm: "1200",
      description:
        "Development plot; construction not yet started. Half of the purchase price paid.",
    })
    .returning();

  await db.insert(t.propertyOwners).values([
    { propertyId: land.id, ownerId: father.id, sharePct: "60", isLegalOwner: true },
    { propertyId: land.id, ownerId: amjad.id, sharePct: "40", isLegalOwner: false },
  ]);

  await db.insert(t.payments).values({
    propertyId: land.id,
    kind: "down_payment",
    amount: "1000000",
    currency: "EUR",
    paidOn: day(subMonths(now, 8)),
    milestoneLabel: "First half of purchase price",
  });

  await db.insert(t.installments).values({
    propertyId: land.id,
    label: "Second half of purchase price",
    dueDate: day(addMonths(now, 6)),
    amount: "1000000",
    currency: "EUR",
    status: "upcoming",
  });

  await db.insert(t.propertyContacts).values([
    { propertyId: land.id, contactId: lawyer.id, relationshipNote: "Title transfer" },
  ]);
}
