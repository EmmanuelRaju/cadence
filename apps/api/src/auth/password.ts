import { hash, verify } from "@node-rs/argon2"

const options = { memoryCost: 19 * 1024, timeCost: 2, parallelism: 1 }

export const hashPassword = (password: string) => hash(password, options)
export const verifyPassword = (stored: string, password: string) =>
  verify(stored, password)
