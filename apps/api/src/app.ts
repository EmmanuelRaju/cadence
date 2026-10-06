import fastify from "fastify"
import { client, db } from "./db/client"
import { sql } from "drizzle-orm"

export function buildApp() {
  const app = fastify({ logger: true })

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
