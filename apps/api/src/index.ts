import { buildApp } from "./app"
import { env } from "./config"

const app = buildApp()

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    app.log.info({ signal }, "shutting down")
    await app.close()
    process.exit(0)
  })
}

await app.listen({ port: env.PORT, host: "0.0.0.0" })
