import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { and, eq, isNull, sql } from "drizzle-orm"
import { db } from "../db/client"
import { memberships, tenants, users } from "../db/schema"
import { hashPassword, verifyPassword } from "../auth/password"
import { createSession, invalidateSession } from "../auth/sessions"
import { requireUser, SESSION_COOKIE, setSessionCookie } from "../plugins/auth"
import { AppError } from "../errors"

const Email = z.string().trim().toLowerCase().pipe(z.email())
const Login = z.object({ email: Email, password: z.string().min(1).max(256) })
const CreateUser = z.object({
  name: z.string().trim().min(1).max(60),
  email: Email,
  password: z.string().min(8).max(256),
  workspaceName: z.string().trim().min(1).max(60),
  workspaceSlug: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/),
})

// Computed once at startup. Used when the email doesn't exist (see below).
const DUMMY_HASH = await hashPassword("timing-equalizer")

export async function authRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>()

  r.post("/auth/login", { schema: { body: Login } }, async (req, reply) => {
    const [user] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(
        and(
          sql`lower(${users.email}) = ${req.body.email}`,
          isNull(users.archivedAt),
        ),
      )
      .limit(1)

    const valid = await verifyPassword(
      user?.passwordHash ?? DUMMY_HASH,
      req.body.password,
    )
    if (!user || !valid)
      throw new AppError(
        401,
        "invalid_credentials",
        "Invalid email or password",
      )

    const { token, expiresAt } = await createSession(db, user.id)
    setSessionCookie(reply, token, expiresAt)
    return reply.code(204).send()
  })

  r.post(
    "/auth/signup",
    { schema: { body: CreateUser } },
    async (req, reply) => {
      const hashedPassword = await hashPassword(req.body.password)
      const { user, session, tenant } = await db.transaction(async (tx) => {
        //User creation
        const [user] = await tx
          .insert(users)
          .values({
            name: req.body.name,
            email: req.body.email,
            passwordHash: hashedPassword,
          })
          .returning({ id: users.id, name: users.name, email: users.email })

        //Tenant creation
        const [tenant] = await tx
          .insert(tenants)
          .values({
            name: req.body.workspaceName,
            slug: req.body.workspaceSlug,
          })
          .returning({
            id: tenants.id,
            name: tenants.name,
            slug: tenants.slug,
          })

        //Membership creation
        await tx
          .insert(memberships)
          .values({ userId: user.id, tenantId: tenant.id, role: "owner" })

        const session = await createSession(tx, user.id)
        return { user, session, tenant }
      })

      setSessionCookie(reply, session.token, session.expiresAt)
      reply.code(201).send({ user, tenant })
    },
  )

  r.post("/auth/logout", async (req, reply) => {
    const token = req.cookies[SESSION_COOKIE]
    if (token) {
      await invalidateSession(token)
    }
    reply.clearCookie(SESSION_COOKIE, { path: "/" })
    return reply.code(204).send()
  })

  r.get("/auth/me", { preHandler: [requireUser] }, async (req) => {
    const userMemberships = await db
      .select({
        tenant: { id: tenants.id, name: tenants.name, slug: tenants.slug },
        role: memberships.role,
      })
      .from(memberships)
      .innerJoin(tenants, eq(tenants.id, memberships.tenantId))
      .where(
        and(
          eq(memberships.userId, req.user!.id),
          isNull(memberships.archivedAt),
          isNull(tenants.archivedAt),
        ),
      )
      .orderBy(tenants.name)

    return { user: req.user, memberships: userMemberships }
  })
}
