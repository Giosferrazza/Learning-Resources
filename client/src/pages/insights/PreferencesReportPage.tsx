import { Link } from 'react-router-dom'
import { media, subjects } from '../../../../shared/vocabulary'
import { Card, Empty, ErrorState, Loading, Page, TableWrap, Tags, WithSideNav } from '../../components/ui'
import { useApi } from '../../lib/useApi'
import InsightsNav from './InsightsNav'

type Report = {
  favorites: { total: number; topResources: { id: string; title: string; subject: string | null; medium: string | null; favorites: number }[]; bySubject: Record<string, number>; byMedium: Record<string, number> }
  preferredMedia: { questionnaires: number; counts: Record<string, number>; noPreference: number }
}

// One labelled bar per row; the number is always printed, the bar is just a guide
function Bars({ rows, total, unit }: { rows: { label: string; value: number }[]; total: number; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[9rem_1fr_auto]">
          <span className="truncate text-slate-700">{r.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
            <span className="block h-full rounded-full bg-rl-teal" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="w-20 text-right text-slate-600 tabular-nums">
            {r.value} {total > 0 && <span className="text-xs text-slate-400">({Math.round((r.value / total) * 100)}%)</span>}
          </span>
        </li>
      ))}
      <li className="sr-only">Counts are {unit}.</li>
    </ul>
  )
}

// S2-11-T01 What formats students ask for and what they save. Anonymous totals only.
export default function PreferencesReportPage() {
  const { data, error, loading, reload } = useApi<Report>('/insights/preferences')
  const sorted = (rec: Record<string, number>, labels: Record<string, string>) => Object.entries(rec).map(([k, value]) => ({ label: labels[k] ?? k, value })).sort((a, b) => b.value - a.value)

  return (
    <WithSideNav nav={<InsightsNav />}>
      <Page title="Preferences and favorites" subtitle="Anonymous totals across all students and professors. No names or accounts are shown.">
        {loading && <Loading />}
        {error && <ErrorState error={error} retry={reload} />}
        {data && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label="Favorites saved" value={data.favorites.total} />
              <Stat label="Questionnaires" value={data.preferredMedia.questionnaires} />
              <Stat label="No format preference" value={data.preferredMedia.noPreference} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <h2 className="mb-3 font-semibold">Preferred formats in questionnaires</h2>
                {data.preferredMedia.questionnaires === 0 ? <p className="text-sm text-slate-500">No questionnaires yet.</p> : <Bars rows={[...sorted(data.preferredMedia.counts, media), { label: 'Any format', value: data.preferredMedia.noPreference }]} total={data.preferredMedia.questionnaires} unit="questionnaires; a questionnaire can pick several formats" />}
              </Card>
              <Card>
                <h2 className="mb-3 font-semibold">Favorites by format</h2>
                {data.favorites.total === 0 ? <p className="text-sm text-slate-500">No favorites yet.</p> : <Bars rows={sorted(data.favorites.byMedium, media)} total={data.favorites.total} unit="favorites" />}
              </Card>
              <Card className="lg:col-span-2">
                <h2 className="mb-3 font-semibold">Favorites by subject</h2>
                {data.favorites.total === 0 ? <p className="text-sm text-slate-500">No favorites yet.</p> : <Bars rows={sorted(data.favorites.bySubject, subjects)} total={data.favorites.total} unit="favorites" />}
              </Card>
            </div>
            <Card>
              <h2 className="mb-3 font-semibold">Most-saved resources</h2>
              {!data.favorites.topResources.length ? (
                <Empty icon="heart" title="No resources have been saved yet" />
              ) : (
                <TableWrap>
                  <table className="w-full min-w-[30rem] text-left text-sm">
                    <thead className="text-xs text-slate-500 uppercase">
                      <tr>
                        <th className="py-2 pr-3 font-semibold">Resource</th>
                        <th className="py-2 pr-3 font-semibold">Tags</th>
                        <th className="py-2 text-right font-semibold">Favorites</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.favorites.topResources.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2 pr-3">
                            <Link to={`/resource/${r.id}`} state={{ from: { label: 'Reports', to: '/insights' } }} className="font-medium hover:text-rl-teal-dark hover:underline">
                              {r.title}
                            </Link>
                          </td>
                          <td className="py-2 pr-3">
                            <Tags subject={r.subject} medium={r.medium} />
                          </td>
                          <td className="py-2 text-right tabular-nums">{r.favorites}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              )}
            </Card>
          </div>
        )}
      </Page>
    </WithSideNav>
  )
}

export function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </Card>
  )
}
