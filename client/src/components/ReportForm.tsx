import { useState, type FormEvent } from 'react'
import { api, ApiError, errorMessage } from '../lib/api'
import { Alert, Button, Select, TextArea } from './ui'

const reasons = { broken_link: 'Broken link or file', inaccurate: 'Inaccurate or outdated', inappropriate: 'Inappropriate content', other: 'Something else' }

// S1-10 Report a broken link or resource. Collapsed until someone needs it.
export default function ReportForm({ resourceId }: { resourceId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [state, setState] = useState<{ busy?: boolean; done?: string; error?: string }>({})

  // S1-10-T03 confirmation and errors
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!reason) return setState({ error: 'Choose what’s wrong.' })
    if (reason === 'other' && !details.trim()) return setState({ error: 'Tell us what’s wrong.' })
    setState({ busy: true })
    try {
      await api(`/resources/${resourceId}/reports`, { method: 'POST', body: { reason, details } })
      setState({ done: 'Thanks. An admin will review your report.' })
    } catch (err) {
      setState(err instanceof ApiError && err.code === 'already_reported' ? { done: err.message } : { error: errorMessage(err) })
    }
  }

  if (state.done) return <Alert kind="success">{state.done}</Alert>
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium text-slate-500 hover:text-red-600">
        <i className="bi bi-flag mr-1" />
        Report a problem
      </button>
    )
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <h2 className="font-semibold">Report a problem</h2>
      <Select label="What’s wrong?" options={reasons} placeholder="Choose one" value={reason} onChange={(e) => setReason(e.target.value)} />
      <TextArea label={reason === 'other' ? 'Details' : 'Details (optional)'} rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} />
      {state.error && <Alert kind="error">{state.error}</Alert>}
      <div className="flex gap-2">
        <Button type="submit" variant="danger" busy={state.busy}>
          Send report
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
