import { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import z from "zod"
import { db } from "../db/client"
import { customers } from "../db/schema"
import { and, eq, isNull } from "drizzle-orm"

const CreateCustomer = z
  .object({
    name: z.string().trim().min(1).max(200),
    email: z.string().trim().max(200).toLowerCase().pipe(z.email()).optional(),
    phone: z
      .string()
      .regex(/^\+[1-9]\d{7,14}$/)
      .optional(),
  })
  .refine((data) => data.email || data.phone, {
    message: "At least one of email or phone must be provided",
    path: ["email"],
  })

export async function customerRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>()

  r.post(
    "/customers",
    { schema: { body: CreateCustomer } },
    async (req, reply) => {
      const [customer] = await db
        .insert(customers)
        .values({ ...req.body, tenantId: req.tenantId })
        .returning()
      return reply.code(201).send(customer)
    },
  )

  r.get("/customers", async (req) => {
    return db
      .select()
      .from(customers)
      .where(
        and(eq(customers.tenantId, req.tenantId), isNull(customers.archivedAt)),
      )
  })
}
