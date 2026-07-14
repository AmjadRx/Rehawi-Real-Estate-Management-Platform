import { z } from "zod";

/** Shared zod schemas (§2) — used by API routes and forms alike. */

export const currencyCode = z
  .string()
  .length(3)
  .transform((s) => s.toUpperCase());

export const moneyAmount = z.union([z.number(), z.string()]).transform((v) => {
  const n = typeof v === "number" ? v : parseFloat(v);
  if (!Number.isFinite(n)) throw new Error("Invalid amount");
  return String(n);
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const propertyCreate = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["residential", "commercial", "land", "mixed"]),
  status: z
    .enum(["planned", "under_construction", "completed"])
    .default("completed"),
  occupancy: z.enum(["rented", "vacant", "owner_use", "n/a"]).default("n/a"),
  currency: currencyCode.default("EUR"),
  purchasePrice: moneyAmount.nullish(),
  currentValue: moneyAmount.nullish(),
  country: z.string().min(1).max(100),
  city: z.string().min(1).max(100),
  addressLine: z.string().max(300).nullish(),
  postalCode: z.string().max(20).nullish(),
  lat: z.coerce.number().min(-90).max(90).nullish(),
  lng: z.coerce.number().min(-180).max(180).nullish(),
  googlePlaceId: z.string().max(300).nullish(),
  sizeSqm: z.coerce.number().positive().nullish(),
  yearBuilt: z.coerce.number().int().min(1800).max(2100).nullish(),
  floors: z.coerce.number().int().min(0).nullish(),
  units: z.coerce.number().int().min(0).nullish(),
  developerContactId: z.uuid().nullish(),
  managerContactId: z.uuid().nullish(),
  description: z.string().max(5000).nullish(),
  notes: z.string().max(5000).nullish(),
});
export const propertyUpdate = propertyCreate.partial().extend({
  coverPhotoId: z.uuid().nullish(),
});

export const ownerCreate = z.object({
  kind: z.enum(["person", "company"]).default("person"),
  name: z.string().min(1).max(200),
  isFamily: z.boolean().default(false),
  contactId: z.uuid().nullish(),
  email: z.email().nullish(),
  phones: z.array(z.string().max(30)).nullish(),
  socialLinks: z.record(z.string(), z.url()).nullish(),
  /** Admin-only in API responses (§4 v2). */
  bankDetails: z.record(z.string(), z.string().max(200)).nullish(),
  notes: z.string().max(5000).nullish(),
});
export const ownerUpdate = ownerCreate.partial();

export const propertyOwnerSet = z.object({
  owners: z
    .array(
      z.object({
        ownerId: z.uuid(),
        sharePct: z.coerce.number().gt(0).lte(100),
        isLegalOwner: z.boolean().default(false),
      }),
    )
    .min(1)
    .refine(
      (list) =>
        Math.abs(list.reduce((sum, o) => sum + o.sharePct, 0) - 100) < 0.01,
      "Ownership shares must sum to 100%",
    ),
});

export const paymentCreate = z.object({
  kind: z
    .enum(["down_payment", "installment", "purchase", "fee", "tax", "other"])
    .default("other"),
  amount: moneyAmount,
  currency: currencyCode,
  paidOn: isoDate,
  milestoneLabel: z.string().max(200).nullish(),
  installmentId: z.uuid().nullish(),
  receiptDocumentId: z.uuid().nullish(),
  notes: z.string().max(2000).nullish(),
});
export const paymentUpdate = paymentCreate.partial();

export const installmentCreate = z.object({
  label: z.string().min(1).max(200),
  dueDate: isoDate,
  amount: moneyAmount,
  currency: currencyCode,
  status: z.enum(["upcoming", "due", "paid", "overdue"]).default("upcoming"),
});
export const installmentUpdate = installmentCreate.partial();

export const leaseCreate = z.object({
  tenantName: z.string().min(1).max(200),
  tenantContactId: z.uuid().nullish(),
  rentAmount: moneyAmount,
  currency: currencyCode,
  frequency: z.enum(["monthly", "quarterly", "yearly"]).default("monthly"),
  startDate: isoDate,
  endDate: isoDate.nullish(),
  depositAmount: moneyAmount.nullish(),
  status: z.enum(["active", "ended"]).default("active"),
  notes: z.string().max(2000).nullish(),
});
export const leaseUpdate = leaseCreate.partial();

export const incomeCreate = z.object({
  leaseId: z.uuid().nullish(),
  kind: z.enum(["rent", "other"]).default("rent"),
  amount: moneyAmount,
  currency: currencyCode,
  receivedOn: isoDate,
  notes: z.string().max(2000).nullish(),
});
export const incomeUpdate = incomeCreate.partial();

export const expenseCreate = z.object({
  category: z
    .enum([
      "tax",
      "insurance",
      "maintenance",
      "utilities",
      "management_fee",
      "hoa",
      "legal",
      "other",
    ])
    .default("other"),
  amount: moneyAmount,
  currency: currencyCode,
  spentOn: isoDate,
  recurring: z.boolean().default(false),
  notes: z.string().max(2000).nullish(),
});
export const expenseUpdate = expenseCreate.partial();

export const contactCreate = z.object({
  name: z.string().min(1).max(200),
  companyName: z.string().max(200).nullish(),
  role: z
    .enum([
      "developer",
      "builder",
      "representative",
      "property_manager",
      "plumber",
      "electrician",
      "hvac",
      "utility",
      "lawyer",
      "notary",
      "agent",
      "tenant",
      "insurance",
      "accountant",
      "other",
    ])
    .default("other"),
  phones: z.array(z.string().max(30)).default([]),
  email: z.email().nullish(),
  whatsapp: z.string().max(30).nullish(),
  address: z.string().max(300).nullish(),
  website: z.url().nullish(),
  notes: z.string().max(5000).nullish(),
});
export const contactUpdate = contactCreate.partial();

export const propertyContactLink = z.object({
  contactId: z.uuid(),
  relationshipNote: z.string().max(300).nullish(),
});

export const constructionUpdateCreate = z.object({
  updateDate: isoDate,
  progressPct: z.coerce.number().int().min(0).max(100),
  note: z.string().max(2000).nullish(),
  photoDocumentIds: z.array(z.uuid()).default([]),
});
export const constructionUpdateUpdate = constructionUpdateCreate.partial();

export const maintenanceCreate = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).nullish(),
  priority: z.enum(["low", "med", "high", "urgent"]).default("med"),
  status: z.enum(["open", "in_progress", "done"]).default("open"),
  assignedContactId: z.uuid().nullish(),
  cost: moneyAmount.nullish(),
  currency: currencyCode.nullish(),
  openedOn: isoDate,
  closedOn: isoDate.nullish(),
});
export const maintenanceUpdate = maintenanceCreate.partial();

export const reminderCreate = z.object({
  propertyId: z.uuid().nullish(),
  kind: z
    .enum(["installment_due", "lease_expiry", "insurance_renewal", "custom"])
    .default("custom"),
  dueDate: isoDate,
  message: z.string().min(1).max(500),
  resolved: z.boolean().default(false),
});
export const reminderUpdate = reminderCreate.partial();

export const rateUpsert = z.object({
  currency: currencyCode,
  rateToEur: z.coerce.number().positive(),
});
