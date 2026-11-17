import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { matchesFilters } from '../../../shared/filters'
import { goals, levels, media, subjects, type Goal, type Level, type Medium, type Subject } from '../../../shared/vocabulary'
import { useAuth } from '../auth/AuthProvider'
import { useFavorites } from '../auth/FavoritesProvider'
import AddToList from '../components/AddToList'
import FavoriteButton from '../components/FavoriteButton'
import FilterBar from '../components/FilterBar'
import { useFilters } from '../lib/useFilters'
import ResourceCard from '../components/ResourceCard'
import { Alert, Button, Empty, ErrorState, LinkButton, Loading, Page, Pill, formatDate } from '../components/ui'
import { api, ApiError, errorMessage } from '../lib/api'
import { discoveryItems, type CuratedMatch } from '../lib/discovery'
import { useDiscovery } from '../lib/useDiscovery'
import type { QuestionnaireResponse } from '../lib/types'
import { useApi } from '../lib/useApi'

type Result = { responseId: string; answers: { topic: Subject; level: Level; media: Medium[]; goal: Goal | null; learningRequest?: string | null }; libraryEmpty: boolean; exact: boolean; mediumFallback?: boolean; items: CuratedMatch[] }

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
  if (error || !data) return <Page title="Recommendations">{error && <ErrorState error={error} retry={reload} />}</Page>

  return <Results key={data.responseId} data={data} />
}

function QuestionnaireSwitcher({ current }: { current: string }) {
  const navigate = useNavigate()
  const { data } = useApi<{ responses?: QuestionnaireResponse[] }>('/questionnaires')
  const responses = data?.responses ?? []
  if (responses.length < 2) return null
  return (
    <label className="block text-sm font-medium text-slate-700">
      Showing results for
      <select value={current} onChange={(e) => navigate(`/recommendations?responseId=${e.target.value}`)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm sm:w-auto">
        {responses.map((r) => (
          <option key={r.id} value={r.id}>
            {subjects[r.topic]} · {levels[r.knowledge_level]}
            {r.goal ? ` · ${goals[r.goal]}` : ''} · {formatDate(r.created_at)}
          </option>
        ))}
      </select>
    </label>
  )
}

function Results({ data }: { data: Result }) {
  const { profile } = useAuth()
  const { toggle } = useFavorites()
  const [params] = useSearchParams()
  const { filters, setFilters, clearFilters, active } = useFilters()
  const [saved, setSaved] = useState<{ busy?: boolean; ok?: string; error?: string }>({})
  const web = useDiscovery(profile?.id ?? '', data.responseId)
  const items = useMemo(() => discoveryItems(data.items, web.data), [data.items, web.data])
  const { answers } = data
  // S2-03-T02 Web results are about the questionnaire's subject but carry no level
  const tagsOf = (item: (typeof items)[number]) => (item.kind === 'curated' ? item.match.resource : { subject: answers.topic, level: null, medium: item.medium })
  const visible = items.filter((item) => matchesFilters(tagsOf(item), filters))
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
      breadcrumbs={[{ label: 'My questionnaires', to: '/questionnaires' }, { label: 'Recommendations' }]}
      actions={
        <>
          <LinkButton to={`/questionnaire/${data.responseId}/edit`} variant="secondary">
            <i className="bi bi-pencil" aria-hidden /> Edit answers
          </LinkButton>
          <LinkButton to={`/questionnaire?from=${data.responseId}`} variant="secondary">
            <i className="bi bi-arrow-repeat" aria-hidden /> Retake
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
        <QuestionnaireSwitcher current={data.responseId} />
        {params.get('updated') === '1' && <Alert kind="success">Your answers were updated and these recommendations were refreshed. The previous result is saved in <Link to="/history" className="font-semibold underline">History</Link>.</Alert>}
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
        {data.mediumFallback ? (
          <Alert kind="info">Nothing in {subjects[answers.topic]} comes as {answers.media.map((m) => media[m].toLowerCase()).join(' or ')} yet, so these are the closest matches in other formats.</Alert>
        ) : (
          data.items.length > 0 && !data.exact && <Alert kind="info">No library resources match all your answers; showing the closest matches.</Alert>
        )}
        {web.loading && <p role="status" className="text-sm text-slate-500">Searching the web for more resources… You can browse library resources while we search.</p>}
        {web.error && <Alert kind="info">{web.error} Your library recommendations are still available.</Alert>}
        {web.data && web.data.resources.length === 0 && <Alert kind="info">No web resources found for these answers. You can refine your learning request using Change answers.</Alert>}
        {items.length > 0 && <FilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />}
        {active > 0 && items.length > 0 && (
          <p className="text-sm text-slate-500" role="status">
            Showing {visible.length} of {items.length}
          </p>
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
                url={resource.url}
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
        {items.length > 0 && visible.length === 0 && (
          <Empty icon="funnel" title="No resources match these filters">
            <Button variant="secondary" className="mt-3" onClick={clearFilters}>
              Clear filters
            </Button>
          </Empty>
        )}
      </div>
    </Page>
  )
}
