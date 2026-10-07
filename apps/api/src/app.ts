import fastify from "fastify"
import { client, db } from "./db/client"
import { sql } from "drizzle-orm"
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod"
import { planRoutes } from "./routes/plans"
import { registerErrorHandler } from "./error-handler"
import { customerRoutes } from "./routes/customers"
import { tenantContext } from "./plugins/tenant-context"
import { randomUUID } from "node:crypto"
import cookie from "@fastify/cookie"
import { auth } from "./plugins/auth"
import { authRoutes } from "./routes/auth"

export function buildApp() {
  const app = fastify({
    logger: true,
    genReqId: (req) => (req.headers["x-request-id"] as string) ?? randomUUID(),
  })

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  registerErrorHandler(app)
  app.register(cookie)
  app.register(auth)
  app.register(authRoutes)
  app.register(async (tenantScoped) => {
    await tenantScoped.register(tenantContext)
    tenantScoped.register(planRoutes)
    tenantScoped.register(customerRoutes)
  })

  app.get("/health", () => {
    return { status: "ok" }
  })

  app.get("/ready", async (_req, reply) => {
    try {
      await db.execute(sql`SELECT 1`)
      return { status: "ready" }
    } catch (error) {
      app.log.error(error, "Database unreachable")
      return reply.code(503).send({ status: "unavailable" })
    }
  })

  app.addHook("onClose", async () => {
    await client.end({ timeout: 5 })
  })

  return app
}
