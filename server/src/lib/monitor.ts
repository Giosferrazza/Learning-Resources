import { raiseAlert } from './alerts.js'
import { db } from './supabase.js'

// S1-29 Monitor system uptime and performance.
export type HealthResult = { ok: boolean; responseMs: number; detail: string | null }

const startedAt = Date.now()
export const uptimeSeconds = () => Math.round((Date.now() - startedAt) / 1000)

// S1-29-T01: the health check times a real database round trip.
export async function runHealthCheck(): Promise<HealthResult> {
  const start = performance.now()
  try {
    const { error } = await db.from('profiles').select('id', { head: true, count: 'exact' }).limit(1)
    const responseMs = Math.round(performance.now() - start)
    return error ? { ok: false, responseMs, detail: error.message } : { ok: true, responseMs, detail: null }
  } catch (err) {
    return { ok: false, responseMs: Math.round(performance.now() - start), detail: err instanceof Error ? err.message : String(err) }
  }
}

// S1-29-T02: scheduled checks, recorded for the admin monitoring view. Hosted, GitHub Actions
// calls /api/cron/uptime every 5 minutes; running locally, the API checks every minute itself.
// State comes from the database so it works across serverless instances:
// two failures in a row open an outage (alert), the next pass closes it (recovery alert, S1-32).
export async function recordCheck(result: HealthResult) {
  const previous = await db.from('uptime_checks').select('ok').order('created_at', { ascending: false }).limit(1).maybeSingle()
  const { error } = await db.from('uptime_checks').insert({ ok: result.ok, response_ms: result.responseMs, detail: result.detail })
  if (error) console.error('uptime check not recorded:', error.message)

  const incident = await db.from('alerts').select('rule').in('rule', ['outage', 'recovery']).order('created_at', { ascending: false }).limit(1).maybeSingle()
  const outageOpen = incident.data?.rule === 'outage'

  if (result.ok) {
    if (outageOpen) await raiseAlert('recovery', `Service recovered (database responded in ${result.responseMs} ms)`, `recovery:${Date.now()}`)
    return
  }
  // If we can't even read the last check, the database is down: that counts as a second failure
  const previousFailed = previous.error ? true : previous.data ? !previous.data.ok : false
  if (previousFailed && !outageOpen) {
    await raiseAlert('outage', `Health check failed twice in a row: ${result.detail ?? 'unknown error'}`)
  }
}

export function startUptimeChecks(intervalMs = Number(process.env.UPTIME_INTERVAL_MS ?? 60_000)) {
  const tick = async () => recordCheck(await runHealthCheck())
  void tick()
  return setInterval(() => void tick(), intervalMs)
}
