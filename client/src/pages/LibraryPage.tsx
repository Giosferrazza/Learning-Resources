import { useEffect, useState } from 'react'
import { levels, media, subjects } from '../../../shared/vocabulary'
import { useAuth } from '../auth/AuthProvider'
import AddToList from '../components/AddToList'
import FavoriteButton from '../components/FavoriteButton'
import ResourceCard from '../components/ResourceCard'
import { Empty, Loading, LoadError, Page, Select } from '../components/ui'
import type { Resource } from '../lib/types'
import { useApi } from '../lib/useApi'

// S1-12 Browse the full content library (S1-12-T03 loading, empty and error states)
export default function LibraryPage() {
  const { profile } = useAuth()
  const [filters, setFilters] = useState({ subject: '', level: '', medium: '' })
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setQ(search), 250)
    return () => clearTimeout(t)
  }, [search])

  const query = new URLSearchParams(Object.entries({ ...filters, q }).filter(([, v]) => v)).toString()
  const { data, error, loading, refreshing, reload } = useApi<{ resources: Resource[] }>(`/library${query ? `?${query}` : ''}`)
  const filtered = Boolean(query)

  return (
    <Page title="Content library" subtitle="Every published resource.">
      <div className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm font-medium text-slate-700">
          Search
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Title contains…" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <Select label="Subject" options={subjects} placeholder="All subjects" value={filters.subject} onChange={(e) => setFilters({ ...filters, subject: e.target.value })} />
        <Select label="Level" options={levels} placeholder="All levels" value={filters.level} onChange={(e) => setFilters({ ...filters, level: e.target.value })} />
        <Select label="Format" options={media} placeholder="All formats" value={filters.medium} onChange={(e) => setFilters({ ...filters, medium: e.target.value })} />
      </div>
      {loading && <Loading />}
      {error && <LoadError error={error} retry={reload} />}
      {data && data.resources.length === 0 && (
        <Empty icon="search" title={filtered ? 'No resources match those filters' : 'The library is empty'}>
          {filtered ? 'Try removing a filter.' : 'Nothing has been published yet.'}
        </Empty>
      )}
      {data && data.resources.length > 0 && (
        <>
          <p className="mb-3 text-sm text-slate-500">
            {data.resources.length} resource{data.resources.length === 1 ? '' : 's'}
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
