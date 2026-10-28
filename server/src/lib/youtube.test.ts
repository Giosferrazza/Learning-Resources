import { describe, expect, it, vi } from 'vitest'
import { buildYouTubeQuery, searchYouTube } from './youtube.js'
import type { Answers } from './recommend.js'

const answers: Answers = { topic: 'python', level: 'beginner', media: ['video'], goal: 'exam' }
const sample = { items: [{ id: { videoId: 'aB3dE5fG7hI' }, snippet: { title: 'Test video', channelTitle: 'Teacher', description: 'Example', publishedAt: '2026-10-01', thumbnails: { medium: { url: 'https://i.ytimg.com/vi/example.jpg' } } } }] }

describe('YouTube questionnaire discovery', () => {
  it('combines subject, focus, level and goal without mutating answers', () => {
    expect(buildYouTubeQuery(answers, '  functions   and loops  ')).toBe('Python functions and loops Beginner exam preparation practice')
  })

  it('calls the YouTube video API with the generated search query and returns safe URLs', async () => {
    let fetchedUrl = ''
    const fetcher = (async (url: string | URL | Request) => { fetchedUrl = String(url); return { ok: true, json: async () => sample } as Response }) as typeof fetch
    const result = await searchYouTube(answers, 'loops', 'test-key', undefined, fetcher)
    const url = new URL(fetchedUrl)
    expect(url.hostname).toBe('www.googleapis.com')
    expect(url.searchParams.get('type')).toBe('video')
    expect(url.searchParams.get('q')).toContain('loops')
    expect(result.querySource).toBe('rules')
    expect(result.videos[0].url).toBe('https://www.youtube.com/watch?v=aB3dE5fG7hI')
  })

  it('uses a completed AI query if configured', async () => {
    const ai = { status: 'completed', output: [{ content: [{ type: 'output_text', text: 'Python loops beginner exam tutorial' }] }] }
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ai }).mockResolvedValueOnce({ ok: true, json: async () => sample }) as unknown as typeof fetch
    const result = await searchYouTube(answers, 'loops', 'yt-key', 'openai-key', fetcher)
    expect(result.querySource).toBe('ai')
    expect(result.query).toBe('Python loops beginner exam tutorial')
  })

  it('drops records with invalid IDs', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ items: [{ id: { videoId: 'not-a-valid-id' }, snippet: { title: 'Bad' } }, ...sample.items] }) })) as unknown as typeof fetch
    const result = await searchYouTube(answers, '', 'yt-key', undefined, fetcher)
    expect(result.videos).toHaveLength(1)
  })

  it.each([
    { ok: false, status: 429 },
    { ok: true, json: async () => ({ status: 'completed', output: [] }) },
    { ok: true, json: async () => ({ status: 'incomplete', output: [{ content: [{ type: 'output_text', text: 'partial query' }] }] }) },
    { ok: true, json: async () => ({ status: 'completed', output: [{ content: [{ type: 'output_text', text: 'x'.repeat(141) }] }] }) },
  ])('falls back to questionnaire terms on unusable AI responses: %j', async (ai) => {
    const fetcher = vi.fn().mockResolvedValueOnce(ai).mockResolvedValueOnce({ ok: true, json: async () => sample })
    const result = await searchYouTube(answers, 'loops', 'yt-key', 'ai-key', fetcher)
    expect(result.querySource).toBe('rules')
    expect(result.query).toBe(buildYouTubeQuery(answers, 'loops'))
    expect(new URL(String(fetcher.mock.calls[1][0])).searchParams.get('q')).toBe(result.query)
  })

  it('falls back when AI times out or the network fails', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new DOMException('Timed out', 'TimeoutError')).mockResolvedValueOnce({ ok: true, json: async () => sample })
    expect((await searchYouTube(answers, '', 'yt-key', 'ai-key', fetcher)).querySource).toBe('rules')
  })

  it('handles empty results, missing snippets, and duplicate IDs', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ id: { videoId: 'aB3dE5fG7hI' } }, ...sample.items, ...sample.items] }) })
    expect((await searchYouTube(answers, '', 'yt-key', undefined, fetcher)).videos).toEqual([])
    expect((await searchYouTube(answers, '', 'yt-key', undefined, fetcher)).videos).toHaveLength(1)
  })

  it('surfaces YouTube failures without including the API key', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 403 })
    await expect(searchYouTube(answers, '', 'secret-yt-key', undefined, fetcher)).rejects.toThrow('YouTube API returned HTTP 403')
  })

  it('bounds the focus and supplies a tutorial when no goal is selected', () => {
    expect(buildYouTubeQuery({ ...answers, goal: null }, 'x'.repeat(200))).toBe(`Python ${'x'.repeat(120)} Beginner tutorial`)
  })
})
