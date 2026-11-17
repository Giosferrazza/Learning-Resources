import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Card, Empty, ErrorState, LinkButton, Loading, Page, TableWrap, Tags, WithSideNav } from '../../components/ui'
import { useApi } from '../../lib/useApi'
import InsightsNav from './InsightsNav'
import { Stat } from './PreferencesReportPage'

type Row = { id: string; title: string; subject: string | null; medium: string | null; mine: boolean; views: number; opens: number; people: number }
type Sort = 'views' | 'opens' | 'people' | 'title'
const periods = [7, 30, 90] as const

function PeriodPicker({ period, onChange }: { period: number; onChange: (p: number) => void }) {
  return (
    <div className="flex gap-1" role="group" aria-label="Period">
      {periods.map((p) => (
        <button key={p} type="button" aria-pressed={period === p} onClick={() => onChange(p)} className={`rounded-full border px-3 py-1 text-sm ${period === p ? 'border-rl-teal bg-rl-teal/15 text-rl-teal-dark' : 'border-slate-300 bg-white text-slate-600'}`}>
          {p} days
        </button>
      ))}
    </div>
  )
}

// S2-12-T01 / S2-12-T03 Which resources get attention: views, link opens and people, sortable
export default function EngagementPage() {
  const [params, setParams] = useSearchParams()
  const period = Number(params.get('period')) || 30
  const sort = (params.get('sort') as Sort) || 'views'
  const mine = params.get('mine') === '1'
  const set = (key: string, value: string | null) =>
    setParams(
      (p) => {
        const out = new URLSearchParams(p)
        if (value) out.set(key, value)
        else out.delete(key)
        return out
      },
      { replace: true },
    )
  const { data, error, loading, refreshing, reload } = useApi<{ period: number; totals: { views: number; opens: number }; resources: Row[] }>(`/insights/engagement?period=${period}&sort=${sort}${mine ? '&mine=1' : ''}`)

  const header = (key: Sort, label: string, right = true) => (
    <th className={`py-2 font-semibold ${right ? 'pl-3 text-right' : 'pr-3'}`} aria-sort={sort === key ? (key === 'title' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => set('sort', key)} className={`uppercase hover:text-rl-teal-dark ${sort === key ? 'text-rl-teal-dark' : ''}`}>
        {label} {sort === key && <i className={`bi bi-caret-${key === 'title' ? 'up' : 'down'}-fill`} aria-hidden />}
      </button>
    </th>
  )

  return (
    <WithSideNav nav={<InsightsNav />}>
      <Page title="Engagement" subtitle="Views of each resource’s page and opens of its link or file. Repeat visits by the same person within 30 minutes count once.">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <PeriodPicker period={period} onChange={(p) => set('period', String(p))} />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={mine} onChange={(e) => set('mine', e.target.checked ? '1' : null)} className="size-4 accent-rl-teal" />
            Only my resources
          </label>
        </div>
        {loading && <Loading />}
        {error && <ErrorState error={error} retry={reload} />}
        {data && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Stat label={`Views, last ${data.period} days`} value={data.totals.views} />
              <Stat label={`Opens, last ${data.period} days`} value={data.totals.opens} />
            </div>
            {!data.resources.length ? (
              <Empty icon="graph-up" title={mine ? 'You have no published resources yet' : 'No published resources yet'} />
            ) : (
              <Card>
                <TableWrap>
                  <table className="w-full min-w-[34rem] text-left text-sm">
                    <thead className="text-xs text-slate-500">
                      <tr>
                        {header('title', 'Resource', false)}
                        {header('views', 'Views')}
                        {header('opens', 'Opens')}
                        {header('people', 'People')}
                      </tr>
                    </thead>
                    <tbody className={`divide-y divide-slate-100 ${refreshing ? 'opacity-60' : ''}`}>
                      {data.resources.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2 pr-3">
                            <Link to={`/insights/engagement/${r.id}?period=${period}`} className="font-medium hover:text-rl-teal-dark hover:underline">
                              {r.title}
                            </Link>
                            <div className="mt-1">
                              <Tags subject={r.subject} medium={r.medium} />
                            </div>
                          </td>
                          <td className="py-2 pl-3 text-right tabular-nums">{r.views}</td>
                          <td className="py-2 pl-3 text-right tabular-nums">{r.opens}</td>
                          <td className="py-2 pl-3 text-right tabular-nums">{r.people}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              </Card>
            )}
          </div>
        )}
      </Page>
    </WithSideNav>
  )
}

type Detail = { resource: { id: string; title: string; subject: string | null; medium: string | null }; period: number; totals: { views: number; opens: number; people: number }; daily: { day: string; views: number; opens: number }[] }

// S2-12-T03 Per-resource detail: daily views and opens
export function EngagementDetailPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const [period, setPeriod] = useState(Number(params.get('period')) || 30)
  const { data, error, loading, reload } = useApi<Detail>(`/insights/engagement/${id}?period=${period}`)
  const max = Math.max(1, ...(data?.daily.map((d) => d.views + d.opens) ?? [1]))
  const crumbs = [{ label: 'Engagement', to: `/insights/engagement?period=${period}` }, { label: data?.resource.title ?? 'Resource' }]

  return (
    <WithSideNav nav={<InsightsNav />}>
      <Page title={data?.resource.title ?? 'Resource engagement'} breadcrumbs={crumbs} actions={data && <LinkButton to={`/resource/${data.resource.id}`} variant="secondary">Open resource page</LinkButton>}>
        <div className="mb-4">
          <PeriodPicker period={period} onChange={setPeriod} />
        </div>
        {loading && <Loading />}
        {error && <ErrorState error={error} retry={reload} />}
        {data && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label="Views" value={data.totals.views} />
              <Stat label="Opens" value={data.totals.opens} />
              <Stat label="People" value={data.totals.people} />
            </div>
            <Card>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">Daily activity</h2>
                <span className="flex gap-3 text-xs text-slate-600">
                  <span><span className="mr-1 inline-block size-2.5 rounded-sm bg-rl-teal" aria-hidden />Views</span>
                  <span><span className="mr-1 inline-block size-2.5 rounded-sm bg-rl-gold" aria-hidden />Opens</span>
                </span>
              </div>
              {data.totals.views + data.totals.opens === 0 ? (
                <p className="text-sm text-slate-500">No activity in this period.</p>
              ) : (
                <div className="flex h-40 items-end gap-px" role="img" aria-label={`Daily views and opens over ${data.period} days`}>
                  {data.daily.map((d) => (
                    <div key={d.day} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${d.day}: ${d.views} views, ${d.opens} opens`}>
                      <div className="bg-rl-gold" style={{ height: `${(d.opens / max) * 100}%` }} />
                      <div className="bg-rl-teal" style={{ height: `${(d.views / max) * 100}%` }} />
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-1 flex justify-between text-xs text-slate-500">
                <span>{data.daily[0]?.day}</span>
                <span>{data.daily.at(-1)?.day}</span>
              </div>
            </Card>
          </div>
        )}
      </Page>
    </WithSideNav>
  )
}
