import { useState } from 'react'
import { supportCategories } from '../../../../shared/vocabulary'
import { Alert, Button, Card, Empty, ErrorState, Loading, Page, Pill, formatDateTime } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { useApi } from '../../lib/useApi'

type Request = { id: string; user_id: string | null; name: string; email: string; category: keyof typeof supportCategories; subject: string; message: string; status: 'open' | 'resolved'; resolution_note: string | null; resolved_at: string | null; created_at: string }

// S2-02-T03 Admin support queue: open requests first, resolve with a reply
export default function AdminSupportPage() {
  const [status, setStatus] = useState<'open' | 'resolved' | ''>('open')
  const { data, error, loading, reload } = useApi<{ requests: Request[]; open: number }>(`/admin/support${status ? `?status=${status}` : ''}`)

  return (
    <Page title="Support requests" subtitle={data ? `${data.open} open` : undefined} breadcrumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Support' }]}>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Show">
        {(
          [
            ['open', 'Open'],
            ['resolved', 'Resolved'],
            ['', 'All'],
          ] as const
        ).map(([value, label]) => (
          <button key={label} type="button" aria-pressed={status === value} onClick={() => setStatus(value)} className={`rounded-full border px-3 py-1 text-sm ${status === value ? 'border-rl-teal bg-rl-teal/15 text-rl-teal-dark' : 'border-slate-300 bg-white text-slate-600'}`}>
            {label}
          </button>
        ))}
      </div>
      {loading && <Loading />}
      {error && <ErrorState error={error} retry={reload} />}
      {data && !data.requests.length && <Empty icon="life-preserver" title={status === 'open' ? 'No open requests' : 'No requests'} />}
      <ul className="space-y-3">
        {data?.requests.map((r) => (
          <SupportItem key={r.id} request={r} onResolved={reload} />
        ))}
      </ul>
    </Page>
  )
}

function SupportItem({ request: r, onResolved }: { request: Request; onResolved: () => void }) {
  const [note, setNote] = useState('')
  const [state, setState] = useState<{ busy?: boolean; error?: string }>({})

  async function resolve() {
    if (!note.trim()) return setState({ error: 'Write a short reply first.' })
    setState({ busy: true })
    try {
      await api(`/admin/support/${r.id}/resolve`, { method: 'POST', body: { note } })
      onResolved()
    } catch (err) {
      setState({ error: errorMessage(err) })
    }
  }

  return (
    <li>
      <Card className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold break-words">{r.subject}</p>
            <p className="text-sm text-slate-500">
              {supportCategories[r.category]} · {r.name || 'No name'} · <a href={`mailto:${r.email}`} className="underline">{r.email}</a>
              {!r.user_id && ' · guest'} · {formatDateTime(r.created_at)}
            </p>
          </div>
          <Pill tone={r.status === 'open' ? 'amber' : 'green'}>{r.status === 'open' ? 'Open' : 'Resolved'}</Pill>
        </div>
        <p className="text-sm whitespace-pre-line break-words text-slate-700">{r.message}</p>
        {r.status === 'resolved' ? (
          <p className="rounded bg-rl-light px-3 py-2 text-sm text-slate-700">
            <strong>Reply:</strong> {r.resolution_note} {r.resolved_at && <span className="text-xs text-slate-500">· {formatDateTime(r.resolved_at)}</span>}
          </p>
        ) : (
          <div className="space-y-2">
            {state.error && <Alert kind="error">{state.error}</Alert>}
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={2000} placeholder={r.user_id ? 'Reply (sent to their notifications)' : 'Reply note (email the guest yourself)'} aria-label="Reply" className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <Button onClick={resolve} busy={state.busy}>
              <i className="bi bi-check2-circle" aria-hidden /> Mark resolved
            </Button>
          </div>
        )}
      </Card>
    </li>
  )
}
