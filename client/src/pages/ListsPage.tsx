import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Empty, Loading, LoadError, Page, Pill, formatDate } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import type { ListSummary } from '../lib/types'
import { useApi } from '../lib/useApi'

// S1-13 My lists
export default function ListsPage() {
  const navigate = useNavigate()
  const { data, error, loading, reload } = useApi<{ lists: ListSummary[] }>('/lists')
  const [name, setName] = useState('')
  const [state, setState] = useState<{ busy?: boolean; error?: string }>({})

  async function create(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setState({ error: 'Give the list a name.' })
    setState({ busy: true })
    try {
      const { list } = await api<{ list: ListSummary }>('/lists', { method: 'POST', body: { name } })
      navigate(`/lists/${list.id}`)
    } catch (err) {
      setState({ error: errorMessage(err) })
    }
  }

  return (
    <Page title="My lists" subtitle="Group resources together, and share lists with students.">
      <Card className="mb-6">
        <form onSubmit={create} className="flex flex-wrap items-end gap-3">
          <label className="min-w-56 flex-1 text-sm font-medium text-slate-700">
            New list
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="e.g. Week 3: Hypothesis testing" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <Button type="submit" busy={state.busy}>
            Create list
          </Button>
        </form>
        {state.error && (
          <div className="mt-3">
            <Alert kind="error">{state.error}</Alert>
          </div>
        )}
      </Card>
      {loading && <Loading />}
      {error && <LoadError error={error} retry={reload} />}
      {data && !data.lists.length && <Empty icon="collection" title="No lists yet">Create one above, or save a set of recommendations.</Empty>}
      <div className="grid gap-3 md:grid-cols-2">
        {data?.lists.map((l) => (
          <Link key={l.id} to={`/lists/${l.id}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-rl-teal">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-semibold">{l.name}</span>
              {l.share_token && <Pill>Shared</Pill>}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {l.itemCount} resource{l.itemCount === 1 ? '' : 's'} · updated {formatDate(l.updated_at)}
            </p>
          </Link>
        ))}
      </div>
    </Page>
  )
}
