import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, ConfirmButton, Empty, LinkButton, Loading, LoadError, Page, StatusPill, Tags, formatDate } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import type { Resource, ResourceStatus } from '../../lib/types'
import { useApi } from '../../lib/useApi'

const tabs: { key: ResourceStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'pending', label: 'In review' },
  { key: 'published', label: 'Published' },
  { key: 'rejected', label: 'Not approved' },
]

// S1-19 My Submissions, S1-20 Clone, S1-21 Submit drafts
export default function MySubmissionsPage() {
  const navigate = useNavigate()
  const { data, error, loading, reload } = useApi<{ resources: Resource[] }>('/resources/mine')
  const [tab, setTab] = useState<ResourceStatus | 'all'>('all')
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function act(key: string, action: () => Promise<unknown>, success: string) {
    setBusy(key)
    setMessage(null)
    try {
      await action()
      setMessage({ kind: 'success', text: success })
      reload()
    } catch (err) {
      setMessage({ kind: 'error', text: errorMessage(err) })
    } finally {
      setBusy(null)
    }
  }

  async function clone(r: Resource) {
    setBusy(`clone-${r.id}`)
    try {
      const { resource } = await api<{ resource: Resource }>(`/resources/${r.id}/clone`, { method: 'POST' })
      navigate(`/resources/${resource.id}/edit`)
    } catch (err) {
      setMessage({ kind: 'error', text: errorMessage(err) })
      setBusy(null)
    }
  }

  const all = data?.resources ?? []
  const shown = tab === 'all' ? all : all.filter((r) => r.status === tab)

  return (
    <Page title="My submissions" subtitle="Everything you’ve uploaded, in every state." actions={<LinkButton to="/resources/new"><i className="bi bi-cloud-upload" /> Upload resource</LinkButton>}>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {tabs.map((t) => {
          const count = t.key === 'all' ? all.length : all.filter((r) => r.status === t.key).length
          return (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`rounded-full border px-3 py-1 ${tab === t.key ? 'border-rl-teal bg-rl-teal/15 text-rl-teal-dark' : 'border-slate-300 bg-white text-slate-600'}`}>
              {t.label} <span className="text-xs opacity-70">{count}</span>
            </button>
          )
        })}
      </div>
      {message && (
        <div className="mb-4">
          <Alert kind={message.kind}>{message.text}</Alert>
        </div>
      )}
      {/* S1-19-T03 loading, empty and error states */}
      {loading && <Loading />}
      {error && <LoadError error={error} retry={reload} />}
      {data && !all.length && (
        <Empty icon="cloud-upload" title="You haven’t uploaded anything yet">
          <LinkButton to="/resources/new" className="mt-4">
            Upload your first resource
          </LinkButton>
        </Empty>
      )}
      {data && all.length > 0 && !shown.length && <Empty title="Nothing here" />}
      <div className="space-y-3">
        {shown.map((r) => (
          <Card key={r.id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={r.status === 'published' ? `/resource/${r.id}` : `/resources/${r.id}/edit`} className="font-semibold hover:text-rl-teal-dark hover:underline">
                    {r.title}
                  </Link>
                  <StatusPill status={r.status} />
                </div>
                <p className="text-xs text-slate-500">
                  Updated {formatDate(r.updated_at)}
                  {r.cloned_from && ' · copy'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {r.status !== 'removed' && (
                  <LinkButton to={`/resources/${r.id}/edit`} variant="secondary">
                    Edit
                  </LinkButton>
                )}
                {(r.status === 'draft' || r.status === 'rejected') && (
                  <Button busy={busy === `submit-${r.id}`} onClick={() => act(`submit-${r.id}`, () => api(`/resources/${r.id}/submit`, { method: 'POST' }), `“${r.title}” sent for review.`)}>
                    Submit
                  </Button>
                )}
                <Button variant="ghost" busy={busy === `clone-${r.id}`} onClick={() => clone(r)}>
                  <i className="bi bi-copy" /> Clone
                </Button>
                {r.status === 'draft' && (
                  <ConfirmButton confirmLabel="Delete draft" onConfirm={() => act(`delete-${r.id}`, () => api(`/resources/${r.id}`, { method: 'DELETE' }), 'Draft deleted.')}>
                    Delete
                  </ConfirmButton>
                )}
              </div>
            </div>
            <Tags subject={r.subject} level={r.level} medium={r.medium} />
            {r.status === 'rejected' && r.review_note && <Alert kind="error">Reviewer note: {r.review_note}</Alert>}
          </Card>
        ))}
      </div>
    </Page>
  )
}
