import pg from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import { env } from "../config"
import * as schema from "./schema"

export const client = pg(env.DATABASE_URL, { max: 10 })
export const db = drizzle(client, { schema })
