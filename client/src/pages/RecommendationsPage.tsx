import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { goals, levels, media, subjects, type Goal, type Level, type Medium, type Subject } from '../../../shared/vocabulary'
import { useAuth } from '../auth/AuthProvider'
import { useFavorites } from '../auth/FavoritesProvider'
import AddToList from '../components/AddToList'
import FavoriteButton from '../components/FavoriteButton'
import ResourceCard from '../components/ResourceCard'
import { Alert, Button, Empty, LinkButton, Loading, LoadError, Page, Pill } from '../components/ui'
import { api, ApiError, errorMessage } from '../lib/api'
import { discoveryItems, type CuratedMatch } from '../lib/discovery'
import { useDiscovery } from '../lib/useDiscovery'
import { useApi } from '../lib/useApi'

type Result = { responseId: string; answers: { topic: Subject; level: Level; media: Medium[]; goal: Goal | null; learningRequest?: string | null }; libraryEmpty: boolean; exact: boolean; items: CuratedMatch[] }

// S1-07 results, S1-34 why, S1-35 closest matches, S1-08 save the whole list, S1-11-T03 professors add to lists
export default function RecommendationsPage() {
  const { profile } = useAuth()
  const [params] = useSearchParams()
  const responseId = params.get('responseId')
  return <QuestionnaireResults key={`${profile?.id}:${responseId ?? 'latest'}`} responseId={responseId} />
}

function QuestionnaireResults({ responseId }: { responseId: string | null }) {
  const { data, error, loading, reload } = useApi<Result>(`/recommendations${responseId ? `?responseId=${encodeURIComponent(responseId)}` : ''}`)
  if (loading) return <Loading label="Finding your matches…" />
  if (error instanceof ApiError && error.code === 'no_questionnaire') {
    return (
      <Page title="Recommendations">
        <Empty icon="ui-checks" title="Answer a short questionnaire first">
          <p>Tell us what you want to learn and we’ll match resources to you.</p>
          <LinkButton to="/questionnaire" className="mt-4">
            Start the questionnaire
          </LinkButton>
        </Empty>
      </Page>
    )
  }
  if (error || !data) return <Page title="Recommendations">{error && <LoadError error={error} retry={reload} />}</Page>

  return <Results key={data.responseId} data={data} />
}

function Results({ data }: { data: Result }) {
  const { profile } = useAuth()
  const { toggle } = useFavorites()
  const [formatFilter, setFormatFilter] = useState<string | null>(null)
  const [saved, setSaved] = useState<{ busy?: boolean; ok?: string; error?: string }>({})
  const web = useDiscovery(profile?.id ?? '', data.responseId)
  const items = useMemo(() => discoveryItems(data.items, web.data), [data.items, web.data])
  const visible = items.filter((item) => !formatFilter || item.medium === formatFilter)
  const formats = [...new Set(items.map((item) => item.medium).filter(Boolean))] as Medium[]
  const { answers } = data
  const summary = [subjects[answers.topic], levels[answers.level], answers.media.length ? answers.media.map((m) => media[m]).join(', ') : 'any format', answers.goal ? goals[answers.goal] : null].filter(Boolean).join(' · ')

  // S1-08: save this set of recommendations as a list and favorite it
  async function saveList() {
    setSaved({ busy: true })
    try {
      const name = `${subjects[answers.topic]} (${levels[answers.level]}) recommendations`
      const { list } = await api<{ list: { id: string; name: string } }>('/lists', { method: 'POST', body: { name, resourceIds: data.items.map((i) => i.resource.id) } })
      await toggle({ listId: list.id })
      setSaved({ ok: `Saved as “${list.name}” in your favorites.` })
    } catch (err) {
      setSaved({ error: errorMessage(err) })
    }
  }

  return (
    <Page
      title={profile?.role === 'professor' ? 'Resources for your lesson' : 'Your recommendations'}
      subtitle={summary}
      actions={
        <>
          <LinkButton to="/questionnaire" variant="secondary">
            Change answers
          </LinkButton>
          {data.items.length > 0 && (
            <Button onClick={saveList} busy={saved.busy} disabled={Boolean(saved.ok)}>
              <i className="bi bi-heart" /> {saved.ok ? 'List saved' : 'Save this list'}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {saved.ok && (
          <Alert kind="success">
            {saved.ok}{' '}
            <Link to="/favorites" className="font-semibold underline">
              View favorites
            </Link>
          </Alert>
        )}
        {saved.error && <Alert kind="error">{saved.error}</Alert>}

        {data.answers.learningRequest && <p className="break-words text-sm text-slate-600">Your learning request: {data.answers.learningRequest}</p>}
        <p className="text-sm text-slate-600">Educator-approved library resources and resources found on the web, together. Favorites and saved lists include library resources only.</p>
        {data.items.length === 0 && <Alert kind="info">{data.libraryEmpty ? 'The educator library is empty right now.' : `No educator-approved resources in ${subjects[answers.topic]} match yet.`} External videos may still be available below.</Alert>}
        {data.items.length > 0 && !data.exact && <Alert kind="info">No library resources match all your answers; showing the closest matches.</Alert>}
        {web.loading && <p role="status" className="text-sm text-slate-500">Searching the web for more resources… You can browse library resources while we search.</p>}
        {web.error && <Alert kind="info">{web.error} Your library recommendations are still available.</Alert>}
        {web.data && web.data.resources.length === 0 && <Alert kind="info">No web resources found for these answers. You can refine your learning request using Change answers.</Alert>}
        {formats.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">Filter:</span>
            {[null, ...formats].map((f) => (
              <button
                key={f ?? 'all'}
                type="button"
                aria-pressed={formatFilter === f}
                onClick={() => setFormatFilter(f)}
                className={`rounded-full border px-3 py-1 ${formatFilter === f ? 'border-rl-teal bg-rl-teal/15 text-rl-teal-dark' : 'border-slate-300 bg-white text-slate-600'}`}
              >
                {f ? media[f] : 'All formats'}
              </button>
            ))}
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((item) => {
            if (item.kind === 'external') return <ResourceCard key={item.key} {...item.resource} externalUrl={item.resource.url} sourceLabel={`${item.resource.source} · External · Not educator-reviewed`} />
            const { resource, reasons, gaps, exact } = item.match
            return (
              <ResourceCard
                key={item.key}
                sourceLabel="Learning Resources · Educator-approved"
                {...resource}
                actions={
                  <>
                    {profile?.role === 'professor' && <AddToList resourceId={resource.id} />}
                    <FavoriteButton resourceId={resource.id} />
                  </>
                }
              >
                <div className="rounded-lg bg-rl-light px-3 py-2 text-sm">
                  <p className="font-medium text-slate-700">
                    {exact ? 'Why this matches' : 'Closest match'} {!exact && <Pill tone="amber">Partial</Pill>}
                  </p>
                  <ul className="mt-1 space-y-0.5 text-slate-600">
                    {reasons.map((reason) => <li key={reason}><i className="bi bi-check2 mr-1 text-rl-teal" />{reason}</li>)}
                    {gaps.map((gap) => <li key={gap} className="text-slate-500"><i className="bi bi-dash mr-1" />{gap}</li>)}
                  </ul>
                </div>
              </ResourceCard>
              )
          })}
        </div>
        {items.length > 0 && visible.length === 0 && <p className="text-sm text-slate-600">No resources in this format.</p>}
      </div>
    </Page>
  )
}
