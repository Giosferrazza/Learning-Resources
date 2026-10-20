import { raiseAlert } from './alerts'
import { db } from './supabase'

// S1-31-T01 Capture structured errors safely: anything that looks like a secret is redacted
// before it is stored, and request bodies are never stored whole.
const SECRET_KEY = /pass|token|secret|authorization|cookie|key/i

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated]'
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SECRET_KEY.test(k) ? '[redacted]' : redact(v, depth + 1)]),
    )
  }
  if (typeof value === 'string' && value.length > 500) return `${value.slice(0, 500)}…`
  return value
}

type ErrorDetails = { route?: string; userId?: string | null; context?: Record<string, unknown> }

const recentErrors: number[] = []

export async function logError(level: 'error' | 'critical', message: string, details: ErrorDetails = {}) {
  const { error } = await db.from('error_logs').insert({
    level,
    message: message.slice(0, 1000),
    route: details.route ?? null,
    user_id: details.userId ?? null,
    context: redact(details.context ?? {}),
  })
  if (error) console.error(`[${level}] ${message} (not logged: ${error.message})`)

  if (level === 'critical') await raiseAlert('critical_error', message, `critical:${message.slice(0, 80)}`)

  const now = Date.now()
  recentErrors.push(now)
  while (recentErrors.length && now - recentErrors[0] > 5 * 60 * 1000) recentErrors.shift()
  if (recentErrors.length >= 5) await raiseAlert('error_burst', `${recentErrors.length} errors in the last 5 minutes`)
}
