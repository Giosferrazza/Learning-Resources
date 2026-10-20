import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Alert, Button, Card, Field, Page } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { roleLabel } from '../lib/roles'
import { supabase } from '../lib/supabase'

// S1-04 Update profile information. Reached from the account menu.
export default function AccountPage() {
  const { profile, refreshProfile } = useAuth()
  const [name, setName] = useState(profile?.display_name ?? '')
  const [email, setEmail] = useState(profile?.email ?? '')
  const [nameState, setNameState] = useState<{ busy?: boolean; ok?: string; error?: string }>({})
  const [emailState, setEmailState] = useState<{ busy?: boolean; ok?: string; error?: string }>({})
  if (!profile) return null

  // S1-04-T03 saving / saved / error, then reload from the server
  async function saveName(e: FormEvent) {
    e.preventDefault()
    setNameState({ busy: true })
    try {
      await api('/profile', { method: 'PATCH', body: { displayName: name } })
      await refreshProfile()
      setNameState({ ok: 'Saved.' })
    } catch (err) {
      setNameState({ error: errorMessage(err) })
    }
  }

  async function saveEmail(e: FormEvent) {
    e.preventDefault()
    if (email.trim() === profile!.email) return setEmailState({ error: 'That’s already your email.' })
    setEmailState({ busy: true })
    const { error } = await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: `${window.location.origin}/account` })
    setEmailState(error ? { error: error.message } : { ok: `Check ${profile!.email} and ${email.trim()} for confirmation links. Your email changes once both are confirmed.` })
  }

  return (
    <Page title="Profile & settings" narrow>
      <div className="space-y-6">
        <Card>
          <form onSubmit={saveName} className="space-y-4">
            <h2 className="font-semibold">Profile</h2>
            <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
            <p className="text-sm text-slate-600">Account type: {roleLabel[profile.role]}</p>
            {nameState.error && <Alert kind="error">{nameState.error}</Alert>}
            {nameState.ok && <Alert kind="success">{nameState.ok}</Alert>}
            <Button type="submit" busy={nameState.busy} disabled={name.trim() === profile.display_name}>
              Save name
            </Button>
          </form>
        </Card>

        <Card>
          <form onSubmit={saveEmail} className="space-y-4">
            <h2 className="font-semibold">Email</h2>
            <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            {emailState.error && <Alert kind="error">{emailState.error}</Alert>}
            {emailState.ok && <Alert kind="success">{emailState.ok}</Alert>}
            <Button type="submit" variant="secondary" busy={emailState.busy}>
              Change email
            </Button>
          </form>
        </Card>

        <Card className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">Password</h2>
            <p className="text-sm text-slate-600">Change the password you use to sign in.</p>
          </div>
          <Link to="/account/password" className="text-sm font-semibold whitespace-nowrap text-rl-teal-dark hover:underline">
            Change password
          </Link>
        </Card>
      </div>
    </Page>
  )
}
