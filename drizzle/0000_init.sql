CREATE TYPE "public"."contact_role" AS ENUM('developer', 'builder', 'representative', 'property_manager', 'plumber', 'electrician', 'hvac', 'utility', 'lawyer', 'notary', 'agent', 'tenant', 'insurance', 'accountant', 'other');--> statement-breakpoint
CREATE TYPE "public"."document_category" AS ENUM('contract', 'title_deed', 'receipt', 'insurance', 'warranty', 'inspection', 'floor_plan', 'permit', 'photo', 'id_document', 'other');--> statement-breakpoint
CREATE TYPE "public"."expense_category" AS ENUM('tax', 'insurance', 'maintenance', 'utilities', 'management_fee', 'hoa', 'legal', 'other');--> statement-breakpoint
CREATE TYPE "public"."income_kind" AS ENUM('rent', 'other');--> statement-breakpoint
CREATE TYPE "public"."installment_status" AS ENUM('upcoming', 'due', 'paid', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."lease_frequency" AS ENUM('monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."lease_status" AS ENUM('active', 'ended');--> statement-breakpoint
CREATE TYPE "public"."maintenance_priority" AS ENUM('low', 'med', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."maintenance_status" AS ENUM('open', 'in_progress', 'done');--> statement-breakpoint
CREATE TYPE "public"."occupancy" AS ENUM('rented', 'vacant', 'owner_use', 'n/a');--> statement-breakpoint
CREATE TYPE "public"."owner_kind" AS ENUM('person', 'company');--> statement-breakpoint
CREATE TYPE "public"."payment_kind" AS ENUM('down_payment', 'installment', 'purchase', 'fee', 'tax', 'other');--> statement-breakpoint
CREATE TYPE "public"."property_status" AS ENUM('planned', 'under_construction', 'completed');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('residential', 'commercial', 'land', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."rate_source" AS ENUM('api', 'manual');--> statement-breakpoint
CREATE TYPE "public"."reminder_kind" AS ENUM('installment_due', 'lease_expiry', 'insurance_renewal', 'custom');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'viewer');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"diff" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"update_date" date NOT NULL,
	"progress_pct" integer DEFAULT 0 NOT NULL,
	"note" text,
	"photo_document_ids" uuid[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"company_name" text,
	"role" "contact_role" DEFAULT 'other' NOT NULL,
	"phones" text[] DEFAULT '{}' NOT NULL,
	"email" text,
	"whatsapp" text,
	"address" text,
	"website" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid,
	"contact_id" uuid,
	"category" "document_category" DEFAULT 'other' NOT NULL,
	"blob_url" text NOT NULL,
	"filename" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"is_cover" boolean DEFAULT false NOT NULL,
	"uploaded_by" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"currency" char(3) PRIMARY KEY NOT NULL,
	"rate_to_eur" numeric NOT NULL,
	"source" "rate_source" DEFAULT 'api' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"category" "expense_category" DEFAULT 'other' NOT NULL,
	"amount" numeric NOT NULL,
	"currency" char(3) NOT NULL,
	"spent_on" date NOT NULL,
	"recurring" boolean DEFAULT false NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "income" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"lease_id" uuid,
	"kind" "income_kind" DEFAULT 'rent' NOT NULL,
	"amount" numeric NOT NULL,
	"currency" char(3) NOT NULL,
	"received_on" date NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "installments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"label" text NOT NULL,
	"due_date" date NOT NULL,
	"amount" numeric NOT NULL,
	"currency" char(3) NOT NULL,
	"status" "installment_status" DEFAULT 'upcoming' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"tenant_name" text NOT NULL,
	"tenant_contact_id" uuid,
	"rent_amount" numeric NOT NULL,
	"currency" char(3) NOT NULL,
	"frequency" "lease_frequency" DEFAULT 'monthly' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"deposit_amount" numeric,
	"status" "lease_status" DEFAULT 'active' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "maintenance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"priority" "maintenance_priority" DEFAULT 'med' NOT NULL,
	"status" "maintenance_status" DEFAULT 'open' NOT NULL,
	"assigned_contact_id" uuid,
	"cost" numeric,
	"currency" char(3),
	"opened_on" date NOT NULL,
	"closed_on" date
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "owners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "owner_kind" DEFAULT 'person' NOT NULL,
	"name" text NOT NULL,
	"is_family" boolean DEFAULT false NOT NULL,
	"contact_id" uuid,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"kind" "payment_kind" DEFAULT 'other' NOT NULL,
	"amount" numeric NOT NULL,
	"currency" char(3) NOT NULL,
	"paid_on" date NOT NULL,
	"milestone_label" text,
	"installment_id" uuid,
	"receipt_document_id" uuid,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "property_type" NOT NULL,
	"status" "property_status" DEFAULT 'completed' NOT NULL,
	"occupancy" "occupancy" DEFAULT 'n/a' NOT NULL,
	"currency" char(3) DEFAULT 'EUR' NOT NULL,
	"purchase_price" numeric,
	"current_value" numeric,
	"country" text NOT NULL,
	"city" text NOT NULL,
	"address_line" text,
	"postal_code" text,
	"lat" numeric,
	"lng" numeric,
	"google_place_id" text,
	"size_sqm" numeric,
	"year_built" integer,
	"floors" integer,
	"units" integer,
	"developer_contact_id" uuid,
	"manager_contact_id" uuid,
	"cover_photo_id" uuid,
	"description" text,
	"notes" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_contacts" (
	"property_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"relationship_note" text,
	CONSTRAINT "property_contacts_property_id_contact_id_pk" PRIMARY KEY("property_id","contact_id")
);
--> statement-breakpoint
CREATE TABLE "property_owners" (
	"property_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"share_pct" numeric NOT NULL,
	"is_legal_owner" boolean DEFAULT false NOT NULL,
	CONSTRAINT "property_owners_property_id_owner_id_pk" PRIMARY KEY("property_id","owner_id")
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid,
	"kind" "reminder_kind" DEFAULT 'custom' NOT NULL,
	"due_date" date NOT NULL,
	"message" text NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"phone" text,
	"name" text,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_updates" ADD CONSTRAINT "construction_updates_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_lease_id_leases_id_fk" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installments" ADD CONSTRAINT "installments_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leases" ADD CONSTRAINT "leases_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leases" ADD CONSTRAINT "leases_tenant_contact_id_contacts_id_fk" FOREIGN KEY ("tenant_contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance" ADD CONSTRAINT "maintenance_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance" ADD CONSTRAINT "maintenance_assigned_contact_id_contacts_id_fk" FOREIGN KEY ("assigned_contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owners" ADD CONSTRAINT "owners_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_installment_id_installments_id_fk" FOREIGN KEY ("installment_id") REFERENCES "public"."installments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_developer_contact_id_contacts_id_fk" FOREIGN KEY ("developer_contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_manager_contact_id_contacts_id_fk" FOREIGN KEY ("manager_contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_contacts" ADD CONSTRAINT "property_contacts_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_contacts" ADD CONSTRAINT "property_contacts_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_owners" ADD CONSTRAINT "property_owners_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_owners" ADD CONSTRAINT "property_owners_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;