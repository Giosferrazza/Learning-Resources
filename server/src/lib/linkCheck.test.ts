import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkLink } from './linkCheck.js'

const respond = (status: number) => vi.fn(async (_url: string | URL) => new Response(null, { status }))

describe('checkLink', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('is ok for a live page and broken for 404 or a bad URL', async () => {
    vi.stubGlobal('fetch', respond(200))
    expect(await checkLink('https://example.com/a')).toBe('ok')
    vi.stubGlobal('fetch', respond(404))
    expect(await checkLink('https://example.com/missing')).toBe('broken')
    expect(await checkLink('not a url')).toBe('broken')
  })

  it('does not call bot-blocked or erroring sites broken', async () => {
    vi.stubGlobal('fetch', respond(403))
    expect(await checkLink('https://example.com/')).toBe('unknown')
    vi.stubGlobal('fetch', vi.fn(async () => { throw Object.assign(new Error('fetch failed'), { cause: { code: 'ENOTFOUND' } }) }))
    expect(await checkLink('https://no-such-host.invalid/')).toBe('broken')
  })

  it('checks YouTube videos through oEmbed, since deleted videos still answer 200', async () => {
    const fetch = respond(404)
    vi.stubGlobal('fetch', fetch)
    expect(await checkLink('https://www.youtube.com/watch?v=gone')).toBe('broken')
    expect(String(fetch.mock.calls[0][0])).toContain('youtube.com/oembed')
  })
})
