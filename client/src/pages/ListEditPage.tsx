import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import FavoriteButton from '../components/FavoriteButton'
import { Alert, Button, Card, ConfirmButton, Empty, LinkButton, Loading, LoadError, Page, Tags } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import type { ResourceSummary } from '../lib/types'
import { useApi } from '../lib/useApi'

type ListDetail = { list: { id: string; name: string; share_token: string | null; items: { added_at: string; resource: ResourceSummary }[] } }

// S1-13 edit a list, S1-14 remove resources, S1-15 share with students
export default function ListEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { data, setData, error, loading, reload } = useApi<ListDetail>(`/lists/${id}`)
  const [name, setName] = useState<string | null>(null)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  if (loading) return <Loading />
  if (error || !data) return <Page title="List">{error && <LoadError error={error} retry={reload} />}</Page>
  const list = data.list
  const shareUrl = list.share_token ? `${window.location.origin}/shared/${list.share_token}` : null

  async function run(action: () => Promise<unknown>, success?: string) {
    setMessage(null)
    try {
      await action()
      if (success) setMessage({ kind: 'success', text: success })
      reload()
    } catch (err) {
      setMessage({ kind: 'error', text: errorMessage(err) })
    }
  }

  // S1-14-T03: the list refreshes, and an emptied list shows its empty state
  async function remove(resourceId: string, title: string) {
    const before = data!
    setData({ list: { ...list, items: list.items.filter((i) => i.resource.id !== resourceId) } })
    try {
      await api(`/lists/${list.id}/items/${resourceId}`, { method: 'DELETE' })
      setMessage({ kind: 'success', text: `Removed “${title}”.` })
    } catch (err) {
      setData(before)
      setMessage({ kind: 'error', text: errorMessage(err) })
    }
  }

  async function share() {
    await run(async () => {
      const { shareToken } = await api<{ shareToken: string }>(`/lists/${list.id}/share`, { method: 'POST' })
      await navigator.clipboard?.writeText(`${window.location.origin}/shared/${shareToken}`).then(() => setCopied(true), () => {})
    })
  }

  return (
    <Page
      title={list.name}
      subtitle={`${list.items.length} resource${list.items.length === 1 ? '' : 's'}`}
      actions={
        <>
          <FavoriteButton listId={list.id} withLabel />
          <ConfirmButton confirmLabel="Delete list" onConfirm={() => run(() => api(`/lists/${list.id}`, { method: 'DELETE' }).then(() => navigate('/lists')))}>
            Delete
          </ConfirmButton>
        </>
      }
    >
      <div className="space-y-6">
        {message && <Alert kind={message.kind}>{message.text}</Alert>}

        <Card>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              void run(() => api(`/lists/${list.id}`, { method: 'PATCH', body: { name: name ?? list.name } }).then(() => setName(null)), 'List renamed.')
            }}
          >
            <label className="min-w-56 flex-1 text-sm font-medium text-slate-700">
              List name
              <input value={name ?? list.name} onChange={(e) => setName(e.target.value)} maxLength={120} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <Button type="submit" variant="secondary" disabled={name === null || name.trim() === list.name}>
              Rename
            </Button>
          </form>
        </Card>

        {/* S1-15-T02 share control */}
        <Card>
          <h2 className="font-semibold">Share with students</h2>
          {shareUrl ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-slate-600">Anyone with this link can view the list (read-only, no account needed).</p>
              <div className="flex flex-wrap gap-2">
                <input readOnly value={shareUrl} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm" />
                <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(shareUrl).then(() => setCopied(true))}>
                  <i className="bi bi-clipboard" /> {copied ? 'Copied' : 'Copy link'}
                </Button>
                <ConfirmButton confirmLabel="Stop sharing" onConfirm={() => run(() => api(`/lists/${list.id}/share`, { method: 'DELETE' }).then(() => setCopied(false)), 'The old link no longer works.')}>
                  Stop sharing
                </ConfirmButton>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">Create a read-only link you can post for your class.</p>
              <Button onClick={share}>
                <i className="bi bi-link-45deg" /> Create share link
              </Button>
            </div>
          )}
        </Card>

        {list.items.length === 0 ? (
          <Empty icon="collection" title="This list is empty">
            <p>Add resources from {profile?.role === 'professor' ? 'the Library or your recommendations' : 'your recommendations'} with “Add to list”.</p>
            <LinkButton to={profile?.role === 'professor' ? '/library' : '/recommendations'} variant="secondary" className="mt-4">
              Find resources
            </LinkButton>
          </Empty>
        ) : (
          <ul className="space-y-3">
            {list.items.map(({ resource }) => (
              <li key={resource.id ?? resource.title}>
                <Card className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    {resource.available ? (
                      <Link to={`/resource/${resource.id}`} className="font-semibold hover:text-rl-teal-dark hover:underline">
                        {resource.title}
                      </Link>
                    ) : (
                      <p className="font-semibold text-slate-500 line-through">
                        {resource.title} <span className="text-sm font-normal no-underline">(no longer available)</span>
                      </p>
                    )}
                    <Tags subject={resource.subject} level={resource.level} medium={resource.medium} />
                  </div>
                  {resource.id && (
                    <ConfirmButton confirmLabel="Remove" onConfirm={() => remove(resource.id!, resource.title)}>
                      <i className="bi bi-x-lg" /> Remove
                    </ConfirmButton>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Page>
  )
}
