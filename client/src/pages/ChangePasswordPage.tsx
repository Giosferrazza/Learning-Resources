import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, Field, Page } from '../components/ui'
import { api, errorMessage } from '../lib/api'

// S1-03 Change password (signed in). Forgotten passwords use /forgot-password instead.
export default function ChangePasswordPage() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [state, setState] = useState<{ busy?: boolean; ok?: boolean; error?: string }>({})
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value })

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (form.next.length < 8) return setState({ error: 'Your new password must be at least 8 characters.' })
    if (form.next !== form.confirm) return setState({ error: 'New passwords don’t match.' })
    setState({ busy: true })
    try {
      await api('/account/password', { method: 'POST', body: { currentPassword: form.current, newPassword: form.next } })
      setForm({ current: '', next: '', confirm: '' })
      setState({ ok: true })
    } catch (err) {
      setState({ error: errorMessage(err) })
    }
  }

  return (
    <Page title="Change password" narrow>
      <Card>
        <form onSubmit={submit} className="space-y-4">
          {state.ok && <Alert kind="success">Password changed. You’ve been signed out on your other devices.</Alert>}
          {state.error && <Alert kind="error">{state.error}</Alert>}
          <Field label="Current password" type="password" autoComplete="current-password" required value={form.current} onChange={set('current')} />
          <Field label="New password" type="password" autoComplete="new-password" required value={form.next} onChange={set('next')} hint="At least 8 characters." />
          <Field label="Confirm new password" type="password" autoComplete="new-password" required value={form.confirm} onChange={set('confirm')} />
          <Button type="submit" busy={state.busy} className="w-full">
            Change password
          </Button>
          <p className="text-center text-sm text-slate-600">
            Forgot your current password?{' '}
            <Link to="/forgot-password" className="font-semibold text-rl-teal-dark hover:underline">
              Reset it by email
            </Link>
          </p>
        </form>
      </Card>
    </Page>
  )
}
