import { createHash } from 'node:crypto'
import { HttpError } from './http.js'

// Process-local, bounded, free cache. Authorization must happen BEFORE calling it.
// Hash keys so questionnaire text and API keys are not retained as map keys.
export function createDiscoveryCache<T>(now = Date.now) {
  const entries = new Map<string, { expires: number; value: Promise<T> }>()
  const pending = new Map<string, Promise<T>>()
  const users = new Map<string, { until: number; count: number }>()
  return (userId: string, key: string, load: () => Promise<T>): Promise<T> => {
    const time = now()
    for (const [id, entry] of entries) if (entry.expires <= time) entries.delete(id)
    for (const [id, entry] of users) if (entry.until <= time) users.delete(id)
    const hash = createHash('sha256').update(key).digest('hex')
    const hit = entries.get(hash)?.value ?? pending.get(hash)
    if (hit) return hit
    const budget = users.get(userId) ?? { until: time + 60_000, count: 0 }
    if (budget.count >= 10 || pending.size >= 20 || (!users.has(userId) && users.size >= 1000)) {
      return Promise.reject(new HttpError(429, 'Video search is busy. Please try again shortly.', 'youtube_rate_limited'))
    }
    budget.count++
    users.set(userId, budget)
    const value = Promise.resolve().then(load)
    pending.set(hash, value)
    const finish = (ttl: number) => {
      pending.delete(hash)
      if (entries.size >= 100) entries.delete(entries.keys().next().value!)
      entries.set(hash, { expires: now() + ttl, value })
    }
    // Cache failures briefly too, avoiding repeated quota/network failures on remount.
    void value.then(() => finish(10 * 60_000), () => finish(30_000))
    return value
  }
}
