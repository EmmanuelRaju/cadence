import z from "zod"
import { AppError } from "../errors"

export const PageQuery = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
})

const CursorData = z.object({ createdAt: z.iso.datetime(), id: z.uuid() })

export const encodeCursor = (row: { createdAt: Date; id: string }) => {
  const json = JSON.stringify({
    createdAt: row.createdAt.toISOString(),
    id: row.id,
  })
  return Buffer.from(json).toString("base64url")
}

export const decodeCursor = (cursor: string) => {
  try {
    const data = CursorData.parse(
      JSON.parse(Buffer.from(cursor, "base64url").toString()),
    )
    return { createdAt: new Date(data.createdAt), id: data.id }
  } catch {
    throw new AppError(400, "invalid_cursor", "Invalid pagination cursor")
  }
}

export function paginate<T extends { createdAt: Date; id: string }>(
  rows: T[],
  limit: number,
) {
  const hasMore = rows.length > limit
  const data = hasMore ? rows.slice(0, limit) : rows
  return {
    data,
    nextCursor: hasMore ? encodeCursor(data[data.length - 1]) : null,
  }
}
