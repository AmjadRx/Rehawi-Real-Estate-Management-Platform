CREATE TABLE "login_attempts" (
	"identifier" text PRIMARY KEY NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN "phones" text[];--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN "social_links" jsonb;--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN "bank_details" jsonb;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_document_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;