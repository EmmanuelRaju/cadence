import { and, eq, gt, isNull } from "drizzle-orm"
import { db, Executor } from "../db/client"
import { sessions, users } from "../db/schema"
import { generateSessionToken, hashSessionToken } from "./session-token"

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export async function createSession(ex: Executor, userId: string) {
  const token = generateSessionToken()
  const id = hashSessionToken(token)
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await ex.insert(sessions).values({ id, userId, expiresAt })
  return { token, expiresAt }
}

export async function validateSession(token: string) {
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.id, hashSessionToken(token)),
        gt(sessions.expiresAt, new Date()),
        isNull(users.archivedAt),
      ),
    )
    .limit(1)

  return user ?? null
}

export async function invalidateSession(token: string) {
  await db.delete(sessions).where(eq(sessions.id, hashSessionToken(token)))
}
