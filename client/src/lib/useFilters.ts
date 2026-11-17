import { useSearchParams } from 'react-router-dom'
import { activeFilterCount, noFilters, parseFilters, type Filters } from '../../../shared/filters'

// S2-03-T03 / S2-06 Filter state lives in the URL, so it survives reloads, back/forward and sharing
export function useFilters() {
  const [params, setParams] = useSearchParams()
  const filters = parseFilters(params)
  const update = (next: Partial<Filters>) =>
    setParams(
      (p) => {
        const out = new URLSearchParams(p)
        for (const [key, value] of Object.entries(next)) {
          if (value) out.set(key, value)
          else out.delete(key)
        }
        return out
      },
      { replace: true },
    )
  return { filters, setFilters: update, clearFilters: () => update(noFilters), active: activeFilterCount(filters) }
}
