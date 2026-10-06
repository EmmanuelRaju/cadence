export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message)
  }
}
export const notFound = (what: string) =>
  new AppError(404, "not_found", `${what} not found`)
