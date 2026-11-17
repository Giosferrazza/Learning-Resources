import { check } from './http.js'
import { db } from './supabase.js'

export type RatingSummary = { average: number | null; count: number }

// S2-10-T02 Per-resource average rating, for cards in the library, search and recommendations
export async function ratingsFor(ids: string[]): Promise<Map<string, RatingSummary>> {
  const out = new Map<string, RatingSummary>()
  if (!ids.length) return out
  const rows = check(await db.from('resource_feedback').select('resource_id, rating').in('resource_id', [...new Set(ids)]).not('rating', 'is', null))
  const sums = new Map<string, { sum: number; count: number }>()
  for (const r of rows) {
    const s = sums.get(r.resource_id) ?? { sum: 0, count: 0 }
    s.sum += r.rating as number
    s.count += 1
    sums.set(r.resource_id, s)
  }
  for (const id of ids) {
    const s = sums.get(id)
    out.set(id, s ? { average: Math.round((s.sum / s.count) * 10) / 10, count: s.count } : { average: null, count: 0 })
  }
  return out
}
