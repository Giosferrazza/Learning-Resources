import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { goals, levels, media, subjects } from '../../../shared/vocabulary'
import { useAuth } from '../auth/AuthProvider'
import { Alert, Button, Card, Checkboxes, Loading, Page, Select } from '../components/ui'
import { api, errorMessage } from '../lib/api'

type Latest = { response: { topic: string; knowledge_level: string; preferred_media: string[]; goal: string | null } | null }

// S1-07 questionnaire (+ S1-33 goal). Professors use it to plan lessons (S1-11-T02 wording).
export default function QuestionnairePage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const professor = profile?.role === 'professor'
  const [form, setForm] = useState({ topic: '', level: '', media: [] as string[], goal: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  // Start from the previous answers so changing one thing is quick
  useEffect(() => {
    api<Latest>('/questionnaire/latest')
      .then(({ response }) => response && setForm({ topic: response.topic, level: response.knowledge_level, media: response.preferred_media, goal: response.goal ?? '' }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!form.topic) next.topic = 'Choose a subject.'
    if (!form.level) next.level = professor ? 'Choose the level you are teaching.' : 'Choose your knowledge level.'
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    setError('')
    try {
      const { id } = await api<{ id: string }>('/questionnaire', { method: 'POST', body: form })
      navigate(`/recommendations?responseId=${id}`)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  if (loading) return <Loading />

  return (
    <Page
      title={professor ? 'Plan a lesson' : 'What do you want to learn?'}
      subtitle={professor ? 'Describe what you are teaching and we’ll match resources for your students.' : 'Tell us a little about your goals and we’ll match resources to you.'}
      narrow
    >
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
          <Checkboxes label="Formats (pick any, or none for all)" options={media} value={form.media} onChange={(v) => setForm({ ...form, media: v })} />
          <Select label={professor ? 'Your students’ goal' : 'Your goal'} options={goals} placeholder="No particular goal" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
          <Button type="submit" busy={busy} className="w-full">
            {professor ? 'Find resources for my class' : 'Get my recommendations'}
          </Button>
        </form>
      </Card>
    </Page>
  )
}
