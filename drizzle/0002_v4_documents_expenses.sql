ALTER TABLE "documents" ALTER COLUMN "blob_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "mime" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "size_bytes" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "kind" text DEFAULT 'file' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "external_url" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "frequency" text DEFAULT 'one_time' NOT NULL;--> statement-breakpoint
UPDATE "expenses" SET "frequency" = 'monthly' WHERE "recurring" = true AND "frequency" = 'one_time';
