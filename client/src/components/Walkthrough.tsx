import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { api } from '../lib/api'
import type { Role } from '../lib/types'
import { Button } from './ui'

const steps: Record<Role, { icon: string; title: string; body: string }[]> = {
  student: [
    { icon: 'ui-checks', title: 'Answer a short questionnaire', body: 'Pick a subject, your level, the formats you like and your goal. It takes about a minute.' },
    { icon: 'stars', title: 'Get matched resources', body: 'Each recommendation says why it was picked. If nothing fits exactly, we show the closest matches.' },
    { icon: 'heart-fill', title: 'Save what helps', body: 'Heart resources or whole recommendation lists and find them later under Favorites.' },
  ],
  professor: [
    { icon: 'ui-checks', title: 'Plan with the questionnaire', body: 'Describe the topic and level you are teaching to get matched resources.' },
    { icon: 'grid', title: 'Browse the whole library', body: 'The Library shows every published resource, filterable by subject, level and format.' },
    { icon: 'share', title: 'Curate and share lists', body: 'Collect resources into lists and share a read-only link with your students.' },
  ],
  educator: [
    { icon: 'cloud-upload', title: 'Upload resources', body: 'Add a link or a file, tag its subject, level and format, then save a draft or submit it.' },
    { icon: 'patch-check', title: 'Admins review submissions', body: 'Approved resources become visible to students. You’ll be notified of the decision.' },
    { icon: 'bell', title: 'Stay on top of reports', body: 'If someone flags one of your resources, the bell lets you know.' },
  ],
  admin: [
    { icon: 'speedometer2', title: 'Your dashboard', body: 'See pending submissions, open reports and system health at a glance.' },
    { icon: 'people', title: 'Manage people', body: 'Change roles and suspend or reactivate accounts from Users.' },
    { icon: 'activity', title: 'Watch the system', body: 'Monitoring, analytics and error logs are under the dashboard.' },
  ],
}

// S1-06 First-login walkthrough: shown once per account, skippable (S1-06-T03).
export default function Walkthrough() {
  const { profile, refreshProfile } = useAuth()
  const location = useLocation()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)

  if (!profile || profile.walkthrough_completed_at || location.pathname.startsWith('/reset-password')) return null
  const list = steps[profile.role]
  const current = list[step]
  const last = step === list.length - 1

  async function finish() {
    setBusy(true)
    await api('/profile/walkthrough-complete', { method: 'POST' }).catch(() => {})
    await refreshProfile().catch(() => {})
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-rl-navy-deep/60 p-4" role="dialog" aria-modal="true" aria-labelledby="walkthrough-title">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <p className="text-xs font-semibold tracking-wide text-rl-teal-dark uppercase">
          Welcome{profile.display_name ? `, ${profile.display_name.split(' ')[0]}` : ''} · {step + 1} of {list.length}
        </p>
        <div className="mt-4 flex size-13 items-center justify-center rounded-[0.85rem] bg-rl-teal/15 text-2xl text-rl-teal-dark">
          <i className={`bi bi-${current.icon}`} />
        </div>
        <h2 id="walkthrough-title" className="mt-3 text-xl font-bold">
          {current.title}
        </h2>
        <p className="mt-2 text-slate-600">{current.body}</p>
        <div className="mt-6 flex items-center justify-between">
          <button type="button" onClick={finish} className="text-sm font-medium text-slate-500 hover:text-slate-800">
            Skip
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="secondary" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {last ? (
              <Button onClick={finish} busy={busy}>
                Get started
              </Button>
            ) : (
              <Button onClick={() => setStep(step + 1)}>Next</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
