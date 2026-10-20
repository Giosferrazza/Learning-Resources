import { Link } from 'react-router-dom'
import { Card, Loading, Page } from '../../components/ui'
import { useApi } from '../../lib/useApi'

type Monitoring = { current: { ok: boolean; responseMs: number }; last24h: { uptimePercent: number | null } }

const sections = [
  { to: '/admin/submissions', icon: 'patch-check', label: 'Review submissions', body: 'Approve or reject educator uploads' },
  { to: '/admin/reports', icon: 'flag', label: 'Flagged content', body: 'Resolve reports from students' },
  { to: '/admin/users', icon: 'people', label: 'Users and roles', body: 'Change roles, suspend accounts' },
  { to: '/admin/resources', icon: 'collection', label: 'Resource collection', body: 'Unpublish, restore or delete' },
  { to: '/admin/monitoring', icon: 'activity', label: 'Uptime and alerts', body: 'Health checks and outage alerts' },
  { to: '/admin/analytics', icon: 'graph-up', label: 'Usage analytics', body: 'Sign-ups and activity' },
  { to: '/admin/errors', icon: 'bug', label: 'Error logs', body: 'Recent application errors' },
]

// Admin dashboard: what needs attention, then every admin tool
export default function AdminPage() {
  const submissions = useApi<{ submissions: unknown[] }>('/admin/submissions')
  const reports = useApi<{ reports: unknown[] }>('/admin/reports')
  const monitoring = useApi<Monitoring>('/admin/monitoring')

  const stat = (label: string, value: string | number | undefined, to: string, warn?: boolean) => (
    <Link to={to} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-rl-teal">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${warn ? 'text-amber-600' : ''}`}>{value ?? '…'}</p>
    </Link>
  )

  if (submissions.loading && reports.loading) return <Loading />
  const health = monitoring.data
  return (
    <Page title="Admin dashboard">
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {stat('Waiting for review', submissions.data?.submissions.length, '/admin/submissions', Boolean(submissions.data?.submissions.length))}
        {stat('Open reports', reports.data?.reports.length, '/admin/reports', Boolean(reports.data?.reports.length))}
        {stat('System', health ? (health.current.ok ? `Up · ${health.current.responseMs} ms` : 'Down') : undefined, '/admin/monitoring', health ? !health.current.ok : false)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.to} to={s.to}>
            <Card className="h-full transition hover:-translate-y-0.5 hover:border-rl-teal">
              <i className={`bi bi-${s.icon} text-2xl text-rl-teal-dark`} />
              <p className="mt-2 font-semibold">{s.label}</p>
              <p className="text-sm text-slate-500">{s.body}</p>
            </Card>
          </Link>
        ))}
      </div>
    </Page>
  )
}
