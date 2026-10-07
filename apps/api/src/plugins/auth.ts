import fp from "fastify-plugin"
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"
import { validateSession } from "../auth/sessions"
import { AppError } from "../errors"
import { env } from "../config"

export const SESSION_COOKIE = "session"

type SessionUser = { id: string; email: string; name: string }

declare module "fastify" {
  interface FastifyRequest {
    user: SessionUser | null
  }
}

export function setSessionCookie(
  reply: FastifyReply,
  token: string,
  expiresAt: Date,
) {
  reply.setCookie(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
  })
}

export const auth = fp(
  async (app: FastifyInstance) => {
    app.decorateRequest("user", null)
    app.addHook("onRequest", async (req) => {
      const token = req.cookies[SESSION_COOKIE]
      req.user = token ? await validateSession(token) : null
    })
  },
  { name: "auth", dependencies: ["@fastify/cookie"] },
)

export async function requireUser(req: FastifyRequest) {
  if (!req.user) throw new AppError(401, "unauthorized", "Not signed in")
}
