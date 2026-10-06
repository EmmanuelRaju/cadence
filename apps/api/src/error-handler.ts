import type { FastifyError, FastifyInstance } from "fastify"
import { AppError } from "./errors"

const PG_UNIQUE = "23505",
  PG_FOREIGN_KEY = "23503",
  PG_CHECK = "23514"

const constraintMessages: Record<string, string> = {
  customers_tenant_email_uq: "A customer with this email already exists",
  customers_tenant_phone_uq: "A customer with this phone number already exists",
  subscriptions_one_live_per_plan_uq:
    "This customer already has a live subscription to this plan",
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err: FastifyError, req, reply) => {
    const send = (
      status: number,
      code: string,
      message: string,
      details?: unknown,
    ) =>
      reply
        .code(status)
        .send({ error: { code, message, details, requestId: req.id } })

    if (err.validation)
      return send(400, "validation_error", "Invalid request", err.validation)
    if (err instanceof AppError)
      return send(err.statusCode, err.code, err.message)

    // Drizzle wraps the Postgres error; the real one is in `cause`
    const pg = (err.cause ?? err) as { code?: string; constraint_name?: string }
    const friendly = pg.constraint_name
      ? constraintMessages[pg.constraint_name]
      : undefined

    if (
      pg.code === PG_UNIQUE ||
      pg.code === PG_FOREIGN_KEY ||
      pg.code === PG_CHECK
    ) {
      req.log.warn({ err }, "database constraint rejected request")
      if (pg.code === PG_UNIQUE)
        return send(409, "conflict", friendly ?? "Resource already exists")
      if (pg.code === PG_FOREIGN_KEY)
        return send(
          422,
          "invalid_reference",
          "Referenced resource does not exist",
        )
      return send(
        422,
        "rule_violation",
        friendly ?? "Request violates a data rule",
      )
    }

    req.log.error({ err }, "unhandled error")
    return send(500, "internal_error", "Something went wrong")
  })
}
