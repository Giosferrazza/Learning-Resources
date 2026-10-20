import { supabase } from './supabase'

export class ApiError extends Error {
  status: number
  code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

// Calls the Express API (proxied at /api by Vite) with the current Supabase session.
export async function api<T>(path: string, options: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.auth !== false) {
    const { data } = await supabase.auth.getSession()
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`
  }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(`/api${path}`, { method: options.method ?? 'GET', headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) })
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.")
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error = new ApiError(res.status, body.error ?? 'Something went wrong. Please try again.', body.code)
    // Session problems sign the user out everywhere (S1-02-T03, S1-23-T03)
    if (error.code === 'signed_out' || error.code === 'account_suspended') window.dispatchEvent(new CustomEvent('auth:rejected', { detail: error }))
    throw error
  }
  return body as T
}

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong. Please try again.')
