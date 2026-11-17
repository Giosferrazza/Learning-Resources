import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import AddToList from '../components/AddToList'
import FavoriteButton from '../components/FavoriteButton'
import FilterBar from '../components/FilterBar'
import { useFilters } from '../lib/useFilters'
import ResourceCard from '../components/ResourceCard'
import { Button, Empty, ErrorState, Loading, Page } from '../components/ui'
import type { Resource } from '../lib/types'
import { useApi } from '../lib/useApi'
import { useSearchParams } from 'react-router-dom'

// S1-12 / S2-06 Search and filter the published library. Keyword and filters live in the URL
// (S2-03-T03), results come back best match first (S2-06-T02-S3). S2-06-T03 loading, empty, error.
export default function LibraryPage() {
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const { filters, setFilters, clearFilters, active } = useFilters()
  const [search, setSearch] = useState(params.get('q') ?? '')
  const q = params.get('q') ?? ''

  // Debounce typing into the URL
  useEffect(() => {
    const t = setTimeout(() => {
      if (search.trim() === q) return
      setParams(
        (p) => {
          const out = new URLSearchParams(p)
          if (search.trim()) out.set('q', search.trim())
          else out.delete('q')
          return out
        },
        { replace: true },
      )
    }, 250)
    return () => clearTimeout(t)
  }, [search, q, setParams])

  const query = new URLSearchParams(Object.entries({ ...filters, q }).filter(([, v]) => v)).toString()
  const { data, error, loading, refreshing, reload } = useApi<{ resources: Resource[] }>(`/library${query ? `?${query}` : ''}`)
  const filtered = Boolean(query)
  const clearAll = () => {
    setSearch('')
    setParams(new URLSearchParams(), { replace: true })
  }

  return (
    <Page title="Content library" subtitle="Search every published, educator-approved resource.">
      <FilterBar filters={filters} onChange={setFilters} onClear={clearFilters}>
        <label className="block text-sm font-medium text-slate-700">
          Search
          <span className="relative mt-1 block">
            <i className="bi bi-search pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title or description"
              className="block w-full rounded-md border border-slate-300 py-2 pr-3 pl-9 text-sm focus:border-rl-teal focus:ring-2 focus:ring-rl-teal/30 focus:outline-none"
            />
          </span>
        </label>
      </FilterBar>
      {loading && <Loading label="Searching…" />}
      {error && <ErrorState error={error} retry={reload} />}
      {data && data.resources.length === 0 && (
        <Empty icon="search" title={filtered ? 'No resources match your search' : 'The library is empty'}>
          {filtered ? (
            <>
              <p>Try a different keyword or remove a filter.</p>
              <Button variant="secondary" className="mt-3" onClick={clearAll}>
                Clear search and filters
              </Button>
            </>
          ) : (
            'Nothing has been published yet.'
          )}
        </Empty>
      )}
      {data && data.resources.length > 0 && (
        <>
          <p className="mb-3 text-sm text-slate-500" role="status">
            {data.resources.length} resource{data.resources.length === 1 ? '' : 's'}
            {q && ` for “${q}”`}
            {active > 0 && ` · ${active} filter${active === 1 ? '' : 's'}`}
            {refreshing && ' · updating…'}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {data.resources.map((r) => (
              <ResourceCard
                key={r.id}
                {...r}
                actions={
                  profile?.role !== 'educator' && (
                    <>
                      <AddToList resourceId={r.id} />
                      <FavoriteButton resourceId={r.id} />
                    </>
                  )
                }
              />
            ))}
          </div>
        </>
      )}
    </Page>
  )
}
