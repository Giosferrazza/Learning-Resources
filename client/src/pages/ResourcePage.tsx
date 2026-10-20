import { useParams } from 'react-router-dom'
import { goals as goalLabels } from '../../../shared/vocabulary'
import AddToList from '../components/AddToList'
import FavoriteButton from '../components/FavoriteButton'
import FeedbackForm from '../components/FeedbackForm'
import ReportForm from '../components/ReportForm'
import { Card, Empty, LinkButton, Loading, LoadError, Pill, StatusPill, Tags, buttonClass } from '../components/ui'
import { ApiError } from '../lib/api'
import type { Resource } from '../lib/types'
import { useApi } from '../lib/useApi'

type Detail = { resource: Resource; rating: { average: number | null; count: number }; canEdit: boolean }

// Resource detail: open it, save it, rate it (S1-09) or report it (S1-10)
export default function ResourcePage() {
  const { id } = useParams()
  const { data, error, loading, reload } = useApi<Detail>(`/resources/${id}`)

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

  const { resource, rating, canEdit } = data
  const published = resource.status === 'published'
  const link = resource.file_url ?? resource.url

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Card className="space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {!published && <StatusPill status={resource.status} />}
            <h1 className="mt-1 text-2xl font-bold">{resource.title}</h1>
            {rating.count > 0 && (
              <p className="mt-1 text-sm text-slate-600">
                <i className="bi bi-star-fill mr-1 text-rl-gold" />
                {rating.average!.toFixed(1)} from {rating.count} rating{rating.count > 1 ? 's' : ''}
              </p>
            )}
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
            <a href={link} target="_blank" rel="noreferrer" className={buttonClass('primary')}>
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
