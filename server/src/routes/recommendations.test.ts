import express, { type ErrorRequestHandler } from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { recommendationsRouter } from './recommendations.js'
import { HttpError } from '../lib/http.js'

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn() }))
vi.mock('../lib/supabase.js', () => ({ db: { auth: { getUser: mocks.getUser }, from: mocks.from } }))
vi.mock('../lib/events.js', () => ({ track: vi.fn() }))
const app = express()
app.use(express.json())
app.use('/api', recommendationsRouter)
const errors: ErrorRequestHandler = (err, _req, res, _next) => res.status(err instanceof HttpError ? err.status : 500).json({ error: err.message, code: err.code })
app.use(errors)
const answers = { topic: 'python', level: 'beginner', media: ['video'], goal: 'exam' }
let rows: Record<string, unknown>[]
let role: string
let suspended: boolean
let resourceFilters: Record<string, unknown>
const post = (body: object) => request(app).post('/api/questionnaire').set('Authorization', 'Bearer test').send(body)
const get = (path: string) => request(app).get(`/api${path}`).set('Authorization', 'Bearer test')

beforeEach(() => {
  vi.resetAllMocks()
  rows = []
  role = 'student'
  suspended = false
  resourceFilters = {}
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'student' } }, error: null })
  mocks.from.mockImplementation((table: string) => {
    const filters: Record<string, unknown> = {}
    let inserted: Record<string, unknown> | undefined
    const result = () => ({ error: null, data: table === 'profiles'
      ? { role, account_status: suspended ? 'suspended' : 'active' }
      : table === 'resources' ? [{ id: 'resource', title: 'Python guide', subject: 'python', level: 'beginner', medium: 'video', goals: ['exam'], created_at: '2026-01-01' }]
      : inserted ?? rows.find((row) => Object.entries(filters).every(([key, value]) => row[key] === value)) ?? null })
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((key: string, value: unknown) => { filters[key] = value; if (table === 'resources') resourceFilters[key] = value; return query }),
      order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
      insert: vi.fn((row: Record<string, unknown>) => { inserted = { id: 'owned', ...row }; rows.unshift(inserted); return query }),
      single: vi.fn(async () => result()), maybeSingle: vi.fn(async () => result()),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
    }
    return query
  })
})

describe('questionnaire persistence and recommendations', () => {
  it.each([undefined, '', '  for loops and while loops  '])('saves and retrieves optional request: %s', async (learningRequest) => {
    expect((await post({ ...answers, learningRequest })).status).toBe(201)
    const latest = await get('/questionnaire/latest')
    expect(latest.body.response.learning_request).toBe(learningRequest?.trim() || null)
    expect(latest.body.response.user_id).toBe('student')
    const recommendations = await get('/recommendations?responseId=owned')
    expect(recommendations.body.answers.learningRequest).toBe(learningRequest?.trim() || null)
    expect(recommendations.body.items[0].resource.id).toBe('resource')
    expect(resourceFilters.status).toBe('published')
  })
  it.each(['x'.repeat(501), 123, {}, ['loops']])('rejects invalid optional text', async (learningRequest) => {
    expect((await post({ ...answers, learningRequest })).status).toBe(400)
    expect(rows).toHaveLength(0)
  })
  it('handles an old questionnaire without the new column value', async () => {
    rows.push({ id: 'old', user_id: 'student', topic: 'python', knowledge_level: 'beginner', preferred_media: [], goal: null })
    const result = await get('/recommendations?responseId=old')
    expect(result.status).toBe(200)
    expect(result.body.answers.learningRequest).toBeNull()
    expect(result.body.items).toHaveLength(1)
  })
  it('preserves professor questionnaire access', async () => {
    role = 'professor'
    expect((await post({ ...answers, learningRequest: 'Teach loops' })).status).toBe(201)
    expect((await get('/recommendations?responseId=owned')).status).toBe(200)
  })
  it('requires authentication and rejects suspended accounts', async () => {
    expect((await request(app).post('/api/questionnaire').send(answers)).status).toBe(401)
    expect((await request(app).get('/api/recommendations')).status).toBe(401)
    suspended = true
    expect((await post(answers)).status).toBe(403)
  })
  it('cannot read another user questionnaire or override submission ownership', async () => {
    rows.push({ id: 'other', user_id: 'someone-else' })
    expect((await get('/recommendations?responseId=other')).status).toBe(404)
    expect((await get('/questionnaire/latest')).body.response).toBeNull()
    await post({ ...answers, user_id: 'someone-else' })
    expect(rows[0].user_id).toBe('student')
  })
})
