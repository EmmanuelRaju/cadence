CREATE TYPE "public"."subscription_status" AS ENUM('pending', 'active', 'past_due', 'paused', 'canceled');--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" "subscription_status" DEFAULT 'pending' NOT NULL,
	"billing_anchor_at" timestamp with time zone,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp with time zone,
	"paused_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_tenant_id_uq" UNIQUE("tenant_id","id"),
	CONSTRAINT "subscriptions_canceled_consistent" CHECK (("subscriptions"."status" = 'canceled') = ("subscriptions"."canceled_at" IS NOT NULL)),
	CONSTRAINT "subscriptions_pause_consistent" CHECK (("subscriptions"."status" = 'paused') = ("subscriptions"."paused_at" IS NOT NULL)),
	CONSTRAINT "subscriptions_period_present" CHECK (
  "subscriptions"."status" NOT IN ('active', 'past_due', 'paused')
  OR ("subscriptions"."billing_anchor_at" IS NOT NULL
      AND "subscriptions"."current_period_start" IS NOT NULL
      AND "subscriptions"."current_period_end" IS NOT NULL)),
	CONSTRAINT "subscriptions_period_order" CHECK ("subscriptions"."current_period_end" > "subscriptions"."current_period_start")
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "timezone" text DEFAULT 'Asia/Kolkata' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_fk" FOREIGN KEY ("tenant_id","customer_id") REFERENCES "public"."customers"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_fk" FOREIGN KEY ("tenant_id","plan_id") REFERENCES "public"."plans"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscriptions_tenant_customer_idx" ON "subscriptions" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE INDEX "subscriptions_tenant_plan_idx" ON "subscriptions" USING btree ("tenant_id","plan_id");