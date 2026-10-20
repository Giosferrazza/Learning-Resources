import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Field, Loading } from '../components/ui'
import { supabase } from '../lib/supabase'

// S1-05 New-password screen. Only reachable from the emailed link, which signs the
// person in with a short-lived recovery session.
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [ready, setReady] = useState<'checking' | 'ok' | 'invalid'>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const linkError = new URLSearchParams(window.location.hash.slice(1)).get('error_description')
    if (linkError) {
      setReady('invalid')
      return
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady('ok')
    })
    // The link is processed on load; give it a moment before calling it invalid
    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getSession()
      setReady(data.session ? 'ok' : 'invalid')
    }, 1500)
    return () => {
      sub.subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError('Passwords don’t match.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      // S1-05-T03
      setError((error as { code?: string }).code === 'same_password' ? 'Choose a password you haven’t used for this account.' : error.message)
      return
    }
    await supabase.auth.signOut()
    navigate('/login?message=password-updated', { replace: true })
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card className="p-8">
        <h1 className="text-2xl font-bold">Choose a new password</h1>
        {ready === 'checking' && <Loading label="Checking your link…" />}
        {ready === 'invalid' && (
          <div className="mt-4 space-y-4">
            <Alert kind="error">This reset link is invalid or has expired.</Alert>
            <Link to="/forgot-password" className="inline-block text-sm font-semibold text-rl-teal-dark hover:underline">
              Request a new link
            </Link>
          </div>
        )}
        {ready === 'ok' && (
          <form onSubmit={submit} className="mt-4 space-y-4">
            {error && <Alert kind="error">{error}</Alert>}
            <Field label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 8 characters." />
            <Field label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <Button type="submit" busy={busy} className="w-full">
              Update password
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}
