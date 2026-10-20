import { useState } from 'react'
import { goals as goalLabels } from '../../../../shared/vocabulary'
import { Alert, Button, Card, Empty, Loading, LoadError, Page, Tags, TextArea, buttonClass, formatDateTime } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import type { Goal } from '../../../../shared/vocabulary'
import { useApi } from '../../lib/useApi'

type Submission = {
  id: string
  title: string
  description: string
  url: string | null
  file_path: string | null
  subject: string | null
  level: string | null
  medium: string | null
  goals: Goal[]
  submitted_at: string
  owner: { email: string; display_name: string } | null
}

// S1-26 Pending queue (oldest first), S1-25 approve or reject
export default function AdminSubmissionsPage() {
  const { data, setData, error, loading, refreshing, reload } = useApi<{ submissions: Submission[] }>('/admin/submissions')
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  function done(id: string, text: string) {
    setData({ submissions: data!.submissions.filter((s) => s.id !== id) })
    setMessage({ kind: 'success', text })
  }

  return (
    <Page
      title="Review submissions"
      subtitle="Oldest first. Approved resources are published right away."
      actions={
        <Button variant="secondary" onClick={reload} busy={refreshing}>
          <i className="bi bi-arrow-clockwise" /> Refresh
        </Button>
      }
    >
      {message && (
        <div className="mb-4">
          <Alert kind={message.kind}>{message.text}</Alert>
        </div>
      )}
      {/* S1-26-T03 refresh, empty and error states */}
      {loading && <Loading />}
      {error && <LoadError error={error} retry={reload} />}
      {data && !data.submissions.length && <Empty icon="patch-check" title="Nothing waiting for review" />}
      <div className="space-y-4">
        {data?.submissions.map((s) => (
          <Review key={s.id} submission={s} onDone={done} onError={(text) => setMessage({ kind: 'error', text })} />
        ))}
      </div>
    </Page>
  )
}

function Review({ submission: s, onDone, onError }: { submission: Submission; onDone: (id: string, text: string) => void; onError: (text: string) => void }) {
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [file, setFile] = useState<string | null>(null)

  async function decide(approve: boolean) {
    if (!approve && !note.trim()) return onError('Add a reason so the educator knows what to fix.')
    setBusy(approve ? 'approve' : 'reject')
    try {
      await api(`/admin/submissions/${s.id}/${approve ? 'approve' : 'reject'}`, { method: 'POST', body: approve ? {} : { note } })
      onDone(s.id, approve ? `Published “${s.title}”.` : `Sent “${s.title}” back to the educator.`)
    } catch (err) {
      onError(errorMessage(err))
      setBusy(null)
    }
  }

  async function openFile() {
    const { resource } = await api<{ resource: { file_url: string | null } }>(`/resources/${s.id}`)
    setFile(resource.file_url)
    if (resource.file_url) window.open(resource.file_url, '_blank', 'noreferrer')
  }

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{s.title}</h2>
        <p className="text-sm text-slate-500">
          From {s.owner?.display_name || s.owner?.email} · submitted {formatDateTime(s.submitted_at)}
        </p>
      </div>
      <Tags subject={s.subject} level={s.level} medium={s.medium} />
      {s.goals.length > 0 && <p className="text-sm text-slate-600">Good for: {s.goals.map((g) => goalLabels[g]).join(', ')}</p>}
      {s.description && <p className="text-sm whitespace-pre-line text-slate-700">{s.description}</p>}
      <div className="flex flex-wrap gap-2">
        {s.url && (
          <a href={s.url} target="_blank" rel="noreferrer" className={buttonClass('secondary')}>
            <i className="bi bi-box-arrow-up-right" /> Check link
          </a>
        )}
        {s.file_path && (
          <Button variant="secondary" onClick={openFile}>
            <i className="bi bi-paperclip" /> {file === null ? 'Open file' : 'Open file again'}
          </Button>
        )}
      </div>
      {rejecting ? (
        <div className="space-y-2 rounded-lg bg-slate-50 p-3">
          <TextArea label="Why isn’t it approved?" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. The link is behind a paywall" />
          <div className="flex gap-2">
            <Button variant="danger" busy={busy === 'reject'} onClick={() => decide(false)}>
              Reject
            </Button>
            <Button variant="ghost" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button busy={busy === 'approve'} onClick={() => decide(true)}>
            <i className="bi bi-check-lg" /> Approve and publish
          </Button>
          <Button variant="danger" onClick={() => setRejecting(true)}>
            Reject…
          </Button>
        </div>
      )}
    </Card>
  )
}
