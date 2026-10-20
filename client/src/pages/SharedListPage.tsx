import { useParams } from 'react-router-dom'
import { Card, Empty, Loading, LoadError, Tags, buttonClass, formatDate } from '../components/ui'
import { ApiError } from '../lib/api'
import { useApi } from '../lib/useApi'

type Shared = { list: { name: string; owner: string; updated_at: string; resources: { id: string; title: string; description: string; url: string | null; subject: string | null; level: string | null; medium: string | null }[] } }

// S1-15-T03 Student view of a shared list: public and read-only
export default function SharedListPage() {
  const { token } = useParams()
  const { data, error, loading, reload } = useApi<Shared>(`/shared/${token}`)

  if (loading) return <Loading />
  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Empty icon="link-45deg" title="This link doesn’t work">
          The list may have been unshared. Ask whoever sent it for a new link.
        </Empty>
      </div>
    )
  }
  if (error || !data) return <div className="mx-auto max-w-3xl px-4 py-8">{error && <LoadError error={error} retry={reload} />}</div>

  const { list } = data
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm font-semibold tracking-wide text-rl-teal-dark uppercase">Shared list</p>
      <h1 className="mt-1 text-3xl font-bold">{list.name}</h1>
      <p className="mt-1 text-slate-600">
        From {list.owner} · updated {formatDate(list.updated_at)}
      </p>
      <div className="mt-6 space-y-3">
        {list.resources.length === 0 && <Empty title="No resources in this list yet" />}
        {list.resources.map((r) => (
          <Card key={r.id} className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="font-semibold">{r.title}</h2>
              {r.url && (
                <a href={r.url} target="_blank" rel="noreferrer" className={buttonClass('secondary')}>
                  Open <i className="bi bi-box-arrow-up-right" />
                </a>
              )}
            </div>
            {r.description && <p className="text-sm text-slate-600">{r.description}</p>}
            <Tags subject={r.subject} level={r.level} medium={r.medium} />
          </Card>
        ))}
      </div>
    </div>
  )
}
