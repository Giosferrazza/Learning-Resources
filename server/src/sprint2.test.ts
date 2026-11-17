import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DEDUPE_WINDOW_MS } from './lib/engagement.js'
import { renderList } from './lib/exportList.js'
import { db } from './lib/supabase.js'
import { api, cleanupUsers, createUser, insertResource, type TestUser } from './test/helpers.js'

// Integration tests for the Sprint 2 T04 "verify" tasks.
// Needs local Supabase running (`npx supabase start`) with migrations applied.

let student: TestUser, otherStudent: TestUser, professor: TestUser, otherProfessor: TestUser, educator: TestUser, admin: TestUser
const startedAt = new Date().toISOString()

// Each run uses a subject nobody else's test data is likely to fill, and cleans up after itself
const SUBJECT = 'design'

beforeAll(async () => {
  ;[student, otherStudent, professor, otherProfessor, educator, admin] = await Promise.all([
    createUser('student'),
    createUser('student'),
    createUser('professor'),
    createUser('professor'),
    createUser('educator'),
    createUser('admin'),
  ])
})

afterAll(async () => {
  // Leave the rules as we found them for the next run and for local use
  await db.from('recommendation_settings').delete().eq('id', 1)
  await db.from('recommendation_settings_history').delete().gte('created_at', startedAt)
  await db.from('support_requests').delete().gte('created_at', startedAt)
  await cleanupUsers()
})

const submit = (user: TestUser, body: object) => api(user).post('/questionnaire', { topic: SUBJECT, level: 'beginner', media: [], goal: '', ...body })

describe('S2-01-T04 each role reaches its main pages and nothing else', () => {
  it('lets each role use its own areas and blocks the rest', async () => {
    const checks: [TestUser, string, number][] = [
      [student, '/questionnaires', 200],
      [student, '/history', 200],
      [student, '/library', 403],
      [student, '/insights/preferences', 403],
      [student, '/admin/recommendation-rules', 403],
      [professor, '/library', 200],
      [professor, '/lists', 200],
      [professor, '/insights/engagement', 403],
      [educator, '/insights/preferences', 200],
      [educator, '/insights/engagement', 200],
      [educator, '/admin/support', 403],
      [admin, '/admin/support', 200],
      [admin, '/admin/recommendation-rules', 200],
      [admin, '/insights/preferences', 200],
    ]
    for (const [user, path, status] of checks) {
      const res = await api(user).get(path)
      expect({ role: user.role, path, status: res.status }).toEqual({ role: user.role, path, status })
    }
  })

  it('returns readable JSON errors for bad IDs instead of crashing', async () => {
    for (const path of ['/questionnaire/not-an-id', '/history/nope', '/resources/123', '/lists/abc/export']) {
      const res = await api(professor).get(path)
      expect(res.status).toBe(404)
      expect(res.body.error).toMatch(/not found/)
    }
  })
})

describe('S2-02-T04 support requests reach an admin and can be resolved', () => {
  it('stores a signed-in request, notifies admins, and tells the person when resolved', async () => {
    const bad = await api(student).post('/support', { category: 'bug', subject: 'Help', message: 'short' })
    expect(bad.status).toBe(400)

    const created = await api(student).post('/support', { category: 'bug', subject: 'Favorites button does nothing', message: 'Clicking the heart on a resource does not save it.' })
    expect(created.status).toBe(201)
    expect(created.body.request).toMatchObject({ email: student.email, status: 'open' })
    const id = created.body.request.id

    const notices = await api(admin).get('/notifications')
    expect(notices.body.notifications.some((n: { type: string; message: string }) => n.type === 'support_request' && n.message.includes('Favorites button'))).toBe(true)

    const list = await api(admin).get('/admin/support?status=open')
    expect(list.body.requests.map((r: { id: string }) => r.id)).toContain(id)

    expect((await api(admin).post(`/admin/support/${id}/resolve`, {})).status).toBe(400)
    const resolved = await api(admin).post(`/admin/support/${id}/resolve`, { note: 'Fixed in today’s update.' })
    expect(resolved.status).toBe(200)
    expect(resolved.body.request.status).toBe('resolved')
    expect((await api(admin).post(`/admin/support/${id}/resolve`, { note: 'again' })).status).toBe(404)

    const mine = await api(student).get('/support/mine')
    expect(mine.body.requests[0]).toMatchObject({ id, status: 'resolved', resolution_note: 'Fixed in today’s update.' })
    const studentNotices = await api(student).get('/notifications')
    expect(studentNotices.body.notifications.some((n: { type: string }) => n.type === 'support_resolved')).toBe(true)
    expect((await api(otherStudent).get('/support/mine')).body.requests).toHaveLength(0)
  })

  it('accepts guests with an email and ignores bots', async () => {
    expect((await api().post('/support', { category: 'account', subject: 'Locked out', message: 'I cannot sign in to my account.' })).status).toBe(400)
    const guest = await api().post('/support', { name: 'Guest', email: 'guest@example.com', category: 'account', subject: 'Locked out', message: 'I cannot sign in to my account.' })
    expect(guest.status).toBe(201)
    const bot = await api().post('/support', { website: 'spam.example', email: 'bot@example.com', category: 'other', subject: 'Buy', message: 'Buy cheap things now!!!' })
    expect(bot.status).toBe(201)
    expect(bot.body.request).toBeNull()
  })
})

describe('S2-03-T04 / S2-15-T04 filtering recommendations and format preference', () => {
  it('combines filters, reports no-results, and keeps students isolated', async () => {
    const video = await insertResource(educator, { subject: SUBJECT, level: 'beginner', medium: 'video', title: 'Filter video' })
    const article = await insertResource(educator, { subject: SUBJECT, level: 'beginner', medium: 'article', title: 'Filter article' })
    const { body } = await submit(student, {})
    const all = await api(student).get(`/recommendations?responseId=${body.id}`)
    const ids = all.body.items.map((i: { resource: { id: string } }) => i.resource.id)
    expect(ids).toEqual(expect.arrayContaining([video.id, article.id]))

    const videos = await api(student).get(`/recommendations?responseId=${body.id}&medium=video&level=beginner`)
    expect(videos.body.items.every((i: { resource: { medium: string; level: string } }) => i.resource.medium === 'video' && i.resource.level === 'beginner')).toBe(true)
    expect(videos.body.unfilteredCount).toBe(all.body.items.length)

    const none = await api(student).get(`/recommendations?responseId=${body.id}&subject=excel`)
    expect(none.body.items).toHaveLength(0)
    const ignored = await api(student).get(`/recommendations?responseId=${body.id}&medium=hologram`)
    expect(ignored.body.items).toHaveLength(all.body.items.length)

    expect((await api(otherStudent).get(`/recommendations?responseId=${body.id}`)).status).toBe(404)
  })

  it('ranks the chosen format first; the no-format fallback is unit tested in recommend.test.ts', async () => {
    const { body: wantsVideo } = await submit(student, { media: ['video'] })
    const ranked = await api(student).get(`/recommendations?responseId=${wantsVideo.id}`)
    expect(ranked.body.items[0].resource.medium).toBe('video')
    expect(ranked.body.mediumFallback).toBe(false)

    const { body: wantsArticle } = await submit(student, { media: ['article'] })
    const articles = await api(student).get(`/recommendations?responseId=${wantsArticle.id}`)
    expect(articles.body.items[0].resource.medium).toBe('article')
  })
})

describe('S2-04-T04 / S2-16-T04 / S2-17-T04 several questionnaires, edits and history', () => {
  it('keeps questionnaires separate, regenerates on edit, and keeps past results', async () => {
    await insertResource(educator, { subject: SUBJECT, level: 'advanced', medium: 'tool', title: 'Advanced design tool' })
    const first = (await submit(otherStudent, { level: 'beginner', goal: 'exam' })).body.id
    const second = (await submit(otherStudent, { level: 'advanced', goal: 'career' })).body.id
    expect(first).not.toBe(second)

    const list = await api(otherStudent).get('/questionnaires')
    expect(list.body.responses.map((r: { id: string }) => r.id).slice(0, 2)).toEqual([second, first])
    expect(list.body.responses[0]).toMatchObject({ topic: SUBJECT, goal: 'career' })
    expect(list.body.responses[0].created_at).toBeTruthy()

    const firstBefore = await api(otherStudent).get(`/recommendations?responseId=${first}`)
    const secondResults = await api(otherStudent).get(`/recommendations?responseId=${second}`)
    expect(secondResults.body.answers.level).toBe('advanced')
    expect(firstBefore.body.answers.level).toBe('beginner')

    // Edit the first one: only it changes, and its results follow the new answers
    const edited = await api(otherStudent).patch(`/questionnaire/${first}`, { topic: SUBJECT, level: 'advanced', media: ['tool'], goal: 'exam' })
    expect(edited.status).toBe(200)
    const firstAfter = await api(otherStudent).get(`/recommendations?responseId=${first}`)
    expect(firstAfter.body.answers).toMatchObject({ level: 'advanced', media: ['tool'] })
    expect(firstAfter.body.items[0].resource.title).toBe('Advanced design tool')
    expect((await api(otherStudent).get(`/questionnaire/${second}`)).body.response).toMatchObject({ goal: 'career', preferred_media: [] })

    // History: the original beginner result is still there and unchanged
    const history = await api(otherStudent).get('/history')
    const forFirst = history.body.snapshots.filter((s: { response_id: string }) => s.response_id === first)
    expect(forFirst.map((s: { reason: string }) => s.reason)).toEqual(['edited', 'submitted'])
    const original = await api(otherStudent).get(`/history/${forFirst[1].id}`)
    expect(original.body.snapshot.answers.level).toBe('beginner')
    expect(original.body.snapshot.items.map((i: { id: string }) => i.id)).toEqual(firstBefore.body.items.map((i: { resource: { id: string } }) => i.resource.id))

    // Other people can't edit or read it
    expect((await api(student).patch(`/questionnaire/${first}`, { topic: SUBJECT, level: 'beginner', media: [] })).status).toBe(404)
    expect((await api(student).get(`/history/${forFirst[1].id}`)).status).toBe(404)
    expect((await api(otherStudent).patch(`/questionnaire/${first}`, { topic: 'nope', level: 'beginner', media: [] })).status).toBe(400)
  })

  it('marks resources removed since a past result as unavailable', async () => {
    const doomed = await insertResource(educator, { subject: SUBJECT, level: 'intermediate', medium: 'article', title: 'Soon removed' })
    const id = (await submit(otherStudent, { level: 'intermediate', media: ['article'] })).body.id
    await db.from('resources').update({ status: 'removed' }).eq('id', doomed.id)
    const history = await api(otherStudent).get('/history')
    const snap = history.body.snapshots.find((s: { response_id: string }) => s.response_id === id)
    const detail = await api(otherStudent).get(`/history/${snap.id}`)
    expect(detail.body.snapshot.items.find((i: { id: string }) => i.id === doomed.id)).toMatchObject({ title: 'Soon removed', available: false })
  })
})

describe('S2-05-T04 recommendation notifications reach only the right students', () => {
  it('notifies matching students about new and updated resources', async () => {
    const fan = await createUser('student')
    const offLevel = await createUser('student')
    const wrongFormat = await createUser('student')
    const saver = await createUser('student')
    await submit(fan, { level: 'intermediate', media: ['video'] })
    await submit(offLevel, { level: 'beginner', media: [], topic: 'excel' })
    await submit(wrongFormat, { level: 'intermediate', media: ['article'] })
    await submit(professor, { level: 'intermediate', media: [] })

    const created = await api(educator).post('/resources', { title: 'Notify me', url: 'https://example.com/n', subject: SUBJECT, level: 'advanced', medium: 'video', submit: true })
    const id = created.body.resource.id
    await api(admin).post(`/admin/submissions/${id}/approve`)

    const has = async (u: TestUser, type: string) => (await api(u).get('/notifications')).body.notifications.filter((n: { type: string; resource_id: string }) => n.type === type && n.resource_id === id)
    expect(await has(fan, 'new_recommendation')).toHaveLength(1)
    expect(await has(offLevel, 'new_recommendation')).toHaveLength(0)
    expect(await has(wrongFormat, 'new_recommendation')).toHaveLength(0)
    expect(await has(professor, 'new_recommendation')).toHaveLength(0)
    expect(await has(educator, 'new_recommendation')).toHaveLength(0)

    // The saver favorites it, then the educator edits and it's approved again: an update
    await api(saver).post('/favorites', { resourceId: id })
    await api(educator).patch(`/resources/${id}`, { title: 'Notify me (v2)', url: 'https://example.com/n', subject: SUBJECT, level: 'advanced', medium: 'video' })
    await api(admin).post(`/admin/submissions/${id}/approve`)
    expect(await has(saver, 'resource_updated')).toHaveLength(1)
    expect(await has(fan, 'resource_updated')).toHaveLength(1)
    expect(await has(fan, 'new_recommendation')).toHaveLength(1)

    // Read state: marking it read works and links to the resource
    const [notice] = await has(fan, 'resource_updated')
    expect((await api(fan).patch(`/notifications/${notice.id}/read`)).status).toBe(200)
    expect((await api(saver).patch(`/notifications/${notice.id}/read`)).status).toBe(404)
  })
})

describe('S2-06-T04 professor search and filters', () => {
  it('matches title or description, combines filters, only published, ranks titles first', async () => {
    const tag = `zq${Date.now().toString(36)}`
    const inTitle = await insertResource(educator, { title: `${tag} color theory`, subject: SUBJECT, level: 'beginner', medium: 'article' })
    const startsWith = await insertResource(educator, { title: `Intro to ${tag}`, subject: SUBJECT, level: 'beginner', medium: 'video' })
    const inDescription = await insertResource(educator, { title: 'Layout basics', subject: SUBJECT, level: 'beginner', medium: 'article' })
    await db.from('resources').update({ description: `Covers ${tag} grids` }).eq('id', inDescription.id)
    await insertResource(educator, { title: `${tag} draft`, subject: SUBJECT, status: 'draft' })

    const all = await api(professor).get(`/library?q=${tag}`)
    expect(all.status).toBe(200)
    expect(all.body.resources.map((r: { id: string }) => r.id)).toEqual([inTitle.id, startsWith.id, inDescription.id])

    const articles = await api(professor).get(`/library?q=${tag}&medium=article&level=beginner&subject=${SUBJECT}`)
    expect(articles.body.resources.map((r: { id: string }) => r.id)).toEqual([inTitle.id, inDescription.id])
    expect((await api(professor).get(`/library?q=${tag}&level=advanced`)).body.resources).toHaveLength(0)

    // Characters that would break the query are treated as plain text
    expect((await api(professor).get(`/library?q=${encodeURIComponent('a,b)(%_*')}`)).status).toBe(200)
  })
})

describe('S2-07-T04 / S2-08-T04 curated lists, ownership and export', () => {
  it('creates, saves and protects lists, and exports usable files', async () => {
    const a = await insertResource(educator, { subject: SUBJECT, level: 'beginner', medium: 'video', title: 'Week 1, "intro"', url: 'https://example.com/a' })
    const b = await insertResource(educator, { subject: SUBJECT, level: 'advanced', medium: 'tool', title: '=SUM(A1)', url: 'https://example.com/b' })
    const created = await api(professor).post('/lists', { name: 'Design 101 syllabus', resourceIds: [a.id] })
    expect(created.status).toBe(201)
    const listId = created.body.list.id
    expect((await api(professor).post(`/lists/${listId}/items`, { resourceId: b.id })).status).toBe(201)
    expect((await api(professor).get(`/lists/${listId}`)).body.list.items).toHaveLength(2)

    // Another professor can't see, change or export it
    expect((await api(otherProfessor).get(`/lists/${listId}`)).status).toBe(404)
    expect((await api(otherProfessor).post(`/lists/${listId}/items`, { resourceId: a.id })).status).toBe(404)
    expect((await api(otherProfessor).get(`/lists/${listId}/export`)).status).toBe(404)

    const csv = await api(professor).get(`/lists/${listId}/export?format=csv`)
    expect(csv.status).toBe(200)
    expect(csv.headers['content-type']).toMatch(/text\/csv/)
    expect(csv.headers['content-disposition']).toContain('design-101-syllabus.csv')
    const lines = csv.text.replace(/^﻿/, '').trim().split('\r\n')
    expect(lines[0]).toBe('Title,Type,Level,Subject,Link,Description')
    expect(lines[1]).toBe('"Week 1, ""intro""",Video,Beginner,Design,https://example.com/a,')
    expect(lines[2].startsWith("'=SUM(A1)")).toBe(true)

    const md = await api(professor).get(`/lists/${listId}/export?format=md`)
    expect(md.text).toContain('# Design 101 syllabus')
    expect(md.text).toContain('(https://example.com/a) (Video · Beginner · Design)')
    const html = await api(professor).get(`/lists/${listId}/export?format=html`)
    expect(html.text).toContain('<a href="https://example.com/b">=SUM(A1)</a>')
    expect((await api(professor).get(`/lists/${listId}/export?format=pdf`)).status).toBe(400)

    const empty = await api(professor).post('/lists', { name: 'Empty' })
    const refused = await api(professor).get(`/lists/${empty.body.list.id}/export`)
    expect(refused.status).toBe(400)
    expect(refused.body.code).toBe('empty_list')
  })

  it('escapes HTML in exported titles', () => {
    const out = renderList('<b>x</b>', [{ title: '<script>', description: '', medium: null, level: null, subject: null, link: 'https://e.com/?a=1&b="2"' }], 'html')
    expect(out).not.toContain('<script>')
    expect(out).toContain('&lt;script&gt;')
    expect(out).toContain('href="https://e.com/?a=1&amp;b=&quot;2&quot;"')
  })
})

describe('S2-09-T04 / S2-10-T04 resource details, ratings and feedback', () => {
  it('shows accurate quality details and ratings to professors and students', async () => {
    const r = await insertResource(educator, { subject: SUBJECT, level: 'beginner', medium: 'video', title: 'Rated resource', goals: ['exam'] })
    expect((await api(professor).post(`/resources/${r.id}/feedback`, { rating: 5, comment: 'Great for week one.' })).status).toBe(201)
    expect((await api(student).post(`/resources/${r.id}/feedback`, { rating: 2 })).status).toBe(201)
    // Editing replaces the professor's rating instead of adding one
    expect((await api(professor).post(`/resources/${r.id}/feedback`, { rating: 4, comment: 'Good for week one.' })).status).toBe(201)
    await api(student).post('/favorites', { resourceId: r.id })

    const detail = await api(professor).get(`/resources/${r.id}`)
    expect(detail.body.rating).toMatchObject({ average: 3, count: 2 })
    expect(detail.body.rating.distribution).toEqual([
      { stars: 5, count: 0 },
      { stars: 4, count: 1 },
      { stars: 3, count: 0 },
      { stars: 2, count: 1 },
      { stars: 1, count: 0 },
    ])
    expect(detail.body.quality.favorites).toBe(1)
    expect(detail.body.quality.comments).toEqual([expect.objectContaining({ comment: 'Good for week one.', rating: 4, role: 'professor' })])
    expect(JSON.stringify(detail.body.quality)).not.toContain(professor.email)
    expect(detail.body.resource).toMatchObject({ title: 'Rated resource', subject: SUBJECT, level: 'beginner', medium: 'video', url: 'https://example.com' })

    // Relevance uses the viewer's latest questionnaire in that subject
    await submit(student, { level: 'beginner', media: ['video'], goal: 'exam' })
    const forStudent = await api(student).get(`/resources/${r.id}`)
    expect(forStudent.body.relevance).toMatchObject({ exact: true })
    expect(forStudent.body.relevance.reasons).toContain('Fits your goal: Prepare for an exam')

    // Ratings show up on library cards and recommendation cards
    const library = await api(professor).get(`/library?q=${encodeURIComponent('Rated resource')}`)
    expect(library.body.resources[0].rating).toEqual({ average: 3, count: 2 })
    const recs = await api(student).get('/recommendations')
    expect(recs.body.items.find((i: { resource: { id: string } }) => i.resource.id === r.id).resource.rating).toEqual({ average: 3, count: 2 })
  })
})

describe('S2-11-T04 educator report numbers match the data', () => {
  it('counts favorites and preferred formats as anonymous totals', async () => {
    const before = (await api(educator).get('/insights/preferences')).body
    const r = await insertResource(educator, { subject: SUBJECT, level: 'beginner', medium: 'tool', title: 'Report tool' })
    const fans = await Promise.all([createUser('student'), createUser('student')])
    for (const fan of fans) await api(fan).post('/favorites', { resourceId: r.id })
    await submit(fans[0], { media: ['tool', 'video'] })
    await submit(fans[1], { media: [] })

    const after = (await api(educator).get('/insights/preferences')).body
    expect(after.favorites.total - before.favorites.total).toBe(2)
    expect(after.favorites.byMedium.tool - before.favorites.byMedium.tool).toBe(2)
    expect(after.favorites.bySubject[SUBJECT] - before.favorites.bySubject[SUBJECT]).toBe(2)
    expect(after.favorites.topResources.find((t: { id: string }) => t.id === r.id).favorites).toBe(2)
    expect(after.preferredMedia.questionnaires - before.preferredMedia.questionnaires).toBe(2)
    expect(after.preferredMedia.counts.tool - before.preferredMedia.counts.tool).toBe(1)
    expect(after.preferredMedia.counts.video - before.preferredMedia.counts.video).toBe(1)
    expect(after.preferredMedia.noPreference - before.preferredMedia.noPreference).toBe(1)

    const raw = JSON.stringify(after)
    for (const fan of fans) {
      expect(raw).not.toContain(fan.id)
      expect(raw).not.toContain(fan.email)
    }
  })
})

describe('S2-12-T04 engagement events are counted correctly', () => {
  it('counts views and opens once per person per window and aggregates per resource', async () => {
    const r = await insertResource(educator, { subject: SUBJECT, title: 'Engaging resource' })
    expect((await api(student).post(`/resources/${r.id}/events`, { kind: 'view' })).body.counted).toBe(true)
    expect((await api(student).post(`/resources/${r.id}/events`, { kind: 'view' })).body.counted).toBe(false)
    expect((await api(student).post(`/resources/${r.id}/events`, { kind: 'open' })).body.counted).toBe(true)
    expect((await api(otherStudent).post(`/resources/${r.id}/events`, { kind: 'view' })).body.counted).toBe(true)
    expect((await api(student).post(`/resources/${r.id}/events`, { kind: 'like' })).status).toBe(400)

    // An old view outside the window doesn't block a new one, and old events drop out of short periods
    await db.from('resource_views').insert({ resource_id: r.id, user_id: professor.id, kind: 'view', created_at: new Date(Date.now() - DEDUPE_WINDOW_MS - 60_000).toISOString() })
    expect((await api(professor).post(`/resources/${r.id}/events`, { kind: 'view' })).body.counted).toBe(true)
    await db.from('resource_views').insert({ resource_id: r.id, user_id: professor.id, kind: 'open', created_at: new Date(Date.now() - 20 * 86_400_000).toISOString() })

    const week = await api(educator).get('/insights/engagement?period=7&sort=views')
    const row = week.body.resources.find((x: { id: string }) => x.id === r.id)
    expect(row).toMatchObject({ views: 4, opens: 1, people: 3, mine: true })
    const month = await api(educator).get('/insights/engagement?period=30')
    expect(month.body.resources.find((x: { id: string }) => x.id === r.id)).toMatchObject({ views: 4, opens: 2 })

    const mine = await api(educator).get('/insights/engagement?mine=1')
    expect(mine.body.resources.every((x: { mine: boolean }) => x.mine)).toBe(true)

    const detail = await api(educator).get(`/insights/engagement/${r.id}?period=7`)
    expect(detail.body.totals).toEqual({ views: 4, opens: 1, people: 3 })
    expect(detail.body.daily).toHaveLength(7)
    const summed = detail.body.daily.reduce((n: { views: number; opens: number }, d: { views: number; opens: number }) => ({ views: n.views + d.views, opens: n.opens + d.opens }), { views: 0, opens: 0 })
    expect(summed).toEqual({ views: 4, opens: 1 })
  })
})

describe('S2-13-T04 rule changes alter recommendations', () => {
  it('validates, saves with history, changes scores and ranking, and resets', async () => {
    const goalFit = await insertResource(educator, { subject: SUBJECT, level: 'beginner', medium: 'article', goals: ['curiosity'], title: 'Rules goal fit' })
    const plain = await insertResource(educator, { subject: SUBJECT, level: 'beginner', medium: 'article', title: 'Rules plain fit' })
    const asker = await createUser('student')
    const id = (await submit(asker, { level: 'beginner', media: ['article'], goal: 'curiosity' })).body.id
    const scores = async () => {
      const items = (await api(asker).get(`/recommendations?responseId=${id}`)).body.items as { score: number; resource: { id: string } }[]
      return { goalFit: items.find((i) => i.resource.id === goalFit.id)!.score, plain: items.find((i) => i.resource.id === plain.id)!.score, first: items[0].resource.id }
    }

    // Defaults: level 2 + format 1 (+ goal 1)
    expect(await scores()).toMatchObject({ goalFit: 4, plain: 3 })

    expect((await api(admin).put('/admin/recommendation-rules', { weights: { subject: 3, level: 11, medium: 1, goal: 1 }, requireSubject: true })).status).toBe(400)
    expect((await api(admin).put('/admin/recommendation-rules', { weights: { subject: 3, level: 0, medium: 0, goal: 0 }, requireSubject: true })).status).toBe(400)
    expect((await api(admin).put('/admin/recommendation-rules', { weights: { subject: 3, level: 1.5, medium: 1, goal: 1 }, requireSubject: true })).status).toBe(400)
    expect((await api(professor).put('/admin/recommendation-rules', { weights: { subject: 3, level: 2, medium: 1, goal: 5 }, requireSubject: true })).status).toBe(403)

    const saved = await api(admin).put('/admin/recommendation-rules', { weights: { subject: 3, level: 1, medium: 1, goal: 5 }, requireSubject: true, note: 'Goals matter more' })
    expect(saved.status).toBe(200)
    // Applies to the next request, no restart
    expect(await scores()).toMatchObject({ goalFit: 7, plain: 2, first: goalFit.id })

    const current = await api(admin).get('/admin/recommendation-rules')
    expect(current.body.rules.weights.goal).toBe(5)
    expect(current.body.isDefault).toBe(false)
    expect(current.body.history[0]).toMatchObject({ action: 'update', note: 'Goals matter more' })

    // Subject no longer required: a matching subject now earns its weight
    await api(admin).put('/admin/recommendation-rules', { weights: { subject: 4, level: 2, medium: 1, goal: 1 }, requireSubject: false })
    expect(await scores()).toMatchObject({ goalFit: 8, plain: 7 })

    expect((await api(admin).post('/admin/recommendation-rules/reset')).status).toBe(200)
    expect(await scores()).toMatchObject({ goalFit: 4, plain: 3 })
    expect((await api(admin).get('/admin/recommendation-rules')).body.history[0].action).toBe('reset')
  })
})

describe('S2-14-T04 recommendation cards carry the right data', () => {
  it('returns title, type, level, description and a working link for each card', async () => {
    const r = await insertResource(educator, { subject: SUBJECT, level: 'beginner', medium: 'article', title: 'Card check', url: 'https://example.com/card' })
    await db.from('resources').update({ description: 'Shows on the card.' }).eq('id', r.id)
    const viewer = await createUser('student')
    await submit(viewer, { level: 'beginner', media: ['article'] })
    const res = await api(viewer).get('/recommendations')
    const card = res.body.items.find((i: { resource: { id: string } }) => i.resource.id === r.id)
    expect(card.resource).toMatchObject({ title: 'Card check', medium: 'article', level: 'beginner', description: 'Shows on the card.', url: 'https://example.com/card' })
    expect((await api(viewer).get(`/resources/${r.id}`)).body.resource.url).toBe('https://example.com/card')
  })
})
