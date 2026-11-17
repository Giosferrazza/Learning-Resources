import { useState, type FormEvent } from 'react'
import { supportCategories } from '../../../shared/vocabulary'
import { useAuth } from '../auth/AuthProvider'
import { Alert, Button, Card, Field, Page, Pill, Select, TextArea, formatDate } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { useApi } from '../lib/useApi'

type SupportRequest = { id: string; category: keyof typeof supportCategories; subject: string; message: string; status: 'open' | 'resolved'; resolution_note: string | null; resolved_at: string | null; created_at: string }

const empty = { name: '', email: '', category: '', subject: '', message: '', website: '' }

// S2-02-T01 / S2-02-T03 Support page: anyone can write in; signed-in people also see their requests
export default function SupportPage() {
  const { profile } = useAuth()
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [state, setState] = useState<{ busy?: boolean; ok?: boolean; error?: string }>({})
  const mine = useApi<{ requests: SupportRequest[] }>(profile ? '/support/mine' : null)
  const set = (key: keyof typeof empty) => (e: { target: { value: string } }) => {
    setForm({ ...form, [key]: e.target.value })
    setErrors({ ...errors, [key]: '' })
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (state.busy) return
    const next: Record<string, string> = {}
    if (!profile && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter an email address so we can reply.'
    if (!form.category) next.category = 'Choose what this is about.'
    if (!form.subject.trim()) next.subject = 'Add a short subject.'
    if (form.message.trim().length < 10) next.message = 'Describe the problem in at least 10 characters.'
    setErrors(next)
    if (Object.keys(next).length) return
    setState({ busy: true })
    try {
      await api('/support', { method: 'POST', body: form, auth: Boolean(profile) })
      setForm(empty)
      setState({ ok: true })
      mine.reload()
    } catch (err) {
      setState({ error: errorMessage(err) })
    }
  }

  return (
    <Page title="Help and support" subtitle="Something not working, or not sure how to do something? An admin will get back to you.">
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          {state.ok ? (
            <div className="space-y-4" role="status">
              <Alert kind="success">
                <strong>Thanks, we got your request.</strong> An admin has been notified{profile ? ' and you’ll get a notification when it’s resolved' : ' and will reply by email'}.
              </Alert>
              <Button variant="secondary" onClick={() => setState({})}>
                Send another request
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4" noValidate>
              {state.error && <Alert kind="error">{state.error}</Alert>}
              {profile ? (
                <p className="text-sm text-slate-600">
                  Sending as <strong>{profile.display_name || profile.email}</strong> ({profile.email})
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Your name" value={form.name} onChange={set('name')} maxLength={120} autoComplete="name" />
                  <Field label="Email" type="email" value={form.email} onChange={set('email')} maxLength={254} autoComplete="email" error={errors.email} required />
                </div>
              )}
              <Select label="What is this about?" options={supportCategories} placeholder="Choose one" value={form.category} onChange={set('category')} error={errors.category} />
              <Field label="Subject" value={form.subject} onChange={set('subject')} maxLength={150} placeholder="e.g. My recommendations are empty" error={errors.subject} />
              <TextArea label="What happened?" rows={6} value={form.message} onChange={set('message')} maxLength={4000} hint="Include the page you were on and what you expected to happen." error={errors.message} />
              {/* Hidden from people; bots fill it in */}
              <input type="text" name="website" value={form.website} onChange={set('website')} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
              <Button type="submit" busy={state.busy}>
                <i className="bi bi-send" aria-hidden /> Send request
              </Button>
            </form>
          )}
        </Card>

        <aside className="space-y-4">
          <Card>
            <h2 className="font-semibold">Quick answers</h2>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              <li>
                <strong>Forgot your password?</strong> Use “Forgot password” on the sign-in page.
              </li>
              <li>
                <strong>Different results?</strong> Edit your questionnaire or start a new one from My questionnaires.
              </li>
              <li>
                <strong>A broken link?</strong> Use “Report a problem” on the resource’s page.
              </li>
            </ul>
          </Card>
          {profile && (
            <Card>
              <h2 className="font-semibold">Your requests</h2>
              {mine.data && !mine.data.requests.length && <p className="mt-2 text-sm text-slate-500">You haven’t sent any requests.</p>}
              <ul className="mt-2 space-y-3">
                {mine.data?.requests.map((r) => (
                  <li key={r.id} className="text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium break-words">{r.subject}</span>
                      <Pill tone={r.status === 'open' ? 'amber' : 'green'}>{r.status === 'open' ? 'Open' : 'Resolved'}</Pill>
                    </div>
                    <p className="text-xs text-slate-500">{formatDate(r.created_at)}</p>
                    {r.resolution_note && <p className="mt-1 rounded bg-rl-light px-2 py-1 text-slate-700">{r.resolution_note}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </Page>
  )
}
