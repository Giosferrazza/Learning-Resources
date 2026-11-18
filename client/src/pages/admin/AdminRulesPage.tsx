import { useState } from 'react'
import { Alert, Button, Card, ConfirmButton, ErrorState, Loading, Page, TableWrap, formatDateTime } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { useApi } from '../../lib/useApi'

type Weights = { subject: number; level: number; medium: number; goal: number }
type Rules = { weights: Weights; requireSubject: boolean }
type HistoryRow = { id: number; weights: Weights; require_subject: boolean; action: 'update' | 'reset'; note: string; created_at: string; editor: { display_name: string; email: string } | null }
type Data = { rules: Rules; defaults: Rules; maxWeight: number; isDefault: boolean; updatedAt: string | null; history: HistoryRow[] }

const labels: Record<keyof Weights, { label: string; hint: string }> = {
  subject: { label: 'Subject', hint: 'Points when the subject matches. Only counts when other subjects are allowed.' },
  level: { label: 'Level', hint: 'Points for the same level; one level away earns half.' },
  medium: { label: 'Format', hint: 'Points when the format is one the student picked (or they picked none).' },
  goal: { label: 'Goal', hint: 'Points when the resource serves the student’s goal.' },
}
const keys = Object.keys(labels) as (keyof Weights)[]

// S2-13 Admin recommendation rules: view, edit, validate, save, reset, history
export default function AdminRulesPage() {
  const { data, error, loading, reload } = useApi<Data>('/admin/recommendation-rules')
  const [state, setState] = useState<{ busy?: boolean; ok?: string; error?: string }>({})
  if (loading) return <Loading />
  if (error || !data) return <Page title="Recommendation rules">{error && <ErrorState error={error} retry={reload} />}</Page>
  // A fresh form whenever saved rules change
  return <RulesForm key={`${data.updatedAt}-${data.history[0]?.id ?? 0}`} data={data} reload={reload} state={state} setState={setState} />
}

function RulesForm({ data, reload, state, setState }: { data: Data; reload: () => void; state: { busy?: boolean; ok?: string; error?: string }; setState: (s: { busy?: boolean; ok?: string; error?: string }) => void }) {
  const [form, setForm] = useState({ weights: Object.fromEntries(keys.map((k) => [k, String(data.rules.weights[k])])) as Record<keyof Weights, string>, requireSubject: data.rules.requireSubject, note: '' })

  // S2-13-T03 Client-side validation mirrors the server's
  const invalid = keys.filter((k) => !/^\d+$/.test(form.weights[k]) || Number(form.weights[k]) > data.maxWeight)
  const total = keys.reduce((n, k) => n + (k === 'subject' && form.requireSubject ? 0 : Number(form.weights[k]) || 0), 0)
  const changed = keys.some((k) => Number(form.weights[k]) !== data.rules.weights[k]) || form.requireSubject !== data.rules.requireSubject

  async function save() {
    if (invalid.length || total === 0) return
    setState({ busy: true })
    try {
      await api('/admin/recommendation-rules', { method: 'PUT', body: { weights: Object.fromEntries(keys.map((k) => [k, Number(form.weights[k])])), requireSubject: form.requireSubject, note: form.note } })
      setState({ ok: 'Saved. New recommendations use these rules right away.' })
      reload()
    } catch (err) {
      setState({ error: errorMessage(err) })
    }
  }

  async function reset() {
    setState({ busy: true })
    try {
      await api('/admin/recommendation-rules/reset', { method: 'POST' })
      setState({ ok: 'Rules reset to the defaults.' })
      reload()
    } catch (err) {
      setState({ error: errorMessage(err) })
    }
  }

  return (
    <Page title="Recommendation rules" subtitle="How resources are scored. Changes apply right away." breadcrumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Recommendation rules' }]}>
      <div className="space-y-6">
        {state.ok && <Alert kind="success">{state.ok}</Alert>}
        {state.error && <Alert kind="error">{state.error}</Alert>}
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
            <span>{data.isDefault ? 'Using the default rules.' : `Last changed ${data.updatedAt ? formatDateTime(data.updatedAt) : ''}.`}</span>
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={form.requireSubject} onChange={(e) => setForm({ ...form, requireSubject: e.target.checked })} className="mt-1 size-4 accent-rl-teal" />
            <span>
              <span className="font-medium text-slate-700">Only recommend resources in the chosen subject</span>
              <span className="block text-slate-500">Recommended. When off, other subjects can appear below matching ones.</span>
            </span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            {keys.map((k) => (
              <label key={k} className={`block text-sm font-medium text-slate-700 ${k === 'subject' && form.requireSubject ? 'opacity-60' : ''}`}>
                {labels[k].label} weight
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={data.maxWeight}
                  step={1}
                  value={form.weights[k]}
                  onChange={(e) => setForm({ ...form, weights: { ...form.weights, [k]: e.target.value } })}
                  aria-invalid={invalid.includes(k)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <span className={`mt-1 block text-xs font-normal ${invalid.includes(k) ? 'text-red-600' : 'text-slate-500'}`}>
                  {invalid.includes(k) ? `Whole number from 0 to ${data.maxWeight}.` : `${labels[k].hint} Default ${data.defaults.weights[k]}.`}
                </span>
              </label>
            ))}
          </div>
          {total === 0 && !invalid.length && <Alert kind="error">At least one weight must be above zero, or every resource would tie.</Alert>}
          <label className="block text-sm font-medium text-slate-700">
            Note for the change history (optional)
            <input value={form.note} maxLength={300} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. Favor goal over level for exam season" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={save} busy={state.busy} disabled={!changed || invalid.length > 0 || total === 0}>
              Save rules
            </Button>
            <ConfirmButton variant="secondary" confirmLabel="Reset to defaults" onConfirm={reset}>
              Reset to defaults
            </ConfirmButton>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">Change history</h2>
          {!data.history.length ? (
            <p className="mt-2 text-sm text-slate-500">No changes yet.</p>
          ) : (
            <TableWrap>
              <table className="mt-3 w-full min-w-[34rem] text-left text-sm">
                <thead className="text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="py-2 pr-3 font-semibold">When</th>
                    <th className="py-2 pr-3 font-semibold">Who</th>
                    <th className="py-2 pr-3 font-semibold">Weights (S / L / F / G)</th>
                    <th className="py-2 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.history.map((h) => (
                    <tr key={h.id}>
                      <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(h.created_at)}</td>
                      <td className="py-2 pr-3">{h.editor?.display_name || h.editor?.email || 'Unknown'}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {keys.map((k) => h.weights[k]).join(' / ')}
                        {!h.require_subject && ' · any subject'}
                      </td>
                      <td className="py-2">{h.action === 'reset' ? 'Reset to defaults' : h.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>
      </div>
    </Page>
  )
}
