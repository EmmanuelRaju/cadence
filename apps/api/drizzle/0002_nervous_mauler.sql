CREATE TABLE "subscription_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"from_status" "subscription_status",
	"to_status" "subscription_status" NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_events_from_status_distinct_from_to_status" CHECK (("subscription_events"."from_status" IS DISTINCT FROM "subscription_events"."to_status"))
);
--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_subscription_fk" FOREIGN KEY ("tenant_id","subscription_id") REFERENCES "public"."subscriptions"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_events_tenant_subscription_created_at_idx" ON "subscription_events" USING btree ("tenant_id","subscription_id","created_at");--> statement-breakpoint
CREATE INDEX "subscriptions_active_idx" ON "subscriptions" USING btree ("current_period_end") WHERE "subscriptions"."status" IN ('active','past_due');--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_one_live_per_plan_uq" ON "subscriptions" USING btree ("tenant_id","customer_id","plan_id") WHERE "subscriptions"."status" <> 'canceled';