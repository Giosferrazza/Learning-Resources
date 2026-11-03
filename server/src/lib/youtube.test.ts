import { describe, expect, it, vi } from 'vitest'
import { buildYouTubeQuery, searchYouTube } from './youtube.js'
import type { Answers } from './recommend.js'

const answers: Answers = { topic: 'python', level: 'beginner', media: ['video'], goal: 'exam' }
const sample = { items: [{ id: { videoId: 'aB3dE5fG7hI' }, snippet: { title: 'Loops', channelTitle: 'Teacher', thumbnails: { medium: { url: 'https://i.ytimg.com/vi/example.jpg' } } } }] }

describe('free questionnaire-driven discovery', () => {
  it('uses saved specific text with subject, level and goal', () => {
    expect(buildYouTubeQuery({ ...answers, learningRequest: ' for loops   and while loops ' })).toBe('Python for loops and while loops Beginner exam preparation practice')
    expect(buildYouTubeQuery({ ...answers, learningRequest: 'functions' })).not.toBe(buildYouTubeQuery({ ...answers, learningRequest: 'loops' }))
  })
  it('supports old questionnaires, bounds text and supplies a default goal', () => {
    expect(buildYouTubeQuery({ ...answers, goal: null })).toBe('Python Beginner tutorial')
    expect(buildYouTubeQuery(answers, 'x'.repeat(600))).toContain('x'.repeat(500) + ' Beginner')
  })
  it('calls only YouTube even with a legacy OpenAI key, and sets a timeout', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'must-never-be-used')
    try {
      const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => sample })
      const result = await searchYouTube({ ...answers, learningRequest: 'loops' }, '', 'yt-key', fetcher)
      expect(fetcher).toHaveBeenCalledTimes(1)
      const url = new URL(fetcher.mock.calls[0][0])
      expect(url.hostname).toBe('www.googleapis.com')
      expect(url.searchParams.get('q')).toContain('loops')
      expect(url.searchParams.get('type')).toBe('video')
      expect(fetcher.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
      expect(result.querySource).toBe('rules')
      expect(result.videos[0]).toMatchObject({ url: 'https://www.youtube.com/watch?v=aB3dE5fG7hI', channel: 'Teacher' })
    } finally { vi.unstubAllEnvs() }
  })
  it('handles empty, malformed and duplicate video records', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ id: { videoId: 'invalid' }, snippet: { title: 'Bad' } }, ...sample.items, ...sample.items] }) })
    expect((await searchYouTube(answers, '', 'key', fetcher)).videos).toEqual([])
    expect((await searchYouTube(answers, '', 'key', fetcher)).videos).toHaveLength(1)
  })
  it('surfaces API failure and timeout to the route', async () => {
    await expect(searchYouTube(answers, '', 'secret', vi.fn().mockResolvedValue({ ok: false, status: 403 }))).rejects.toThrow('YouTube API returned HTTP 403')
    await expect(searchYouTube(answers, '', 'secret', vi.fn().mockRejectedValue(new DOMException('Timed out', 'TimeoutError')))).rejects.toThrow('Timed out')
  })
})
