import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Alert, Button, Card, Field } from '../components/ui'
import { supabase } from '../lib/supabase'

// S1-02 Sign in. Signing out lives in the account menu.
export default function LoginPage() {
  const { notice, clearNotice } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const message = params.get('message')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    clearNotice()
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) {
      // S1-02-T03 login errors
      const code = (error as { code?: string }).code
      if (code === 'user_banned') setError('This account has been suspended. Contact an administrator.')
      else if (code === 'invalid_credentials') setError('That email and password don’t match. Try again or reset your password.')
      else if (code === 'email_not_confirmed') setError('Confirm your email first. Check your inbox for the link.')
      else setError(error.message)
      return
    }
    // GuestOnly sends them to their home page; honor ?next= for deep links
    const next = params.get('next')
    if (next?.startsWith('/')) navigate(next, { replace: true })
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card className="p-8">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-1 text-sm text-slate-600">Welcome back to Resource Learning.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {message === 'password-updated' && <Alert kind="success">Your password was updated. Sign in with your new password.</Alert>}
          {notice && <Alert kind="info">{notice}</Alert>}
          {error && <Alert kind="error">{error}</Alert>}
          <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <div>
            <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <Link to="/forgot-password" className="mt-2 inline-block text-sm font-medium text-rl-teal-dark hover:underline">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" busy={busy} className="w-full">
            Sign in
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          New here?{' '}
          <Link to="/register" className="font-semibold text-rl-teal-dark hover:underline">
            Create an account
          </Link>
        </p>
      </Card>
    </div>
  )
}
