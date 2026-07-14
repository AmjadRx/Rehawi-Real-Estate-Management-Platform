import {
  boolean,
  char,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------- enums ---------------------------------- */

export const userRole = pgEnum("user_role", ["admin", "viewer"]);
export const ownerKind = pgEnum("owner_kind", ["person", "company"]);
export const propertyType = pgEnum("property_type", [
  "residential",
  "commercial",
  "land",
  "mixed",
]);
export const propertyStatus = pgEnum("property_status", [
  "planned",
  "under_construction",
  "completed",
]);
export const occupancy = pgEnum("occupancy", [
  "rented",
  "vacant",
  "owner_use",
  "n/a",
]);
export const paymentKind = pgEnum("payment_kind", [
  "down_payment",
  "installment",
  "purchase",
  "fee",
  "tax",
  "other",
]);
export const installmentStatus = pgEnum("installment_status", [
  "upcoming",
  "due",
  "paid",
  "overdue",
]);
export const leaseFrequency = pgEnum("lease_frequency", [
  "monthly",
  "quarterly",
  "yearly",
]);
export const leaseStatus = pgEnum("lease_status", ["active", "ended"]);
export const incomeKind = pgEnum("income_kind", ["rent", "other"]);
export const expenseCategory = pgEnum("expense_category", [
  "tax",
  "insurance",
  "maintenance",
  "utilities",
  "management_fee",
  "hoa",
  "legal",
  "other",
]);
export const contactRole = pgEnum("contact_role", [
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
]);
export const documentCategory = pgEnum("document_category", [
  "contract",
  "title_deed",
  "receipt",
  "insurance",
  "warranty",
  "inspection",
  "floor_plan",
  "permit",
  "photo",
  "id_document",
  "other",
]);
export const maintenancePriority = pgEnum("maintenance_priority", [
  "low",
  "med",
  "high",
  "urgent",
]);
export const maintenanceStatus = pgEnum("maintenance_status", [
  "open",
  "in_progress",
  "done",
]);
export const reminderKind = pgEnum("reminder_kind", [
  "installment_due",
  "lease_expiry",
  "insurance_renewal",
  "custom",
]);
export const rateSource = pgEnum("rate_source", ["api", "manual"]);

/* ------------------------------- tables --------------------------------- */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email"),
  phone: text("phone"),
  name: text("name"),
  role: userRole("role").notNull().default("viewer"),
  passwordHash: text("password_hash"),
  avatarDocumentId: uuid("avatar_document_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  companyName: text("company_name"),
  role: contactRole("role").notNull().default("other"),
  phones: text("phones").array().notNull().default([]),
  email: text("email"),
  whatsapp: text("whatsapp"),
  address: text("address"),
  website: text("website"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const owners = pgTable("owners", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: ownerKind("kind").notNull().default("person"),
  name: text("name").notNull(),
  isFamily: boolean("is_family").notNull().default(false),
  contactId: uuid("contact_id").references(() => contacts.id),
  email: text("email"),
  phones: text("phones").array(),
  socialLinks: jsonb("social_links"),
  /** Returned by the API to admins only; never sent to viewers (§4 v2). */
  bankDetails: jsonb("bank_details"),
  notes: text("notes"),
});

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: propertyType("type").notNull(),
  status: propertyStatus("status").notNull().default("completed"),
  occupancy: occupancy("occupancy").notNull().default("n/a"),
  currency: char("currency", { length: 3 }).notNull().default("EUR"),
  purchasePrice: numeric("purchase_price"),
  currentValue: numeric("current_value"),
  country: text("country").notNull(),
  city: text("city").notNull(),
  addressLine: text("address_line"),
  postalCode: text("postal_code"),
  lat: numeric("lat"),
  lng: numeric("lng"),
  googlePlaceId: text("google_place_id"),
  sizeSqm: numeric("size_sqm"),
  yearBuilt: integer("year_built"),
  floors: integer("floors"),
  units: integer("units"),
  developerContactId: uuid("developer_contact_id").references(
    () => contacts.id,
  ),
  managerContactId: uuid("manager_contact_id").references(() => contacts.id),
  coverPhotoId: uuid("cover_photo_id"),
  createdBy: uuid("created_by").references(() => users.id),
  description: text("description"),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const propertyOwners = pgTable(
  "property_owners",
  {
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => owners.id),
    sharePct: numeric("share_pct").notNull(),
    isLegalOwner: boolean("is_legal_owner").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.propertyId, t.ownerId] })],
);

export const installments = pgTable("installments", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id),
  label: text("label").notNull(),
  dueDate: date("due_date").notNull(),
  amount: numeric("amount").notNull(),
  currency: char("currency", { length: 3 }).notNull(),
  status: installmentStatus("status").notNull().default("upcoming"),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id),
  kind: paymentKind("kind").notNull().default("other"),
  amount: numeric("amount").notNull(),
  currency: char("currency", { length: 3 }).notNull(),
  paidOn: date("paid_on").notNull(),
  milestoneLabel: text("milestone_label"),
  installmentId: uuid("installment_id").references(() => installments.id),
  receiptDocumentId: uuid("receipt_document_id"),
  notes: text("notes"),
});

export const leases = pgTable("leases", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id),
  tenantName: text("tenant_name").notNull(),
  tenantContactId: uuid("tenant_contact_id").references(() => contacts.id),
  rentAmount: numeric("rent_amount").notNull(),
  currency: char("currency", { length: 3 }).notNull(),
  frequency: leaseFrequency("frequency").notNull().default("monthly"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  depositAmount: numeric("deposit_amount"),
  status: leaseStatus("status").notNull().default("active"),
  notes: text("notes"),
});

export const income = pgTable("income", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id),
  leaseId: uuid("lease_id").references(() => leases.id),
  kind: incomeKind("kind").notNull().default("rent"),
  amount: numeric("amount").notNull(),
  currency: char("currency", { length: 3 }).notNull(),
  receivedOn: date("received_on").notNull(),
  notes: text("notes"),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id),
  category: expenseCategory("category").notNull().default("other"),
  amount: numeric("amount").notNull(),
  currency: char("currency", { length: 3 }).notNull(),
  spentOn: date("spent_on").notNull(),
  recurring: boolean("recurring").notNull().default(false),
  notes: text("notes"),
});

export const propertyContacts = pgTable(
  "property_contacts",
  {
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    relationshipNote: text("relationship_note"),
  },
  (t) => [primaryKey({ columns: [t.propertyId, t.contactId] })],
);

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").references(() => properties.id),
  contactId: uuid("contact_id").references(() => contacts.id),
  ownerId: uuid("owner_id").references(() => owners.id),
  category: documentCategory("category").notNull().default("other"),
  blobUrl: text("blob_url").notNull(),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  width: integer("width"),
  height: integer("height"),
  isCover: boolean("is_cover").notNull().default(false),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const constructionUpdates = pgTable("construction_updates", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id),
  updateDate: date("update_date").notNull(),
  progressPct: integer("progress_pct").notNull().default(0),
  note: text("note"),
  photoDocumentIds: uuid("photo_document_ids").array().notNull().default([]),
});

export const maintenance = pgTable("maintenance", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id),
  title: text("title").notNull(),
  description: text("description"),
  priority: maintenancePriority("priority").notNull().default("med"),
  status: maintenanceStatus("status").notNull().default("open"),
  assignedContactId: uuid("assigned_contact_id").references(() => contacts.id),
  cost: numeric("cost"),
  currency: char("currency", { length: 3 }),
  openedOn: date("opened_on").notNull(),
  closedOn: date("closed_on"),
});

export const reminders = pgTable("reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").references(() => properties.id),
  kind: reminderKind("kind").notNull().default("custom"),
  dueDate: date("due_date").notNull(),
  message: text("message").notNull(),
  resolved: boolean("resolved").notNull().default(false),
});

export const exchangeRates = pgTable("exchange_rates", {
  currency: char("currency", { length: 3 }).primaryKey(),
  rateToEur: numeric("rate_to_eur").notNull(),
  source: rateSource("source").notNull().default("api"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  diff: jsonb("diff"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

export const loginAttempts = pgTable("login_attempts", {
  identifier: text("identifier").primaryKey(),
  failedCount: integer("failed_count").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});
