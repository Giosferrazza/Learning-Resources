import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { goals, levels, media, subjects, learningRequestMaxLength } from '../../../shared/vocabulary'
import { useAuth } from '../auth/AuthProvider'
import { Alert, Button, Card, Checkboxes, Empty, LinkButton, Loading, Page, Select, TextArea } from '../components/ui'
import { api, errorMessage } from '../lib/api'

type Latest = { response: { topic: string; knowledge_level: string; preferred_media: string[]; goal: string | null; learning_request?: string | null } | null }

// S1-07 questionnaire (+ S1-33 goal). Professors use it to plan lessons (S1-11-T02 wording).
// Three modes (S2-04, S2-16):
//   /questionnaire              a new questionnaire, starting from the latest answers
//   /questionnaire?new=1        a new questionnaire for a different topic or goal, blank
//   /questionnaire?from=<id>    retake: a new questionnaire prefilled from an earlier one
//   /questionnaire/<id>/edit    edit that questionnaire in place; results regenerate
export default function QuestionnairePage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { id: editId } = useParams()
  const [params] = useSearchParams()
  const fromId = params.get('from')
  const blank = params.get('new') === '1'
  const professor = profile?.role === 'professor'
  const [form, setForm] = useState({ topic: '', level: '', media: [] as string[], goal: '', learningRequest: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Start from the previous answers so changing one thing is quick
  // (ignore a response that arrives after unmount so it can't overwrite answers being edited)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(!blank)
  useEffect(() => {
    let active = true
    if (blank) return
    const source = editId ?? fromId
    api<Latest>(source ? `/questionnaire/${source}` : '/questionnaire/latest')
      .then(({ response }) => active && response && setForm({ topic: response.topic, level: response.knowledge_level, media: response.preferred_media, goal: response.goal ?? '', learningRequest: response.learning_request ?? '' }))
      .catch((err) => active && source && setLoadError(errorMessage(err)))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [blank, editId, fromId])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    const next: Record<string, string> = {}
    if (!form.topic) next.topic = 'Choose a subject.'
    if (form.learningRequest.length > learningRequestMaxLength) next.learningRequest = `Use ${learningRequestMaxLength} characters or fewer.`
    if (!form.level) next.level = professor ? 'Choose the level you are teaching.' : 'Choose your knowledge level.'
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    setError('')
    try {
      if (editId) {
        await api(`/questionnaire/${editId}`, { method: 'PATCH', body: form })
        navigate(`/recommendations?responseId=${editId}&updated=1`)
      } else {
        const { id } = await api<{ id: string }>('/questionnaire', { method: 'POST', body: form })
        navigate(`/recommendations?responseId=${id}`)
      }
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  if (loading) return <Loading />
  if (loadError) {
    return (
      <Page title="Questionnaire" narrow breadcrumbs={[{ label: 'My questionnaires', to: '/questionnaires' }, { label: 'Questionnaire' }]}>
        <Empty icon="ui-checks" title={loadError}>
          <LinkButton to="/questionnaires" className="mt-4">
            Back to my questionnaires
          </LinkButton>
        </Empty>
      </Page>
    )
  }

  const title = editId ? 'Edit your answers' : professor ? 'Plan a lesson' : 'What do you want to learn?'
  const subtitle = editId
    ? 'Changes refresh this questionnaire’s results.'
    : fromId
      ? 'Saves as a new questionnaire. The old one stays in your history.'
      : professor
        ? 'Describe what you teach and we’ll match resources.'
        : 'Tell us your goals and we’ll match resources.'

  return (
    <Page title={title} subtitle={subtitle} narrow breadcrumbs={[{ label: 'My questionnaires', to: '/questionnaires' }, { label: editId ? 'Edit' : fromId ? 'Retake' : 'New' }]}>
      <Card>
        <form onSubmit={submit} className="space-y-5" noValidate>
          {error && <Alert kind="error">{error}</Alert>}
          <Select label="Subject" options={subjects} placeholder="Choose a subject" value={form.topic} onChange={(e) => (setForm({ ...form, topic: e.target.value }), setErrors({ ...errors, topic: '' }))} error={errors.topic} />
          <Select
            label={professor ? 'Your students’ level' : 'Your knowledge level'}
            options={levels}
            placeholder="Choose one"
            value={form.level}
            onChange={(e) => (setForm({ ...form, level: e.target.value }), setErrors({ ...errors, level: '' }))}
            error={errors.level}
          />
          <Checkboxes label="Formats (optional)" options={media} value={form.media} onChange={(v) => setForm({ ...form, media: v })} />
          <Select label={professor ? 'Your students’ goal' : 'Your goal'} options={goals} placeholder="No particular goal" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
          <TextArea label="What specifically do you want to learn?" hint={`Optional · ${form.learningRequest.length}/${learningRequestMaxLength} characters. Used to search the web for extra resources; avoid personal information.`} placeholder="I'm learning Python and want to understand for loops and while loops with beginner-friendly examples." maxLength={learningRequestMaxLength} value={form.learningRequest} onChange={(e) => setForm({ ...form, learningRequest: e.target.value })} error={errors.learningRequest} />
          <Button type="submit" busy={busy} className="w-full">
            {editId ? 'Save and refresh recommendations' : professor ? 'Find resources for my class' : 'Get my recommendations'}
          </Button>
        </form>
      </Card>
    </Page>
  )
}
