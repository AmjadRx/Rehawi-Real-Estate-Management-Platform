ALTER TYPE "public"."expense_category" ADD VALUE 'service_charge' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."expense_category" ADD VALUE 'cleaning' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."expense_category" ADD VALUE 'security' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."expense_category" ADD VALUE 'concierge' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."expense_category" ADD VALUE 'elevator' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."expense_category" ADD VALUE 'garden' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."expense_category" ADD VALUE 'waste' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."expense_category" ADD VALUE 'internet' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."expense_category" ADD VALUE 'accounting' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."expense_category" ADD VALUE 'bank_fees' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."expense_category" ADD VALUE 'marketing' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."expense_category" ADD VALUE 'vacancy_reserve' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."expense_category" ADD VALUE 'repairs_reserve' BEFORE 'other';--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "is_percentage" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "percent_value" numeric;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "percent_base" text;