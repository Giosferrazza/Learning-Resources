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
export async function api<T>(path: string, options: { method?: string; body?: unknown; auth?: boolean; keepalive?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.auth !== false) {
    const { data } = await supabase.auth.getSession()
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`
  }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(`/api${path}`, { method: options.method ?? 'GET', headers, keepalive: options.keepalive, body: options.body === undefined ? undefined : JSON.stringify(options.body) })
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

// S2-08 Download a file from the API (needs the session header, so a plain link won't do)
export async function download(path: string, fallbackName: string) {
  const { data } = await supabase.auth.getSession()
  let res: Response
  try {
    res = await fetch(`/api${path}`, { headers: data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {} })
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.")
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.error ?? 'The download failed. Please try again.', body.code)
  }
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? fallbackName
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return name
}

// S2-12 Engagement: never blocks or breaks the page
export const trackResource = (id: string, kind: 'view' | 'open') => void api(`/resources/${id}/events`, { method: 'POST', body: { kind }, keepalive: true }).catch(() => {})
