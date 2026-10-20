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
import type { Resource } from '../lib/types'
import { useApi } from '../lib/useApi'

type Item = { resource: Resource; exact: boolean; reasons: string[]; gaps: string[] }
type Result = { responseId: string; answers: { topic: Subject; level: Level; media: Medium[]; goal: Goal | null }; libraryEmpty: boolean; exact: boolean; items: Item[] }

// S1-07 results, S1-34 why, S1-35 closest matches, S1-08 save the whole list, S1-11-T03 professors add to lists
export default function RecommendationsPage() {
  const { profile } = useAuth()
  const { toggle } = useFavorites()
  const [params] = useSearchParams()
  const responseId = params.get('responseId')
  const { data, error, loading, reload } = useApi<Result>(`/recommendations${responseId ? `?responseId=${responseId}` : ''}`)
  const [formatFilter, setFormatFilter] = useState<string | null>(null)
  const [saved, setSaved] = useState<{ busy?: boolean; ok?: string; error?: string }>({})

  const visible = useMemo(() => (data?.items ?? []).filter((i) => !formatFilter || i.resource.medium === formatFilter), [data, formatFilter])
  const formats = useMemo(() => [...new Set((data?.items ?? []).map((i) => i.resource.medium).filter(Boolean))] as Medium[], [data])

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

  const { answers } = data
  const summary = [subjects[answers.topic], levels[answers.level], answers.media.length ? answers.media.map((m) => media[m]).join(', ') : 'any format', answers.goal ? goals[answers.goal] : null].filter(Boolean).join(' · ')

  // S1-08: save this set of recommendations as a list and favorite it
  async function saveList() {
    setSaved({ busy: true })
    try {
      const name = `${subjects[answers.topic]} (${levels[answers.level]}) recommendations`
      const { list } = await api<{ list: { id: string; name: string } }>('/lists', { method: 'POST', body: { name, resourceIds: data!.items.map((i) => i.resource.id) } })
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

        {data.libraryEmpty ? (
          <Empty icon="journal-x" title="The library is empty right now">
            Educators haven’t published any resources yet. Check back soon.
          </Empty>
        ) : data.items.length === 0 ? (
          <Empty icon="search" title={`Nothing in ${subjects[answers.topic]} yet`}>
            <p>Try another subject, or check back after educators add more resources.</p>
            <LinkButton to="/questionnaire" variant="secondary" className="mt-4">
              Change answers
            </LinkButton>
          </Empty>
        ) : (
          <>
            {!data.exact && <Alert kind="info">No resources match all of your answers, so here are the closest matches in {subjects[answers.topic]}.</Alert>}
            {formats.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-slate-500">Filter:</span>
                {[null, ...formats].map((f) => (
                  <button
                    key={f ?? 'all'}
                    type="button"
                    onClick={() => setFormatFilter(f)}
                    className={`rounded-full border px-3 py-1 ${formatFilter === f ? 'border-rl-teal bg-rl-teal/15 text-rl-teal-dark' : 'border-slate-300 bg-white text-slate-600'}`}
                  >
                    {f ? media[f] : 'All formats'}
                  </button>
                ))}
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {visible.map(({ resource, reasons, gaps, exact }) => (
                <ResourceCard
                  key={resource.id}
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
                      {reasons.map((r) => (
                        <li key={r}>
                          <i className="bi bi-check2 mr-1 text-rl-teal" />
                          {r}
                        </li>
                      ))}
                      {gaps.map((g) => (
                        <li key={g} className="text-slate-500">
                          <i className="bi bi-dash mr-1" />
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                </ResourceCard>
              ))}
            </div>
          </>
        )}
      </div>
    </Page>
  )
}
