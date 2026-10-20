// Errors thrown from routes become JSON responses in the error middleware (app.ts).
export class HttpError extends Error {
  status: number
  code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const badRequest = (message: string) => new HttpError(400, message)
export const forbidden = (message = "You don't have access to this.") => new HttpError(403, message)
export const notFound = (what = 'That') => new HttpError(404, `${what} was not found.`)

// Supabase errors are unexpected here (validation happens first), so surface them as 500s.
type Result<T> = { data: T; error: { message: string } | null }

export function check<T>(result: Result<T>): NonNullable<T> {
  if (result.error) throw new Error(result.error.message)
  return result.data as NonNullable<T>
}

// For .maybeSingle() lookups, where "no row" is a normal answer
export function maybe<T>(result: Result<T>): T | null {
  if (result.error) throw new Error(result.error.message)
  return result.data
}

export function text(value: unknown, field: string, { max = 500, required = true } = {}): string {
  const v = typeof value === 'string' ? value.trim() : ''
  if (required && !v) throw badRequest(`${field} is required.`)
  if (v.length > max) throw badRequest(`${field} must be ${max} characters or fewer.`)
  return v
}
