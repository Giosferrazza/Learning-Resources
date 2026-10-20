import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { goals, levels, media, subjects } from '../../../../shared/vocabulary'
import { useAuth } from '../../auth/AuthProvider'
import { Alert, Button, Card, Checkboxes, Field, Loading, LoadError, Page, Select, StatusPill, TextArea } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import type { Resource } from '../../lib/types'
import { useApi } from '../../lib/useApi'

const MAX_FILE_MB = 20

type Form = { title: string; description: string; url: string; filePath: string; fileName: string; subject: string; level: string; medium: string; goals: string[] }
const empty: Form = { title: '', description: '', url: '', filePath: '', fileName: '', subject: '', level: '', medium: '', goals: [] }

// S1-16 upload, S1-17 tags, S1-18 edit, S1-20 cloned copies, S1-21 save draft vs submit.
// One form for /resources/new and /resources/:id/edit.
export default function ResourceFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const location = useLocation()
  const existing = useApi<{ resource: Resource }>(id ? `/resources/${id}` : null)
  const [form, setForm] = useState<Form>(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [state, setState] = useState<{ busy?: 'draft' | 'submit'; error?: string; ok?: string }>(() =>
    (location.state as { created?: boolean } | null)?.created ? { ok: 'Saved.' } : {},
  )
  const [uploading, setUploading] = useState(false)

  const resource = existing.data?.resource
  useEffect(() => {
    if (!resource) return
    setForm({
      title: resource.title,
      description: resource.description,
      url: resource.url ?? '',
      filePath: resource.file_path ?? '',
      fileName: resource.file_path ? resource.file_path.split('/').pop()!.replace(/^[0-9a-f-]{36}-/, '') : '',
      subject: resource.subject ?? '',
      level: resource.level ?? '',
      medium: resource.medium ?? '',
      goals: resource.goals,
    })
  }, [resource])

  if (id && existing.loading) return <Loading />
  if (id && existing.error) return <Page title="Edit resource"><LoadError error={existing.error} retry={existing.reload} /></Page>

  // Editing a field clears its error right away
  const set = (key: keyof Form) => (e: { target: { value: string } }) => {
    setForm({ ...form, [key]: e.target.value })
    if (errors[key]) setErrors({ ...errors, [key]: '' })
  }

  // S1-16-T02: files go straight to Supabase Storage under the uploader's own folder
  async function upload(file: File) {
    if (file.size > MAX_FILE_MB * 1024 * 1024) return setErrors({ ...errors, file: `Files must be ${MAX_FILE_MB} MB or smaller.` })
    setUploading(true)
    setErrors({ ...errors, file: '' })
    const path = `${profile!.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, '_')}`
    const { error } = await supabase.storage.from('resource-files').upload(path, file)
    setUploading(false)
    if (error) return setErrors({ ...errors, file: error.message })
    setForm({ ...form, filePath: path, fileName: file.name })
    setErrors((errs) => ({ ...errs, url: '' }))
  }

  function validate(submit: boolean) {
    const next: Record<string, string> = {}
    if (!form.title.trim()) next.title = 'Add a title.'
    if (form.url && !/^https?:\/\//i.test(form.url)) next.url = 'Links must start with http:// or https://'
    if (submit) {
      if (!form.url && !form.filePath) next.url = 'Add a link or upload a file.'
      if (!form.subject) next.subject = 'Required to submit.'
      if (!form.level) next.level = 'Required to submit.'
      if (!form.medium) next.medium = 'Required to submit.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  // S1-18-T03 / S1-21-T02 save and submit states
  async function save(submit: boolean) {
    if (!validate(submit)) return setState({ error: 'Fix the highlighted fields.' })
    setState({ busy: submit ? 'submit' : 'draft' })
    const body = { ...form, submit }
    try {
      const { resource: saved } = await api<{ resource: Resource }>(id ? `/resources/${id}` : '/resources', { method: id ? 'PATCH' : 'POST', body })
      if (!id) return navigate(`/resources/${saved.id}/edit`, { replace: true, state: { created: true } })
      existing.setData({ resource: saved })
      setState({ ok: saved.status === 'pending' ? 'Saved and sent for review.' : 'Draft saved.' })
    } catch (err) {
      setState({ error: errorMessage(err) })
    }
  }

  const status = resource?.status
  const locked = status === 'removed'

  return (
    <Page
      title={id ? 'Edit resource' : 'Upload a resource'}
      subtitle={resource?.cloned_from ? 'This is your own copy. Changes here never affect the original.' : undefined}
      actions={status && <StatusPill status={status} />}
    >
      <form onSubmit={(e: FormEvent) => e.preventDefault()} className="grid gap-6 lg:grid-cols-3" noValidate>
        <Card className="space-y-4 lg:col-span-2">
          {status === 'rejected' && resource?.review_note && <Alert kind="error">Not approved: {resource.review_note}. Edit and submit again when ready.</Alert>}
          {status === 'published' && <Alert kind="info">This resource is live. Saving changes sends it back for review, and it is hidden until approved.</Alert>}
          {status === 'pending' && <Alert kind="info">Waiting for an admin to review. You can still make changes.</Alert>}
          {locked && <Alert kind="error">An admin removed this resource, so it can no longer be edited.</Alert>}
          <Field label="Title" value={form.title} onChange={set('title')} maxLength={200} error={errors.title} disabled={locked} />
          <TextArea label="Description" value={form.description} onChange={set('description')} maxLength={4000} hint="What will someone learn from this?" disabled={locked} />
          <Field label="Link" type="url" placeholder="https://" value={form.url} onChange={set('url')} error={errors.url} disabled={locked} />
          <div className="text-sm">
            <p className="font-medium text-slate-700">Or upload a file</p>
            {form.filePath ? (
              <p className="mt-1 flex items-center gap-2 text-slate-600">
                <i className="bi bi-paperclip" /> {form.fileName}
                {!locked && (
                  <button type="button" className="text-red-600 hover:underline" onClick={() => setForm({ ...form, filePath: '', fileName: '' })}>
                    Remove
                  </button>
                )}
              </p>
            ) : (
              <input type="file" disabled={locked || uploading} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} className="mt-1 block text-sm file:mr-3 file:rounded file:border-0 file:bg-rl-teal/15 file:px-3 file:py-1.5 file:font-semibold file:text-rl-teal-dark" />
            )}
            {uploading && <p className="mt-1 text-slate-500">Uploading…</p>}
            {errors.file && <p className="mt-1 text-xs text-red-600">{errors.file}</p>}
          </div>
        </Card>

        <div className="space-y-4">
          {/* S1-17-T03 tagging controls */}
          <Card className="space-y-4">
            <h2 className="font-semibold">Tags</h2>
            <Select label="Subject" options={subjects} placeholder="Choose" value={form.subject} onChange={set('subject')} error={errors.subject} disabled={locked} />
            <Select label="Level" options={levels} placeholder="Choose" value={form.level} onChange={set('level')} error={errors.level} disabled={locked} />
            <Select label="Format" options={media} placeholder="Choose" value={form.medium} onChange={set('medium')} error={errors.medium} disabled={locked} />
            <Checkboxes label="Good for (optional)" options={goals} value={form.goals} onChange={(v) => setForm({ ...form, goals: v })} />
          </Card>
          {state.error && <Alert kind="error">{state.error}</Alert>}
          {state.ok && <Alert kind="success">{state.ok}</Alert>}
          {!locked && (
            <div className="flex flex-col gap-2">
              <Button onClick={() => save(true)} busy={state.busy === 'submit'} disabled={uploading}>
                {status === 'pending' ? 'Save changes' : 'Submit for review'}
              </Button>
              {status !== 'pending' && status !== 'published' && (
                <Button variant="secondary" onClick={() => save(false)} busy={state.busy === 'draft'} disabled={uploading}>
                  Save draft
                </Button>
              )}
            </div>
          )}
          <Link to="/my-submissions" className="block text-center text-sm font-medium text-rl-teal-dark hover:underline">
            Back to my submissions
          </Link>
        </div>
      </form>
    </Page>
  )
}
