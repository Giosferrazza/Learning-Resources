import express, { type ErrorRequestHandler } from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '../lib/http.js'
import { youtubeRouter } from './youtube.js'

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), search: vi.fn() }))
vi.mock('../lib/supabase.js', () => ({ db: { auth: { getUser: mocks.getUser }, from: mocks.from } }))
vi.mock('../lib/youtube.js', () => ({ searchYouTube: mocks.search }))

const ownedId = '11111111-1111-4111-8111-111111111111'
const otherId = '22222222-2222-4222-8222-222222222222'
const rows = [
  { id: ownedId, user_id: 'student', topic: 'python', knowledge_level: 'beginner', preferred_media: ['video'], goal: 'exam' },
  { id: otherId, user_id: 'another-student', topic: 'excel', knowledge_level: 'advanced', preferred_media: [], goal: null },
]
let filters: Record<string, unknown>
let order: ReturnType<typeof vi.fn>
let limit: ReturnType<typeof vi.fn>
const app = express()
app.use('/api', youtubeRouter)
app.get('/api/unrelated', (_req, res) => res.json({ ok: true }))
const errors: ErrorRequestHandler = (err, _req, res, _next) => {
  res.status(err instanceof HttpError ? err.status : 500).json({ error: err.message, code: err.code })
}
app.use(errors)
const get = (query = '') => request(app).get(`/api/youtube/recommendations${query}`).set('Authorization', 'Bearer test-token')

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('YOUTUBE_API_KEY', 'server-yt-key')
  vi.stubEnv('OPENAI_API_KEY', '')
  filters = {}
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'student' } }, error: null })
  mocks.search.mockResolvedValue({ query: 'Python tutorial', querySource: 'rules', videos: [] })
  mocks.from.mockImplementation((table: string) => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((key: string, value: unknown) => { if (table === 'questionnaire_responses') filters[key] = value; return query }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({
        error: null,
        data: table === 'profiles'
          ? { email: 'student@example.test', display_name: 'Student', role: 'student', account_status: 'active' }
          : rows.find((row) => Object.entries(filters).every(([key, value]) => row[key as keyof typeof row] === value)) ?? null,
      })),
    }
    if (table === 'questionnaire_responses') { order = query.order; limit = query.limit }
    return query
  })
})
afterEach(() => vi.unstubAllEnvs())

describe('YouTube recommendations access and validation', () => {
  it('requires a signed-in session before reading questionnaires', async () => {
    expect((await request(app).get('/api/youtube/recommendations')).status).toBe(401)
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.search).not.toHaveBeenCalled()
  })

  it('does not apply YouTube authentication to unrelated routes', async () => {
    expect((await request(app).get('/api/unrelated')).status).toBe(200)
  })

  it('rejects an expired token', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { code: 'invalid_token' } })
    expect((await get()).status).toBe(401)
    expect(mocks.search).not.toHaveBeenCalled()
  })

  it.each(['?responseId=invalid', `?responseId=${'-'.repeat(36)}`, '?responseId=x&responseId=y', '?focus=x&focus=y', `?focus=${'x'.repeat(121)}`])('rejects malformed query parameters: %s', async (query) => {
    expect((await get(query)).status).toBe(400)
    expect(mocks.search).not.toHaveBeenCalled()
  })

  it('cannot retrieve another user’s questionnaire by ID', async () => {
    const result = await get(`?responseId=${otherId}`)
    expect(result.status).toBe(404)
    expect(filters).toEqual({ user_id: 'student', id: otherId })
    expect(mocks.search).not.toHaveBeenCalled()
  })

  it('returns 404 when there is no owned questionnaire', async () => {
    expect((await get('?responseId=33333333-3333-4333-8333-333333333333')).body.code).toBe('no_questionnaire')
  })

  it('searches the owned questionnaire and trims focus', async () => {
    const result = await get(`?responseId=${ownedId}&focus=%20loops%20`)
    expect(result.status).toBe(200)
    expect(mocks.search).toHaveBeenCalledWith({ topic: 'python', level: 'beginner', media: ['video'], goal: 'exam' }, 'loops', 'server-yt-key', '')
    expect(result.body).toEqual({ query: 'Python tutorial', querySource: 'rules', videos: [] })
  })

  it('selects the latest questionnaire only for the current user', async () => {
    expect((await get()).status).toBe(200)
    expect(filters).toEqual({ user_id: 'student' })
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(limit).toHaveBeenCalledWith(1)
  })

  it('returns a clear configuration error without a YouTube key', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', '')
    const result = await get()
    expect(result.status).toBe(503)
    expect(result.body.code).toBe('youtube_not_configured')
    expect(mocks.search).not.toHaveBeenCalled()
  })

  it('hides upstream errors and credentials', async () => {
    mocks.search.mockRejectedValue(new Error('private upstream detail server-yt-key'))
    const result = await get()
    expect(result.status).toBe(502)
    expect(result.body).toEqual({ error: 'YouTube search is temporarily unavailable.', code: 'youtube_unavailable' })
  })
})
