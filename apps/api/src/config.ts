import "dotenv/config"
import { z } from "zod"

const Env = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().min(1),
})

export const env = Env.parse(process.env)
