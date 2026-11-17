import { activeFilterCount, type Filters } from '../../../shared/filters'
import { levels, media, subjects } from '../../../shared/vocabulary'
import { Select } from './ui'

// S2-03-T01 / S2-06-T01 Subject, level and format controls, used by recommendations and the library
export default function FilterBar({
  filters,
  onChange,
  onClear,
  hide = [],
  children,
}: {
  filters: Filters
  onChange: (next: Partial<Filters>) => void
  onClear: () => void
  hide?: (keyof Filters)[]
  children?: React.ReactNode
}) {
  const active = activeFilterCount(filters)
  return (
    <div role="search" className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {children}
        {!hide.includes('subject') && <Select label="Subject" options={subjects} placeholder="All subjects" value={filters.subject} onChange={(e) => onChange({ subject: e.target.value as Filters['subject'] })} />}
        {!hide.includes('level') && <Select label="Level" options={levels} placeholder="All levels" value={filters.level} onChange={(e) => onChange({ level: e.target.value as Filters['level'] })} />}
        {!hide.includes('medium') && <Select label="Format" options={media} placeholder="All formats" value={filters.medium} onChange={(e) => onChange({ medium: e.target.value as Filters['medium'] })} />}
      </div>
      {active > 0 && (
        <div className="mt-3 flex items-center justify-between gap-2 text-sm text-slate-600">
          <span>
            {active} filter{active === 1 ? '' : 's'} on
          </span>
          <button type="button" onClick={onClear} className="font-semibold text-rl-teal-dark hover:underline">
            <i className="bi bi-x-circle mr-1" aria-hidden />
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}
