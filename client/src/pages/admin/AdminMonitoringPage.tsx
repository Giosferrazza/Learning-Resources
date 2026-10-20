import { Button, Card, Empty, Loading, LoadError, Page, Pill, formatDateTime } from '../../components/ui'
import { useApi } from '../../lib/useApi'

type Monitoring = {
  current: { ok: boolean; responseMs: number; detail: string | null; uptimeSeconds: number }
  last24h: { checks: number; uptimePercent: number | null; avgResponseMs: number | null }
  recentChecks: { ok: boolean; response_ms: number; detail: string | null; created_at: string }[]
  alerts: { id: number; rule: string; message: string; delivery_status: string; created_at: string }[]
}

const ruleText: Record<string, string> = { outage: 'Outage', recovery: 'Recovered', critical_error: 'Critical error', error_burst: 'Error spike' }
const duration = (s: number) => (s < 3600 ? `${Math.floor(s / 60)} min` : s < 86400 ? `${Math.floor(s / 3600)} h` : `${Math.floor(s / 86400)} d`)

// S1-29-T03 Admin-only monitoring view, S1-32-T03 alert delivery visibility
export default function AdminMonitoringPage() {
  const { data, error, loading, refreshing, reload } = useApi<Monitoring>('/admin/monitoring')
  if (loading) return <Loading />
  if (error || !data) return <Page title="Uptime and alerts">{error && <LoadError error={error} retry={reload} />}</Page>

  const { current, last24h, recentChecks, alerts } = data
  const slowest = Math.max(1, ...recentChecks.map((c) => c.response_ms))
  const tiles = [
    { label: 'Status now', value: current.ok ? 'Up' : 'Down', tone: current.ok ? 'text-emerald-600' : 'text-red-600' },
    { label: 'Response time', value: `${current.responseMs} ms` },
    { label: 'Uptime (24 h)', value: last24h.uptimePercent === null ? '—' : `${last24h.uptimePercent}%` },
    { label: 'API running for', value: duration(current.uptimeSeconds) },
  ]

  return (
    <Page
      title="Uptime and alerts"
      subtitle={`Checked every minute · ${last24h.checks} checks in the last 24 h${last24h.avgResponseMs ? ` · ${last24h.avgResponseMs} ms average` : ''}`}
      actions={
        <Button variant="secondary" onClick={reload} busy={refreshing}>
          <i className="bi bi-arrow-clockwise" /> Refresh
        </Button>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <p className="text-sm text-slate-500">{t.label}</p>
            <p className={`mt-1 text-2xl font-bold ${t.tone ?? ''}`}>{t.value}</p>
          </Card>
        ))}
      </div>
      {!current.ok && current.detail && <p className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{current.detail}</p>}

      <Card className="mb-6">
        <h2 className="mb-3 font-semibold">Recent checks</h2>
        {recentChecks.length === 0 ? (
          <p className="text-sm text-slate-500">No checks recorded yet. They start when the API starts.</p>
        ) : (
          <div className="flex h-24 items-end gap-1" aria-label="Response time of recent checks, newest on the right">
            {[...recentChecks].reverse().map((c) => (
              <div
                key={c.created_at}
                title={`${formatDateTime(c.created_at)}: ${c.ok ? `${c.response_ms} ms` : `failed (${c.detail})`}`}
                className={`flex-1 rounded-t ${c.ok ? 'bg-rl-teal' : 'bg-red-500'}`}
                style={{ height: c.ok ? `${Math.max(6, (c.response_ms / slowest) * 100)}%` : '100%' }}
              />
            ))}
          </div>
        )}
      </Card>

      <h2 className="mb-3 font-semibold">Alerts</h2>
      {alerts.length === 0 ? (
        <Empty icon="shield-check" title="No alerts" />
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-medium">
                  <Pill tone={a.rule === 'recovery' ? 'green' : 'red'}>{ruleText[a.rule] ?? a.rule}</Pill> <span className="ml-1">{a.message}</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(a.created_at)}</p>
              </div>
              <Pill tone={a.delivery_status === 'sent' ? 'green' : a.delivery_status === 'failed' ? 'red' : 'amber'}>{a.delivery_status === 'sent' ? 'Delivered' : a.delivery_status === 'failed' ? 'Delivery failed' : 'Pending'}</Pill>
            </Card>
          ))}
        </div>
      )}
    </Page>
  )
}
