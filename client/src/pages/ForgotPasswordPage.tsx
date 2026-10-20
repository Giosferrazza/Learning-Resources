import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, Field } from '../components/ui'
import { supabase } from '../lib/supabase'

// S1-05 Request a password reset. Reached from "Forgot password?" on the sign-in page.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` })
    setBusy(false)
    // S1-05-T03: the same message whether or not the account exists; only rate limits show
    if (error && error.status === 429) setError('Too many reset requests. Wait a few minutes and try again.')
    else setSent(true)
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card className="p-8">
        <h1 className="text-2xl font-bold">Reset your password</h1>
        {sent ? (
          <div className="mt-4 space-y-4">
            <Alert kind="success">If an account exists for {email}, we’ve emailed a link to reset the password. It expires in an hour.</Alert>
            <Link to="/login" className="inline-block text-sm font-semibold text-rl-teal-dark hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            <p className="text-sm text-slate-600">Enter the email you signed up with and we’ll send you a reset link.</p>
            {error && <Alert kind="error">{error}</Alert>}
            <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" busy={busy} className="w-full">
              Send reset link
            </Button>
            <Link to="/login" className="block text-center text-sm font-medium text-rl-teal-dark hover:underline">
              Back to sign in
            </Link>
          </form>
        )}
      </Card>
    </div>
  )
}
