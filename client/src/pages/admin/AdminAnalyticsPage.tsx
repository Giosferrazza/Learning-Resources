import { Card, Loading, LoadError, Page } from '../../components/ui'
import { roleLabel } from '../../lib/roles'
import type { Role } from '../../lib/types'
import { useApi } from '../../lib/useApi'

type Analytics = {
  users: { total: number; byRole: Record<Role, number>; new7d: number; active7d: number }
  last30d: Record<string, number>
  daily: { day: string; signups: number; questionnaires: number; favorites: number }[]
}

const eventLabels: Record<string, string> = {
  questionnaire_submitted: 'Questionnaires completed',
  recommendations_viewed: 'Recommendation views',
  favorite_added: 'Favorites saved',
  list_created: 'Lists created',
  list_shared: 'Lists shared',
  feedback_submitted: 'Ratings and feedback',
  report_filed: 'Reports filed',
  resource_submitted: 'Resources submitted',
  resource_approved: 'Resources approved',
}

const series = [
  { key: 'signups', label: 'Sign-ups', color: 'bg-rl-navy' },
  { key: 'questionnaires', label: 'Questionnaires', color: 'bg-rl-teal' },
  { key: 'favorites', label: 'Favorites', color: 'bg-rl-gold' },
] as const

// S1-30-T03 Basic usage dashboard
export default function AdminAnalyticsPage() {
  const { data, error, loading, reload } = useApi<Analytics>('/admin/analytics')
  if (loading) return <Loading />
  if (error || !data) return <Page title="Usage analytics">{error && <LoadError error={error} retry={reload} />}</Page>

  const peak = Math.max(1, ...data.daily.flatMap((d) => series.map((s) => d[s.key])))
  const tiles = [
    { label: 'Total users', value: data.users.total },
    { label: 'New this week', value: data.users.new7d },
    { label: 'Active this week', value: data.users.active7d },
    { label: 'Questionnaires (30 d)', value: data.last30d.questionnaire_submitted ?? 0 },
  ]

  return (
    <Page title="Usage analytics" subtitle="Last 30 days unless noted.">
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <p className="text-sm text-slate-500">{t.label}</p>
            <p className="mt-1 text-3xl font-bold">{t.value}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Last 14 days</h2>
          <div className="flex gap-4 text-xs text-slate-600">
            {series.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5">
                <span className={`size-2.5 rounded-sm ${s.color}`} />
                {s.label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex h-40 items-end gap-2">
          {data.daily.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-32 w-full items-end justify-center gap-0.5">
                {series.map((s) => (
                  <div key={s.key} title={`${d.day}: ${d[s.key]} ${s.label.toLowerCase()}`} className={`w-1/4 rounded-t ${s.color}`} style={{ height: `${(d[s.key] / peak) * 100}%`, minHeight: d[s.key] ? 3 : 0 }} />
                ))}
              </div>
              <span className="text-[10px] text-slate-400">{d.day.slice(5)}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Activity</h2>
          <dl className="divide-y divide-slate-100 text-sm">
            {Object.entries(eventLabels).map(([key, label]) => (
              <div key={key} className="flex justify-between py-2">
                <dt className="text-slate-600">{label}</dt>
                <dd className="font-semibold tabular-nums">{data.last30d[key] ?? 0}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">People by role</h2>
          <dl className="divide-y divide-slate-100 text-sm">
            {(Object.keys(roleLabel) as Role[]).map((r) => (
              <div key={r} className="flex justify-between py-2">
                <dt className="text-slate-600">{roleLabel[r]}s</dt>
                <dd className="font-semibold tabular-nums">{data.users.byRole[r] ?? 0}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </Page>
  )
}
