import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, ConfirmButton, Empty, Loading, LoadError, Page, Select, StatusPill, Tags, formatDate } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import type { ResourceStatus } from '../../lib/types'
import { useApi } from '../../lib/useApi'

type Row = { id: string; title: string; subject: string | null; level: string | null; medium: string | null; status: ResourceStatus; updated_at: string; owner: { email: string; display_name: string } | null }
const statuses = { published: 'Published', pending: 'Waiting for review', draft: 'Drafts', rejected: 'Not approved', removed: 'Removed' }

// S1-24 Manage the resource collection
export default function AdminResourcesPage() {
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 250)
    return () => clearTimeout(t)
  }, [search])
  const params = new URLSearchParams(Object.entries({ status, q }).filter(([, v]) => v)).toString()
  const { data, error, loading, reload } = useApi<{ resources: Row[] }>(`/admin/resources${params ? `?${params}` : ''}`)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  async function act(action: () => Promise<unknown>, text: string) {
    setMessage(null)
    try {
      await action()
      setMessage({ kind: 'success', text })
      reload()
    } catch (err) {
      setMessage({ kind: 'error', text: errorMessage(err) })
    }
  }

  return (
    <Page title="Resource collection" subtitle="Removed resources stay in people’s lists and favorites as “no longer available”.">
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Search
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Title contains…" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <Select label="Status" options={statuses} placeholder="Any status" value={status} onChange={(e) => setStatus(e.target.value)} />
      </div>
      {message && (
        <div className="mb-4">
          <Alert kind={message.kind}>{message.text}</Alert>
        </div>
      )}
      {loading && <Loading />}
      {error && <LoadError error={error} retry={reload} />}
      {data && !data.resources.length && <Empty icon="collection" title="No resources match" />}
      <div className="space-y-2">
        {data?.resources.map((r) => (
          <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/resource/${r.id}`} className="font-semibold hover:text-rl-teal-dark hover:underline">
                  {r.title}
                </Link>
                <StatusPill status={r.status} />
              </div>
              <p className="text-xs text-slate-500">
                {r.owner?.display_name || r.owner?.email} · updated {formatDate(r.updated_at)}
              </p>
              <Tags subject={r.subject} level={r.level} medium={r.medium} />
            </div>
            <div className="flex flex-wrap gap-2">
              {r.status === 'published' && (
                <ConfirmButton confirmLabel="Unpublish" onConfirm={() => act(() => api(`/admin/resources/${r.id}`, { method: 'PATCH', body: { status: 'removed' } }), `Unpublished “${r.title}”.`)}>
                  Unpublish
                </ConfirmButton>
              )}
              {r.status === 'removed' && (
                <Button variant="secondary" onClick={() => act(() => api(`/admin/resources/${r.id}`, { method: 'PATCH', body: { status: 'published' } }), `Restored “${r.title}”.`)}>
                  Restore
                </Button>
              )}
              <ConfirmButton confirmLabel="Delete forever" onConfirm={() => act(() => api(`/admin/resources/${r.id}`, { method: 'DELETE' }), `Deleted “${r.title}”.`)}>
                <i className="bi bi-trash" />
              </ConfirmButton>
            </div>
          </Card>
        ))}
      </div>
    </Page>
  )
}
