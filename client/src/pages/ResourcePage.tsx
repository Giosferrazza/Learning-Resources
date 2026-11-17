import { useEffect } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { goals as goalLabels } from '../../../shared/vocabulary'
import AddToList from '../components/AddToList'
import FavoriteButton from '../components/FavoriteButton'
import FeedbackForm from '../components/FeedbackForm'
import ReportForm from '../components/ReportForm'
import { Breadcrumbs, Card, Empty, LinkButton, Loading, LoadError, Pill, Stars, StatusPill, Tags, buttonClass, formatDate } from '../components/ui'
import { ApiError, trackResource } from '../lib/api'
import { roleLabel } from '../lib/roles'
import type { Resource } from '../lib/types'
import { useApi } from '../lib/useApi'

type Detail = {
  resource: Resource & { reviewed_at?: string | null }
  rating: { average: number | null; count: number; distribution?: { stars: number; count: number }[] }
  quality?: { favorites: number; reviewedAt: string | null; comments: { rating: number | null; comment: string; created_at: string; role: string }[] }
  relevance?: { exact: boolean; reasons: string[]; gaps: string[] } | null
  canEdit: boolean
}

// Resource detail: open it, save it, rate it (S1-09) or report it (S1-10)
export default function ResourcePage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const location = useLocation()
  const { data, error, loading, reload } = useApi<Detail>(`/resources/${id}`)
  const published = data?.resource.status === 'published'

  // S2-12 Count a view once the page has loaded a published resource
  useEffect(() => {
    if (published && id) trackResource(id, 'view')
  }, [published, id])

  // S2-01-T03 Trail back to wherever this role browses resources from
  const from = (location.state as { from?: { label: string; to: string } } | null)?.from
  const home = from ?? (profile?.role === 'student' ? { label: 'Recommendations', to: '/recommendations' } : profile?.role === 'admin' ? { label: 'Resources', to: '/admin/resources' } : { label: 'Library', to: '/library' })

  if (loading) return <Loading />
  if (error instanceof ApiError && (error.status === 410 || error.status === 404)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Empty icon="journal-x" title={error.status === 410 ? 'This resource is no longer available' : 'Resource not found'}>
          It may have been removed from the library.
        </Empty>
      </div>
    )
  }
  if (error || !data) return <div className="mx-auto max-w-3xl px-4 py-8">{error && <LoadError error={error} retry={reload} />}</div>

  const { resource, rating, canEdit, quality, relevance } = data
  const link = resource.file_url ?? resource.url

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-8">
      <Breadcrumbs items={[home, { label: resource.title }]} />
      <Card className="space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {!published && <StatusPill status={resource.status} />}
            <h1 className="mt-1 text-2xl font-bold">{resource.title}</h1>
            <p className="mt-1">
              <Stars rating={rating} />
            </p>
          </div>
          {published && (
            <div className="flex gap-2">
              <AddToList resourceId={resource.id} />
              <FavoriteButton resourceId={resource.id} withLabel />
            </div>
          )}
        </div>
        <Tags subject={resource.subject} level={resource.level} medium={resource.medium} />
        {resource.goals.length > 0 && (
          <div className="flex flex-wrap gap-1.5 text-sm text-slate-600">
            Good for:
            {resource.goals.map((g) => (
              <Pill key={g} tone="slate">
                {goalLabels[g]}
              </Pill>
            ))}
          </div>
        )}
        {resource.description && <p className="whitespace-pre-line text-slate-700">{resource.description}</p>}
        <div className="flex flex-wrap gap-2">
          {link && (
            <a href={link} target="_blank" rel="noreferrer" className={buttonClass('primary')} onClick={() => published && trackResource(resource.id, 'open')}>
              <i className={`bi ${resource.file_url ? 'bi-download' : 'bi-box-arrow-up-right'}`} /> {resource.file_url ? 'Open file' : 'Open resource'}
            </a>
          )}
          {canEdit && resource.status !== 'removed' && (
            <LinkButton to={`/resources/${resource.id}/edit`} variant="secondary">
              Edit
            </LinkButton>
          )}
        </div>
      </Card>

      {relevance && (
        <Card>
          <h2 className="font-semibold">How it fits your latest questionnaire</h2>
          <p className="mt-1 text-sm text-slate-500">{relevance.exact ? 'A full match for your answers.' : 'A partial match for your answers.'}</p>
          <ul className="mt-2 space-y-0.5 text-sm text-slate-600">
            {relevance.reasons.map((r) => (
              <li key={r}>
                <i className="bi bi-check2 mr-1 text-rl-teal" aria-hidden />
                {r}
              </li>
            ))}
            {relevance.gaps.map((g) => (
              <li key={g} className="text-slate-500">
                <i className="bi bi-dash mr-1" aria-hidden />
                {g}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* S2-09 Quality details */}
      {published && quality && (
        <Card className="space-y-4">
          <h2 className="font-semibold">Quality</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">Average rating</dt>
              <dd className="font-semibold">{rating.average !== null ? `${rating.average.toFixed(1)} / 5` : 'Not rated yet'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Saved by</dt>
              <dd className="font-semibold">
                {quality.favorites} {quality.favorites === 1 ? 'person' : 'people'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Educator-approved</dt>
              <dd className="font-semibold">{quality.reviewedAt ? formatDate(quality.reviewedAt) : 'Yes'}</dd>
            </div>
          </dl>
          {rating.count > 0 && rating.distribution && (
            <div className="space-y-1" aria-label="Ratings by stars">
              {rating.distribution.map((d) => (
                <div key={d.stars} className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="w-8 shrink-0">
                    {d.stars} <i className="bi bi-star-fill text-rl-gold" aria-hidden />
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span className="block h-full rounded-full bg-rl-gold" style={{ width: `${(d.count / rating.count) * 100}%` }} />
                  </span>
                  <span className="w-6 text-right">{d.count}</span>
                </div>
              ))}
            </div>
          )}
          {quality.comments.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Recent feedback</h3>
              <ul className="mt-2 space-y-2">
                {quality.comments.map((c, i) => (
                  <li key={i} className="rounded-lg bg-rl-light px-3 py-2 text-sm">
                    <p className="whitespace-pre-line text-slate-700">{c.comment}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {c.rating ? `${c.rating}★ · ` : ''}A {roleLabel[c.role as keyof typeof roleLabel]?.toLowerCase() ?? 'reader'} · {formatDate(c.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {published && (
        <>
          <Card>
            <FeedbackForm resourceId={resource.id} onSaved={reload} />
          </Card>
          <ReportForm resourceId={resource.id} />
        </>
      )}
    </div>
  )
}
