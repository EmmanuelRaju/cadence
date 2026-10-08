import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import z from "zod"
import { db } from "../db/client"
import { plans } from "../db/schema"
import { and, desc, eq, isNull, sql } from "drizzle-orm"
import { ALL_ROLES } from "../plugins/tenant-context"
import { decodeCursor, PageQuery, paginate } from "../lib/pagination"

const MAX_PLAN_AMOUNT_MINOR = 100_000_000 // ₹10,00,000

const CreatePlan = z.object({
  name: z.string().trim().min(1).max(100),
  amountMinor: z.number().int().positive().max(MAX_PLAN_AMOUNT_MINOR),
  currency: z.string().regex(/^[A-Z]{3}$/),
  interval: z.enum(["day", "week", "month"]),
  intervalCount: z.number().int().min(1).max(365).default(1),
})

export async function planRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>()

  r.post(
    "/plans",
    { schema: { body: CreatePlan }, config: { roles: ["owner", "admin"] } },
    async (req, reply) => {
      const [plan] = await db
        .insert(plans)
        .values({ ...req.body, tenantId: req.tenantId })
        .returning()
      return reply.code(201).send(plan)
    },
  )

  r.get(
    "/plans",
    { schema: { querystring: PageQuery }, config: { roles: ALL_ROLES } },
    async (req) => {
      const { limit, cursor } = req.query
      const after = cursor ? decodeCursor(cursor) : null

      const rows = await db
        .select()
        .from(plans)
        .where(
          and(
            eq(plans.tenantId, req.tenantId),
            isNull(plans.archivedAt),
            after
              ? sql`(${plans.createdAt},${plans.id}) < (${after.createdAt.toISOString()}::timestamptz,${after.id}::uuid)`
              : undefined,
          ),
        )
        .orderBy(desc(plans.createdAt), desc(plans.id))
        .limit(limit + 1)

      return paginate(rows, limit)
    },
  )
}
