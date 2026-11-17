import { Link, useParams } from 'react-router-dom'
import { goals, levels, media, subjects, type Goal, type Level, type Medium, type Subject } from '../../../shared/vocabulary'
import { Alert, Card, Empty, ErrorState, LinkButton, Loading, Page, Pill, Tags, formatDateTime } from '../components/ui'
import { ApiError } from '../lib/api'
import { useApi } from '../lib/useApi'

type Answers = { topic: Subject; level: Level; media: Medium[]; goal: Goal | null; learningRequest?: string | null }
type Snapshot = { id: string; response_id: string; reason: 'submitted' | 'edited' | 'before_edit'; answers: Answers; exact: boolean; created_at: string; count: number }
type SnapshotItem = { id: string; title: string; subject: string | null; level: string | null; medium: string | null; exact: boolean; reasons: string[]; gaps: string[]; available: boolean }

const reasonText = { submitted: 'Submitted', edited: 'After editing', before_edit: 'Before editing' }
const describe = (a: Answers) => [subjects[a.topic], levels[a.level], a.media.length ? a.media.map((m) => media[m]).join(', ') : 'any format', a.goal ? goals[a.goal] : null].filter(Boolean).join(' · ')

// S2-17-T01 Every earlier result, newest first
export function HistoryPage() {
  const { data, error, loading, reload } = useApi<{ snapshots: Snapshot[] }>('/history')
  return (
    <Page title="Past results" subtitle="A copy of your recommendations is saved every time you submit or edit a questionnaire." breadcrumbs={[{ label: 'My questionnaires', to: '/questionnaires' }, { label: 'Past results' }]}>
      {loading && <Loading />}
      {error && <ErrorState error={error} retry={reload} />}
      {data && !data.snapshots.length && (
        <Empty icon="clock-history" title="No past results yet">
          <LinkButton to="/questionnaire?new=1" className="mt-4">
            Take a questionnaire
          </LinkButton>
        </Empty>
      )}
      <ul className="space-y-2">
        {data?.snapshots.map((s) => (
          <li key={s.id}>
            <Link to={`/history/${s.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-rl-teal">
              <div className="min-w-0">
                <p className="font-semibold">{describe(s.answers)}</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {reasonText[s.reason]} · {formatDateTime(s.created_at)}
                </p>
              </div>
              <Pill tone={s.count ? 'teal' : 'slate'}>
                {s.count} resource{s.count === 1 ? '' : 's'}
              </Pill>
            </Link>
          </li>
        ))}
      </ul>
    </Page>
  )
}

// S2-17-T03 One past result as it was. Resources removed since then are marked, not hidden.
export function HistoryDetailPage() {
  const { id } = useParams()
  const { data, error, loading, reload } = useApi<{ snapshot: Omit<Snapshot, 'count'> & { items: SnapshotItem[]; responseExists: boolean } }>(`/history/${id}`)
  const crumbs = [{ label: 'My questionnaires', to: '/questionnaires' }, { label: 'Past results', to: '/history' }, { label: 'Result' }]
  if (loading) return <Loading />
  if (error instanceof ApiError && error.status === 404) {
    return (
      <Page title="Result not found" breadcrumbs={crumbs}>
        <Empty icon="clock-history" title="This result doesn’t exist or isn’t yours">
          <LinkButton to="/history" className="mt-4">
            Back to past results
          </LinkButton>
        </Empty>
      </Page>
    )
  }
  if (error || !data) return <Page title="Past result" breadcrumbs={crumbs}>{error && <ErrorState error={error} retry={reload} />}</Page>
  const { snapshot } = data
  const missing = snapshot.items.filter((i) => !i.available).length

  return (
    <Page
      title={describe(snapshot.answers)}
      subtitle={`${reasonText[snapshot.reason]} · ${formatDateTime(snapshot.created_at)}`}
      breadcrumbs={crumbs}
      actions={
        snapshot.responseExists && (
          <LinkButton to={`/recommendations?responseId=${snapshot.response_id}`} variant="secondary">
            Current recommendations
          </LinkButton>
        )
      }
    >
      <div className="space-y-4">
        {snapshot.answers.learningRequest && <p className="text-sm break-words text-slate-600">Your learning request: {snapshot.answers.learningRequest}</p>}
        {!snapshot.exact && snapshot.items.length > 0 && <Alert kind="info">Nothing matched every answer at the time; these were the closest matches.</Alert>}
        {missing > 0 && <Alert kind="info">{missing === 1 ? 'One resource is' : `${missing} resources are`} no longer available and can’t be opened.</Alert>}
        {!snapshot.items.length && <Empty icon="inbox" title="No library resources matched at the time" />}
        <div className="grid gap-4 md:grid-cols-2">
          {snapshot.items.map((item) => (
            <Card key={item.id} className={`flex flex-col gap-2 ${item.available ? '' : 'opacity-70'}`}>
              <div className="flex items-start justify-between gap-2">
                {item.available ? (
                  <Link to={`/resource/${item.id}`} className="font-semibold hover:text-rl-teal-dark hover:underline">
                    {item.title}
                  </Link>
                ) : (
                  <span className="font-semibold text-slate-500 line-through">{item.title}</span>
                )}
                {!item.available && <Pill tone="red">No longer available</Pill>}
              </div>
              <Tags subject={item.subject} level={item.level} medium={item.medium} />
              <ul className="text-sm text-slate-600">
                {item.reasons.map((r) => (
                  <li key={r}>
                    <i className="bi bi-check2 mr-1 text-rl-teal" aria-hidden />
                    {r}
                  </li>
                ))}
                {item.gaps.map((g) => (
                  <li key={g} className="text-slate-500">
                    <i className="bi bi-dash mr-1" aria-hidden />
                    {g}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </Page>
  )
}
