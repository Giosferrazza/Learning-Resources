import { db } from './supabase.js'

// S1-32 Outage and critical-error alerts.
// Rules (S1-32-T01):
//   outage          2 failed health checks in a row (see monitor.ts)
//   recovery        first passing check after an outage alert
//   critical_error  any error logged at level "critical"
//   error_burst     5 or more errors within 5 minutes
// Delivery (S1-32-T02): an in-app notification for every admin, plus a POST to
// ALERT_WEBHOOK_URL (Slack/Discord/Teams incoming webhook) when it is set.
// Duplicates (S1-32-T03): the same dedupe key is sent at most once per 15 minutes, checked in
// the alerts table (serverless instances don't share memory) and in memory (in case the database is down).

export type AlertRule = 'outage' | 'recovery' | 'critical_error' | 'error_burst'

const DEDUPE_MS = 15 * 60 * 1000
const lastSent = new Map<string, number>() // in memory so dedupe still works while the database is down

export function resetAlertState() {
  lastSent.clear()
}

export async function raiseAlert(rule: AlertRule, message: string, dedupeKey: string = rule): Promise<boolean> {
  const now = Date.now()
  const prev = lastSent.get(dedupeKey)
  if (prev && now - prev < DEDUPE_MS) return false
  const { data: recent } = await db
    .from('alerts')
    .select('id')
    .eq('dedupe_key', dedupeKey)
    .gte('created_at', new Date(now - DEDUPE_MS).toISOString())
    .limit(1)
  if (recent?.length) return false
  lastSent.set(dedupeKey, now)

  const delivered = await Promise.all([notifyAdmins(rule, message), postWebhook(rule, message)])
  const status = delivered.some(Boolean) ? 'sent' : 'failed'

  const { error } = await db.from('alerts').insert({
    rule,
    message,
    dedupe_key: dedupeKey,
    delivery_status: status,
    delivered_at: status === 'sent' ? new Date().toISOString() : null,
  })
  if (error) console.error(`[alert:${rule}] ${message} (not recorded: ${error.message})`)
  return true
}

async function notifyAdmins(rule: AlertRule, message: string): Promise<boolean> {
  try {
    const { data: admins, error } = await db.from('profiles').select('id').eq('role', 'admin')
    if (error || !admins?.length) return false
    const rows = admins.map((a) => ({ user_id: a.id, type: `alert_${rule}`, message }))
    const insert = await db.from('notifications').insert(rows)
    return !insert.error
  } catch {
    return false
  }
}

async function postWebhook(rule: AlertRule, message: string): Promise<boolean> {
  const url = process.env.ALERT_WEBHOOK_URL
  if (!url) return false
  try {
    const text = `[Resource Learning] ${rule.replace('_', ' ')}: ${message}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, content: text }), // Slack uses text, Discord uses content
    })
    return res.ok
  } catch {
    return false
  }
}
