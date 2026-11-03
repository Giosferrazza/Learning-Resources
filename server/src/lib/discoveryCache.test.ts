import { describe, expect, it, vi } from 'vitest'
import { createDiscoveryCache } from './discoveryCache.js'

describe('discovery request safeguards', () => {
  it('coalesces concurrent requests and caches success for ten minutes', async () => {
    let now = 0
    const cached = createDiscoveryCache<number>(() => now)
    const load = vi.fn(async () => 42)
    expect(await Promise.all([cached('a', 'query', load), cached('b', 'query', load)])).toEqual([42, 42])
    await cached('a', 'query', load)
    expect(load).toHaveBeenCalledTimes(1)
    now = 600_001
    await cached('a', 'query', load)
    expect(load).toHaveBeenCalledTimes(2)
  })
  it('caches failures briefly, then permits recovery', async () => {
    let now = 0
    const cached = createDiscoveryCache(() => now)
    const load = vi.fn().mockRejectedValueOnce(new Error('outage')).mockResolvedValue('recovered')
    await expect(cached('a', 'query', load)).rejects.toThrow('outage')
    await expect(cached('a', 'query', load)).rejects.toThrow('outage')
    expect(load).toHaveBeenCalledTimes(1)
    now = 30_001
    expect(await cached('a', 'query', load)).toBe('recovered')
  })
  it('limits new searches per user but allows cached results', async () => {
    const cached = createDiscoveryCache()
    for (let i = 0; i < 10; i++) await cached('a', String(i), async () => i)
    await expect(cached('a', 'eleven', async () => 11)).rejects.toMatchObject({ status: 429 })
    expect(await cached('a', '0', async () => 99)).toBe(0)
    expect(await cached('b', 'eleven', async () => 11)).toBe(11)
  })
  it('bounds cache entries and separates different queries', async () => {
    const cached = createDiscoveryCache<number>()
    const load = vi.fn(async () => 1)
    await cached('a', 'first', load)
    for (let i = 0; i < 100; i++) await cached(String(i), String(i), load)
    await cached('b', 'first', load)
    expect(load).toHaveBeenCalledTimes(102)
  })
})
