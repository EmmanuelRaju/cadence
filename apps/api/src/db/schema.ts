import { sql } from "drizzle-orm"
import {
  boolean,
  char,
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: varchar("slug").unique().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),
  },
  (t) => [
    check(
      "tenants_slug_format",
      sql`${t.slug} ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'`,
    ),
  ],
)

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    avatarUrl: text("avatar_url"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("users_email_uq").on(sql`lower(${t.email})`),
    uniqueIndex("users_phone_uq").on(t.phone),
    check("users_phone_e164", sql`${t.phone} ~ '^\\+[1-9][0-9]{7,14}$'`),
  ],
)

export const membershipRoleEnum = pgEnum("membership_role", [
  "owner",
  "admin",
  "member",
])

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: membershipRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("memberships_tenant_user_uq")
      .on(t.tenantId, t.userId)
      .where(sql`${t.archivedAt} IS NULL`),
    index("memberships_user_idx").on(t.userId),
  ],
)

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    email: varchar("email"),
    name: text("name").notNull(),
    phone: text("phone"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("customers_tenant_email_uq")
      .on(t.tenantId, sql`lower(${t.email})`)
      .where(sql`${t.archivedAt} IS NULL`),
    uniqueIndex("customers_tenant_phone_uq")
      .on(t.tenantId, t.phone)
      .where(sql`${t.archivedAt} IS NULL`),
    unique("customers_tenant_id_uq").on(t.tenantId, t.id),
    check(
      "customers_contact_present",
      sql`${t.email} IS NOT NULL OR ${t.phone} IS NOT NULL`,
    ),
    check("customers_phone_e164", sql`${t.phone} ~ '^\\+[1-9][0-9]{7,14}$'`),
  ],
)

export const billingIntervalEnum = pgEnum("billing_interval", [
  "day",
  "week",
  "month",
])

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: text("name").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    interval: billingIntervalEnum("interval").notNull(),
    intervalCount: integer("interval_count").notNull().default(1),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique("plans_tenant_id_uq").on(t.tenantId, t.id),
    check("plans_amount_positive", sql`${t.amountMinor} > 0`),
    check(
      "plans_interval_count_positive",
      sql`${t.intervalCount} BETWEEN 1 AND 365`,
    ),
    check("plans_currency_iso", sql`${t.currency} ~ '^[A-Z]{3}$'`),
  ],
)

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "pending",
  "active",
  "past_due",
  "paused",
  "canceled",
])

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    customerId: uuid("customer_id").notNull(),
    planId: uuid("plan_id").notNull(),
    status: subscriptionStatusEnum("status").notNull().default("pending"),
    billingAnchorAt: timestamp("billing_anchor_at", { withTimezone: true }),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    foreignKey({
      name: "subscriptions_customer_fk",
      columns: [t.tenantId, t.customerId],
      foreignColumns: [customers.tenantId, customers.id],
    }),
    foreignKey({
      name: "subscriptions_plan_fk",
      columns: [t.tenantId, t.planId],
      foreignColumns: [plans.tenantId, plans.id],
    }),
    index("subscriptions_tenant_customer_idx").on(t.tenantId, t.customerId),
    index("subscriptions_tenant_plan_idx").on(t.tenantId, t.planId),
    index("subscriptions_renewal_due_idx")
      .on(t.currentPeriodEnd)
      .where(sql`${t.status} IN ('active','past_due')`),
    uniqueIndex("subscriptions_one_live_per_plan_uq")
      .on(t.tenantId, t.customerId, t.planId)
      .where(sql`${t.status} <> 'canceled'`),
    unique("subscriptions_tenant_id_uq").on(t.tenantId, t.id),
    check(
      "subscriptions_canceled_consistent",
      sql`(${t.status} = 'canceled') = (${t.canceledAt} IS NOT NULL)`,
    ),
    check(
      "subscriptions_pause_consistent",
      sql`(${t.status} = 'paused') = (${t.pausedAt} IS NOT NULL)`,
    ),
    check(
      "subscriptions_period_present",
      sql`
  ${t.status} NOT IN ('active', 'past_due', 'paused')
  OR (${t.billingAnchorAt} IS NOT NULL
      AND ${t.currentPeriodStart} IS NOT NULL
      AND ${t.currentPeriodEnd} IS NOT NULL)`,
    ),
    check(
      "subscriptions_period_order",
      sql`${t.currentPeriodEnd} > ${t.currentPeriodStart}`,
    ),
  ],
)

export const subscriptionEvents = pgTable(
  "subscription_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    subscriptionId: uuid("subscription_id").notNull(),
    fromStatus: subscriptionStatusEnum("from_status"),
    toStatus: subscriptionStatusEnum("to_status").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      name: "subscription_events_subscription_fk",
      columns: [t.tenantId, t.subscriptionId],
      foreignColumns: [subscriptions.tenantId, subscriptions.id],
    }),
    index("subscription_events_tenant_subscription_created_at_idx").on(
      t.tenantId,
      t.subscriptionId,
      t.createdAt,
    ),
    check(
      "subscription_events_from_status_distinct_from_to_status",
      sql`(${t.fromStatus} IS DISTINCT FROM ${t.toStatus})`,
    ),
  ],
)

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
)
