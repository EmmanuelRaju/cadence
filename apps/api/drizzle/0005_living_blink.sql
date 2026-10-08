ALTER TABLE "customers" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
CREATE INDEX "customers_tenant_id_created_at_id_idx" ON "customers" USING btree ("tenant_id","created_at","id") WHERE "customers"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "plans_tenant_id_created_at_id_idx" ON "plans" USING btree ("tenant_id","created_at","id") WHERE "plans"."archived_at" IS NULL;