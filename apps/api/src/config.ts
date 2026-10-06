import "dotenv/config"
import { z } from "zod"

const Env = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().min(1),
})

const parsed = Env.safeParse(process.env)
if (!parsed.success) {
  console.error(
    "Invalid environment configuration:\n" + z.prettifyError(parsed.error),
  )
  process.exit(1)
}
export const env = parsed.data
