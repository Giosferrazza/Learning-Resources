import { useState } from 'react'
import { Button, Card, Empty, Loading, LoadError, Page, Pill, formatDateTime } from '../../components/ui'
import { useApi } from '../../lib/useApi'

type ErrorLog = { id: number; level: 'error' | 'critical'; message: string; route: string | null; user_id: string | null; context: Record<string, unknown>; created_at: string }

// S1-31-T03 Admin error-log viewer
export default function AdminErrorLogsPage() {
  const [level, setLevel] = useState('')
  const { data, error, loading, refreshing, reload } = useApi<{ errors: ErrorLog[] }>(`/admin/errors${level ? `?level=${level}` : ''}`)
  const [open, setOpen] = useState<number | null>(null)

  return (
    <Page
      title="Error logs"
      subtitle="Newest first. Passwords, tokens and keys are redacted before they’re stored."
      actions={
        <Button variant="secondary" onClick={reload} busy={refreshing}>
          <i className="bi bi-arrow-clockwise" /> Refresh
        </Button>
      }
    >
      <div className="mb-4 flex gap-2 text-sm">
        {[
          ['', 'All'],
          ['critical', 'Critical'],
          ['error', 'Errors'],
        ].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setLevel(key)} className={`rounded-full border px-3 py-1 ${level === key ? 'border-rl-teal bg-rl-teal/15 text-rl-teal-dark' : 'border-slate-300 bg-white text-slate-600'}`}>
            {label}
          </button>
        ))}
      </div>
      {loading && <Loading />}
      {error && <LoadError error={error} retry={reload} />}
      {data && !data.errors.length && <Empty icon="emoji-smile" title="No errors logged" />}
      <div className="space-y-2">
        {data?.errors.map((e) => (
          <Card key={e.id} className="py-3">
            <button type="button" onClick={() => setOpen(open === e.id ? null : e.id)} className="flex w-full items-start justify-between gap-3 text-left">
              <div className="min-w-0">
                <p className="font-mono text-sm break-words">
                  <Pill tone={e.level === 'critical' ? 'red' : 'amber'}>{e.level}</Pill> <span className="ml-1">{e.message}</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDateTime(e.created_at)}
                  {e.route && ` · ${e.route}`}
                  {e.user_id && ` · user ${e.user_id.slice(0, 8)}`}
                </p>
              </div>
              <i className={`bi ${open === e.id ? 'bi-chevron-up' : 'bi-chevron-down'} text-slate-400`} />
            </button>
            {open === e.id && <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{JSON.stringify(e.context, null, 2)}</pre>}
          </Card>
        ))}
      </div>
    </Page>
  )
}
