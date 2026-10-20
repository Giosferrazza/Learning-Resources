import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, Empty, Loading, LoadError, Page, Pill, TextArea, formatDateTime } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { useApi } from '../../lib/useApi'

type Report = {
  id: string
  reason: string
  details: string
  status: 'open' | 'resolved' | 'dismissed'
  resolution_note: string | null
  resolved_at: string | null
  created_at: string
  resource: { id: string; title: string; status: string; url: string | null } | null
  reporter: { email: string; display_name: string } | null
}

const reasons: Record<string, string> = { broken_link: 'Broken link or file', inaccurate: 'Inaccurate or outdated', inappropriate: 'Inappropriate content', other: 'Something else' }
const tabs = [
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'dismissed', label: 'Dismissed' },
] as const

// S1-27 Review flagged or reported content
export default function AdminReportsPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]['key']>('open')
  const { data, setData, error, loading, reload } = useApi<{ reports: Report[] }>(`/admin/reports?status=${tab}`)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  return (
    <Page title="Flagged content">
      <div className="mb-4 flex gap-2 text-sm">
        {tabs.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`rounded-full border px-3 py-1 ${tab === t.key ? 'border-rl-teal bg-rl-teal/15 text-rl-teal-dark' : 'border-slate-300 bg-white text-slate-600'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {message && (
        <div className="mb-4">
          <Alert kind={message.kind}>{message.text}</Alert>
        </div>
      )}
      {loading && <Loading />}
      {error && <LoadError error={error} retry={reload} />}
      {data && !data.reports.length && <Empty icon="flag" title={tab === 'open' ? 'No open reports' : 'Nothing here yet'} />}
      <div className="space-y-4">
        {data?.reports.map((r) => (
          <ReportCard
            key={r.id}
            report={r}
            onClosed={(text) => {
              setData({ reports: data.reports.filter((x) => x.id !== r.id) })
              setMessage({ kind: 'success', text })
            }}
            onError={(text) => setMessage({ kind: 'error', text })}
          />
        ))}
      </div>
    </Page>
  )
}

// S1-27-T03 moderation action and closure
function ReportCard({ report: r, onClosed, onError }: { report: Report; onClosed: (text: string) => void; onError: (text: string) => void }) {
  const [note, setNote] = useState('')
  const [remove, setRemove] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  async function close(outcome: 'resolved' | 'dismissed') {
    setBusy(outcome)
    try {
      const res = await api<{ resourceRemoved: boolean }>(`/admin/reports/${r.id}/resolve`, { method: 'POST', body: { outcome, note, removeResource: remove } })
      onClosed(outcome === 'dismissed' ? 'Report dismissed.' : res.resourceRemoved ? 'Resolved and the resource was removed. The educator was notified.' : 'Report resolved.')
    } catch (err) {
      onError(errorMessage(err))
      setBusy(null)
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Pill tone="red">{reasons[r.reason] ?? r.reason}</Pill>
          <h2 className="mt-2 font-semibold">
            {r.resource ? (
              <Link to={`/resource/${r.resource.id}`} className="hover:text-rl-teal-dark hover:underline">
                {r.resource.title}
              </Link>
            ) : (
              'Deleted resource'
            )}
            {r.resource?.status === 'removed' && <span className="ml-2 text-sm font-normal text-slate-500">(already removed)</span>}
          </h2>
          <p className="text-sm text-slate-500">
            Reported by {r.reporter?.display_name || r.reporter?.email} · {formatDateTime(r.created_at)}
          </p>
        </div>
        {r.resource?.url && (
          <a href={r.resource.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-rl-teal-dark hover:underline">
            Check link <i className="bi bi-box-arrow-up-right" />
          </a>
        )}
      </div>
      {r.details && <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">“{r.details}”</p>}
      {r.status === 'open' ? (
        <div className="space-y-3 border-t border-slate-100 pt-3">
          <TextArea label="Note (optional)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          {r.resource && r.resource.status !== 'removed' && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={remove} onChange={(e) => setRemove(e.target.checked)} className="size-4 accent-rl-teal" />
              Remove this resource from the library
            </label>
          )}
          <div className="flex gap-2">
            <Button busy={busy === 'resolved'} onClick={() => close('resolved')} variant={remove ? 'danger' : 'primary'}>
              {remove ? 'Resolve and remove' : 'Resolve'}
            </Button>
            <Button variant="secondary" busy={busy === 'dismissed'} onClick={() => close('dismissed')}>
              Dismiss
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-600">
          {r.status === 'resolved' ? 'Resolved' : 'Dismissed'} {r.resolved_at && formatDateTime(r.resolved_at)}
          {r.resolution_note && `: ${r.resolution_note}`}
        </p>
      )}
    </Card>
  )
}
