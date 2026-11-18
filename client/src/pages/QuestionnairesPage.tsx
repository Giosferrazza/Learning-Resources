import { Link } from 'react-router-dom'
import { goals, levels, media, subjects } from '../../../shared/vocabulary'
import { useAuth } from '../auth/AuthProvider'
import { buttonClass, Card, Empty, ErrorState, LinkButton, Loading, Page, formatDate, formatDateTime } from '../components/ui'
import type { QuestionnaireResponse } from '../lib/types'
import { useApi } from '../lib/useApi'

// S2-04-T01 Start screen: every questionnaire I've filled in, each with its own results,
// plus starting a new one for another topic or goal.
export default function QuestionnairesPage() {
  const { profile } = useAuth()
  const { data, error, loading, reload } = useApi<{ responses: QuestionnaireResponse[] }>('/questionnaires')
  const professor = profile?.role === 'professor'

  return (
    <Page
      title="My questionnaires"
      subtitle={professor ? 'One per class or topic.' : 'One per topic or goal.'}
      actions={
        <>
          <LinkButton to="/history" variant="secondary">
            <i className="bi bi-clock-history" aria-hidden /> Past results
          </LinkButton>
          <LinkButton to="/questionnaire?new=1">
            <i className="bi bi-plus-lg" aria-hidden /> New questionnaire
          </LinkButton>
        </>
      }
    >
      {loading && <Loading />}
      {error && <ErrorState error={error} retry={reload} />}
      {data && data.responses.length === 0 && (
        <Empty icon="ui-checks" title="No questionnaires yet">
          <p>Answer a few questions and we’ll match resources to you.</p>
          <LinkButton to="/questionnaire?new=1" className="mt-4">
            Start your first questionnaire
          </LinkButton>
        </Empty>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {data?.responses.map((r) => (
          <Card key={r.id} className="flex flex-col gap-3">
            <div>
              <h2 className="font-semibold">
                {subjects[r.topic]} · {levels[r.knowledge_level]}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {r.goal ? goals[r.goal] : 'No particular goal'} · {r.preferred_media.length ? r.preferred_media.map((m) => media[m]).join(', ') : 'Any format'}
              </p>
              {r.learning_request && <p className="mt-1 line-clamp-2 text-sm break-words text-slate-500">“{r.learning_request}”</p>}
              <p className="mt-2 text-xs text-slate-500">
                Submitted {formatDate(r.created_at)}
                {r.updated_at && r.updated_at.slice(0, 16) !== r.created_at.slice(0, 16) && ` · edited ${formatDateTime(r.updated_at)}`}
              </p>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              <Link to={`/recommendations?responseId=${r.id}`} className={buttonClass('primary', 'px-3 py-1.5')}>
                View recommendations
              </Link>
              <Link to={`/questionnaire/${r.id}/edit`} className={buttonClass('secondary', 'px-3 py-1.5')}>
                Edit
              </Link>
              <Link to={`/questionnaire?from=${r.id}`} className={buttonClass('ghost', 'px-3 py-1.5')}>
                Retake
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </Page>
  )
}
