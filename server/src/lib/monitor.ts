import { raiseAlert } from './alerts'
import { db } from './supabase'

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

// S1-29-T02: scheduled checks, recorded for the admin monitoring view.
// Two failures in a row raise an outage alert; the next pass raises a recovery alert (S1-32).
let consecutiveFailures = 0
let outageOpen = false

export async function recordCheck(result: HealthResult) {
  const { error } = await db.from('uptime_checks').insert({ ok: result.ok, response_ms: result.responseMs, detail: result.detail })
  if (error) console.error('uptime check not recorded:', error.message)

  if (result.ok) {
    consecutiveFailures = 0
    if (outageOpen) {
      outageOpen = false
      await raiseAlert('recovery', `Service recovered (database responded in ${result.responseMs} ms)`, `recovery:${Date.now()}`)
    }
    return
  }
  consecutiveFailures += 1
  if (consecutiveFailures >= 2 && !outageOpen) {
    outageOpen = true
    await raiseAlert('outage', `Health check failed ${consecutiveFailures} times in a row: ${result.detail ?? 'unknown error'}`)
  }
}

export function resetMonitorState() {
  consecutiveFailures = 0
  outageOpen = false
}

export function startUptimeChecks(intervalMs = Number(process.env.UPTIME_INTERVAL_MS ?? 60_000)) {
  const tick = async () => recordCheck(await runHealthCheck())
  void tick()
  return setInterval(() => void tick(), intervalMs)
}
