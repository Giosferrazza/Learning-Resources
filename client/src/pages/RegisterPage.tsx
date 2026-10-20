import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, Field, Select } from '../components/ui'
import { supabase } from '../lib/supabase'

const roleOptions = { student: 'Student', professor: 'Professor', educator: 'Educator (I add learning resources)' }

// S1-01 Create an account. The sign-up trigger creates the profile with the chosen role.
export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', role: 'student', password: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [checkEmail, setCheckEmail] = useState(false)
  const [busy, setBusy] = useState(false)
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm({ ...form, [key]: e.target.value })
    if (errors[key]) setErrors({ ...errors, [key]: '' })
  }

  // S1-01-T01 validation
  function validate() {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Enter your name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email address.'
    if (form.password.length < 8) next.password = 'Use at least 8 characters.'
    if (form.confirm !== form.password) next.confirm = 'Passwords don’t match.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: { display_name: form.name.trim(), role: form.role }, emailRedirectTo: `${window.location.origin}/login` },
    })
    setBusy(false)
    // S1-01-T03 feedback
    if (error) {
      setError((error as { code?: string }).code === 'user_already_exists' ? 'An account with that email already exists. Sign in instead.' : error.message)
      return
    }
    // With email confirmation on there is no session yet; otherwise GuestOnly redirects home.
    if (!data.session) setCheckEmail(true)
  }

  if (checkEmail) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <Card className="p-8 text-center">
          <i className="bi bi-envelope-check text-4xl text-rl-teal" />
          <h1 className="mt-3 text-2xl font-bold">Check your email</h1>
          <p className="mt-2 text-slate-600">We sent a confirmation link to {form.email}. Open it to finish creating your account.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card className="p-8">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-slate-600">Get recommendations matched to your goals.</p>
        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <Field label="Full name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
          <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
          <Select label="I am a" options={roleOptions} value={form.role} onChange={set('role')} />
          <Field label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} hint="At least 8 characters." />
          <Field label="Confirm password" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
          <Button type="submit" busy={busy} className="w-full">
            Create account
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-rl-teal-dark hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  )
}
