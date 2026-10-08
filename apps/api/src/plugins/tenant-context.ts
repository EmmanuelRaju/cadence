import fp from "fastify-plugin"
import type { FastifyInstance, FastifyRequest } from "fastify"
import { z } from "zod"
import { db } from "../db/client"
import { membershipRoleEnum, memberships, tenants } from "../db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { requireUser } from "./auth"
import { AppError } from "../errors"

export type Role = (typeof membershipRoleEnum.enumValues)[number]
export const ALL_ROLES: Role[] = ["owner", "admin", "member"]

declare module "fastify" {
  interface FastifyRequest {
    tenantId: string
    role: Role
  }
  interface FastifyContextConfig {
    roles?: Role[]
  }
}

export const tenantContext = fp(
  async (app: FastifyInstance) => {
    app.decorateRequest("tenantId", "")
    app.addHook("onRoute", (route) => {
      if (!route.config?.roles?.length) {
        throw new Error(
          `${route.method} ${route.url} must declare config.roles`,
        )
      }
    })
    app.addHook("preHandler", async (req) => {
      const allowed = req.routeOptions.config.roles!
      if (!allowed.includes(req.role)) {
        throw new AppError(
          403,
          "forbidden",
          "You don't have permission to do this",
        )
      }
    })
    app.addHook("onRequest", async (req) => {
      await requireUser(req)
      const parsed = z.uuid().safeParse(req.headers["x-tenant-id"])
      if (!parsed.success)
        throw new AppError(400, "missing_tenant", "Missing or invalid tenant")
      const [membership] = await db
        .select({
          role: memberships.role,
        })
        .from(memberships)
        .innerJoin(tenants, eq(tenants.id, memberships.tenantId))
        .where(
          and(
            eq(memberships.tenantId, parsed.data),
            eq(memberships.userId, req.user!.id),
            isNull(memberships.archivedAt),
            isNull(tenants.archivedAt),
          ),
        )
        .limit(1)

      if (!membership)
        throw new AppError(404, "not_found", "Workspace not found")
      req.tenantId = parsed.data
      req.role = membership.role
    })
  },
  { name: "tenant-context" },
)
