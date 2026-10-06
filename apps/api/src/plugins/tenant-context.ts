import fp from "fastify-plugin"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { db } from "../db/client"
import { tenants } from "../db/schema"
import { and, eq, isNull } from "drizzle-orm"

declare module "fastify" {
  interface FastifyRequest {
    tenantId: string
  }
}

export const tenantContext = fp(
  async (app: FastifyInstance) => {
    app.decorateRequest("tenantId", "")
    app.addHook("onRequest", async (req, reply) => {
      // TEMPORARY: replaced by session-based auth in Week 2
      const parsed = z.uuid().safeParse(req.headers["x-tenant-id"])
      if (!parsed.success)
        return reply.code(401).send({ error: "missing or invalid tenant" })
      const [tenant] = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(and(eq(tenants.id, parsed.data), isNull(tenants.archivedAt)))
        .limit(1)
      if (!tenant)
        return reply
          .code(401)
          .send({ error: { code: "unauthorized", message: "Unknown tenant" } })
      req.tenantId = tenant.id
      req.tenantId = parsed.data
    })
  },
  { name: "tenant-context" },
)
