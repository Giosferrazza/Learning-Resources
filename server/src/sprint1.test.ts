import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { raiseAlert, resetAlertState } from './lib/alerts'
import { logError, redact } from './lib/errorLog'
import { recordCheck, resetMonitorState } from './lib/monitor'
import { db, freshClient } from './lib/supabase'
import { api, cleanupUsers, createUser, insertResource, PASSWORD, signIn, wait, type TestUser } from './test/helpers'

// Integration tests for the Sprint 1 T04 "verify" tasks.
// Needs local Supabase running (`npx supabase start`) and server/.env filled in.

let student: TestUser, otherStudent: TestUser, professor: TestUser, educator: TestUser, otherEducator: TestUser, admin: TestUser

beforeAll(async () => {
  ;[student, otherStudent, professor, educator, otherEducator, admin] = await Promise.all([
    createUser('student'),
    createUser('student'),
    createUser('professor'),
    createUser('educator'),
    createUser('educator'),
    createUser('admin'),
  ])
})

afterAll(cleanupUsers)

describe('S1-29 health', () => {
  it('reports the database is up with a response time', async () => {
    const res = await api().get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true, database: 'up' })
    expect(typeof res.body.responseMs).toBe('number')
  })
})

describe('S1-01-T04 account creation end to end', () => {
  it('creates a profile with the chosen role on sign-up', async () => {
    const me = await api(professor).get('/me')
    expect(me.status).toBe(200)
    expect(me.body.profile).toMatchObject({ email: professor.email, role: 'professor', display_name: 'professor tester' })
  })

  it('never lets people sign themselves up as admin', async () => {
    const email = `wannabe-${Date.now()}@sprint1.test`
    const { data } = await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { role: 'admin' } })
    const { data: profile } = await db.from('profiles').select('role').eq('id', data.user!.id).single()
    expect(profile?.role).toBe('student')
    await db.auth.admin.deleteUser(data.user!.id)
  })
})

describe('S1-02-T04 login and logout isolation', () => {
  it('rejects requests without a session', async () => {
    expect((await api().get('/me')).status).toBe(401)
    expect((await api().get('/favorites')).status).toBe(401)
  })

  it('rejects a signed-out session', async () => {
    const user = await createUser('student')
    const client = freshClient()
    const { data } = await client.auth.signInWithPassword({ email: user.email, password: PASSWORD })
    const token = data.session!.access_token
    expect((await api({ ...user, token }).get('/me')).status).toBe(200)
    await client.auth.signOut()
    expect((await api({ ...user, token }).get('/me')).status).toBe(401)
  })

  it("keeps one user's data away from another", async () => {
    const list = await api(student).post('/lists', { name: 'Private list' })
    expect((await api(otherStudent).get(`/lists/${list.body.list.id}`)).status).toBe(404)
  })
})

describe('S1-03-T04 changed credentials', () => {
  it('requires the current password and swaps old for new', async () => {
    const user = await createUser('student')
    const wrong = await api(user).post('/account/password', { currentPassword: 'nope-nope', newPassword: 'brand-new-pass' })
    expect(wrong.status).toBe(400)
    expect(wrong.body.code).toBe('wrong_password')

    const short = await api(user).post('/account/password', { currentPassword: PASSWORD, newPassword: 'short' })
    expect(short.status).toBe(400)

    const ok = await api(user).post('/account/password', { currentPassword: PASSWORD, newPassword: 'brand-new-pass' })
    expect(ok.status).toBe(200)
    await expect(signIn(user.email)).rejects.toThrow()
    await expect(signIn(user.email, 'brand-new-pass')).resolves.toBeTruthy()
  })
})

describe('S1-04-T04 profile and email changes', () => {
  it('saves and reloads the display name', async () => {
    const res = await api(student).patch('/profile', { displayName: '  Renamed Student  ' })
    expect(res.status).toBe(200)
    expect((await api(student).get('/me')).body.profile.display_name).toBe('Renamed Student')
    expect((await api(student).patch('/profile', { displayName: '' })).status).toBe(400)
  })

  it('syncs a confirmed email change into the profile', async () => {
    const user = await createUser('student')
    const email = `changed-${Date.now()}@sprint1.test`
    await db.auth.admin.updateUserById(user.id, { email, email_confirm: true })
    expect((await api(user).get('/me')).body.profile.email).toBe(email)
  })
})

describe('S1-05-T04 complete recovery flow', () => {
  it('sends a reset email for a real account', async () => {
    const user = await createUser('student')
    const { error } = await freshClient().auth.resetPasswordForEmail(user.email, { redirectTo: 'http://localhost:5173/reset-password' })
    expect(error).toBeNull()
    let found = 0
    for (let i = 0; i < 20 && !found; i++) {
      await wait(250)
      const mail = await fetch(`http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent(`to:${user.email}`)}`).then((r) => r.json())
      found = mail.messages_count ?? 0
    }
    expect(found).toBeGreaterThan(0)
  })
})

describe('S1-06-T04 onboarding behavior', () => {
  it('shows the walkthrough once', async () => {
    const user = await createUser('student')
    expect((await api(user).get('/me')).body.profile.walkthrough_completed_at).toBeNull()
    await api(user).post('/profile/walkthrough-complete')
    const first = (await api(user).get('/me')).body.profile.walkthrough_completed_at
    expect(first).toBeTruthy()
    await api(user).post('/profile/walkthrough-complete')
    expect((await api(user).get('/me')).body.profile.walkthrough_completed_at).toBe(first)
  })
})

describe('S1-07 / S1-33 / S1-34 / S1-35 questionnaire to recommendations', () => {
  it('validates answers', async () => {
    expect((await api(student).post('/questionnaire', { topic: 'basket-weaving', level: 'beginner', media: [] })).status).toBe(400)
    expect((await api(student).post('/questionnaire', { topic: 'design', level: 'expert', media: [] })).status).toBe(400)
  })

  it('S1-07-T04 returns exact matches with explanations', async () => {
    const r = await insertResource(educator, { subject: 'design', level: 'advanced', medium: 'tool', goals: ['career'], title: 'Exact design tool' })
    const q = await api(student).post('/questionnaire', { topic: 'design', level: 'advanced', media: ['tool'], goal: 'career' })
    expect(q.status).toBe(201)
    const recs = await api(student).get('/recommendations')
    expect(recs.status).toBe(200)
    expect(recs.body.exact).toBe(true)
    const item = recs.body.items.find((i: any) => i.resource.id === r.id)
    expect(item.reasons).toContain('Fits your goal: Build a career skill') // S1-34
  })

  it('S1-35-T04 falls back to closest matches and never shows drafts', async () => {
    await insertResource(educator, { subject: 'business', level: 'advanced', medium: 'video', title: 'Closest business video' })
    await insertResource(educator, { subject: 'business', level: 'intermediate', medium: 'article', status: 'draft', title: 'Draft business article' })
    await api(student).post('/questionnaire', { topic: 'business', level: 'intermediate', media: ['article'] })
    const recs = await api(student).get('/recommendations')
    expect(recs.body.exact).toBe(false)
    const titles = recs.body.items.map((i: any) => i.resource.title)
    expect(titles).toContain('Closest business video')
    expect(titles).not.toContain('Draft business article') // S1-21-T03
  })

  it('asks for a questionnaire first', async () => {
    const fresh = await createUser('student')
    expect((await api(fresh).get('/recommendations')).body.code).toBe('no_questionnaire')
  })
})

describe('S1-08-T04 / S1-36-T04 favorites', () => {
  it('saves and unsaves resources and recommendation lists, per user', async () => {
    const r = await insertResource(educator)
    const fav = await api(student).post('/favorites', { resourceId: r.id })
    expect(fav.status).toBe(201)
    expect((await api(student).post('/favorites', { resourceId: r.id })).status).toBe(200) // idempotent

    const list = await api(student).post('/lists', { name: 'My recommendations', resourceIds: [r.id] })
    const listFav = await api(student).post('/favorites', { listId: list.body.list.id })
    expect(listFav.status).toBe(201)

    const mine = await api(student).get('/favorites')
    expect(mine.body.favorites.some((f: any) => f.resource?.id === r.id)).toBe(true)
    expect(mine.body.favorites.some((f: any) => f.list?.id === list.body.list.id && f.list.itemCount === 1)).toBe(true)
    expect((await api(otherStudent).get('/favorites')).body.favorites.some((f: any) => f.resource?.id === r.id)).toBe(false)

    expect((await api(otherStudent).delete(`/favorites/${fav.body.favorite.id}`)).status).toBe(404)
    expect((await api(student).delete(`/favorites/${fav.body.favorite.id}`)).status).toBe(200)
  })

  it('keeps removed resources as unavailable', async () => {
    const r = await insertResource(educator)
    await api(student).post('/favorites', { resourceId: r.id })
    await db.from('resources').update({ status: 'removed' }).eq('id', r.id)
    const fav = (await api(student).get('/favorites')).body.favorites.find((f: any) => f.resource?.id === r.id)
    expect(fav.resource.available).toBe(false)
  })
})

describe('S1-09-T04 rating and feedback', () => {
  it('validates and updates one feedback per person', async () => {
    const r = await insertResource(educator)
    expect((await api(student).post(`/resources/${r.id}/feedback`, { rating: 9 })).status).toBe(400)
    expect((await api(student).post(`/resources/${r.id}/feedback`, {})).status).toBe(400)
    expect((await api(student).post(`/resources/${r.id}/feedback`, { rating: 4, comment: 'Helpful' })).status).toBe(201)
    await api(student).post(`/resources/${r.id}/feedback`, { rating: 5 })
    const mine = await api(student).get(`/resources/${r.id}/feedback/mine`)
    expect(mine.body.feedback).toMatchObject({ rating: 5, comment: '' })
    const detail = await api(otherStudent).get(`/resources/${r.id}`)
    expect(detail.body.rating).toEqual({ average: 5, count: 1 })
  })
})

describe('S1-10-T04 / S1-22-T04 reporting and flag notifications', () => {
  it('stores the report, blocks duplicates and notifies the owner', async () => {
    const r = await insertResource(educator, { title: 'Broken thing' })
    expect((await api(student).post(`/resources/${r.id}/reports`, { reason: 'nonsense' })).status).toBe(400)
    const report = await api(student).post(`/resources/${r.id}/reports`, { reason: 'broken_link', details: '404s' })
    expect(report.status).toBe(201)
    expect(report.body.report.status).toBe('open')
    expect((await api(student).post(`/resources/${r.id}/reports`, { reason: 'broken_link' })).status).toBe(409)

    const inbox = await api(educator).get('/notifications')
    const n = inbox.body.notifications.find((x: any) => x.resource_id === r.id && x.type === 'content_flagged')
    expect(n.message).toContain('Broken thing')
    expect(n.read_at).toBeNull()

    expect((await api(otherEducator).patch(`/notifications/${n.id}/read`)).status).toBe(404)
    expect((await api(educator).patch(`/notifications/${n.id}/read`)).status).toBe(200)
    const after = (await api(educator).get('/notifications')).body.notifications.find((x: any) => x.id === n.id)
    expect(after.read_at).toBeTruthy()
  })
})

describe('S1-11-T04 / S1-12-T04 professor access and library', () => {
  it('lets professors browse the published library and blocks students', async () => {
    const published = await insertResource(educator, { title: 'Library published item' })
    const draft = await insertResource(educator, { title: 'Library draft item', status: 'draft' })
    const lib = await api(professor).get('/library')
    expect(lib.status).toBe(200)
    const ids = lib.body.resources.map((r: any) => r.id)
    expect(ids).toContain(published.id)
    expect(ids).not.toContain(draft.id)
    expect((await api(student).get('/library')).status).toBe(403)
    expect((await api(professor).post('/questionnaire', { topic: 'python', level: 'beginner', media: [] })).status).toBe(201)
  })
})

describe('S1-13-T04 / S1-14-T04 / S1-15-T04 curated lists', () => {
  it('renames, edits, removes items safely and shares read-only', async () => {
    const a = await insertResource(educator, { title: 'List item A' })
    const b = await insertResource(educator, { title: 'List item B' })
    const created = await api(professor).post('/lists', { name: 'Week 1' })
    const id = created.body.list.id

    expect((await api(professor).patch(`/lists/${id}`, { name: 'Week 1: Basics' })).body.list.name).toBe('Week 1: Basics')
    await api(professor).post(`/lists/${id}/items`, { resourceId: a.id })
    await api(professor).post(`/lists/${id}/items`, { resourceId: b.id })
    expect((await api(professor).get(`/lists/${id}`)).body.list.items).toHaveLength(2)

    expect((await api(student).delete(`/lists/${id}/items/${a.id}`)).status).toBe(404)
    expect((await api(professor).delete(`/lists/${id}/items/${a.id}`)).body.remaining).toBe(1)

    const share = await api(professor).post(`/lists/${id}/share`)
    const shared = await api().get(`/shared/${share.body.shareToken}`)
    expect(shared.status).toBe(200)
    expect(shared.body.list.resources.map((r: any) => r.title)).toEqual(['List item B'])

    expect((await api(professor).delete(`/lists/${id}/items/${b.id}`)).body.remaining).toBe(0)
    await api(professor).delete(`/lists/${id}/share`)
    expect((await api().get(`/shared/${share.body.shareToken}`)).status).toBe(404)
    expect((await api().get('/shared/not-a-token')).status).toBe(404)
  })
})

describe('S1-16 / S1-17 / S1-21 / S1-25 / S1-26 upload, review and publish', () => {
  it('runs a resource from draft to published', async () => {
    expect((await api(student).post('/resources', { title: 'Nope' })).status).toBe(403)

    const draft = await api(educator).post('/resources', { title: 'Untagged draft' })
    expect(draft.status).toBe(201)
    expect(draft.body.resource.status).toBe('draft')

    // S1-17-T04 tags are required before review
    expect((await api(educator).post(`/resources/${draft.body.resource.id}/submit`)).status).toBe(400)
    expect((await api(educator).post('/resources', { title: 'Bad tag', subject: 'astrology' })).status).toBe(400)

    const submitted = await api(educator).patch(`/resources/${draft.body.resource.id}`, {
      title: 'Tagged resource',
      url: 'https://example.com/tagged',
      subject: 'databases',
      level: 'advanced',
      medium: 'tool',
      goals: ['career'],
      submit: true,
    })
    expect(submitted.body.resource.status).toBe('pending')
    const id = submitted.body.resource.id

    const queue = await api(admin).get('/admin/submissions')
    expect(queue.body.submissions.some((s: any) => s.id === id)).toBe(true)
    expect((await api(educator).get('/admin/submissions')).status).toBe(403)
    expect((await api(professor).get('/library')).body.resources.some((r: any) => r.id === id)).toBe(false)

    expect((await api(admin).post(`/admin/submissions/${id}/approve`)).body.resource.status).toBe('published')
    expect((await api(professor).get('/library')).body.resources.some((r: any) => r.id === id)).toBe(true)
    const inbox = (await api(educator).get('/notifications')).body.notifications
    expect(inbox.some((n: any) => n.resource_id === id && n.type === 'submission_approved')).toBe(true)
  })

  it('S1-25-T04 rejects with a reason and keeps it unpublished', async () => {
    const r = await api(educator).post('/resources', { title: 'To reject', url: 'https://example.com', subject: 'excel', level: 'beginner', medium: 'video', submit: true })
    const id = r.body.resource.id
    expect((await api(admin).post(`/admin/submissions/${id}/reject`, {})).status).toBe(400)
    const rejected = await api(admin).post(`/admin/submissions/${id}/reject`, { note: 'Link is paywalled' })
    expect(rejected.body.resource.status).toBe('rejected')
    expect((await api(admin).post(`/admin/submissions/${id}/approve`)).status).toBe(404)
    const mine = (await api(educator).get('/resources/mine')).body.resources.find((x: any) => x.id === id)
    expect(mine.review_note).toBe('Link is paywalled')
  })
})

describe('S1-18-T04 / S1-19-T04 / S1-20-T04 editing, submissions and cloning', () => {
  it('sends edited published resources back to review and blocks other educators', async () => {
    const r = await insertResource(educator, { title: 'Published original' })
    expect((await api(otherEducator).patch(`/resources/${r.id}`, { title: 'Hijack' })).status).toBe(404)
    const edited = await api(educator).patch(`/resources/${r.id}`, { title: 'Published, edited', url: 'https://example.com', subject: 'statistics', level: 'beginner', medium: 'video' })
    expect(edited.body.resource.status).toBe('pending')
  })

  it('lists only my submissions', async () => {
    const mine = await insertResource(educator, { title: 'Mine', status: 'draft' })
    const theirs = await insertResource(otherEducator, { title: 'Theirs', status: 'draft' })
    const ids = (await api(educator).get('/resources/mine')).body.resources.map((r: any) => r.id)
    expect(ids).toContain(mine.id)
    expect(ids).not.toContain(theirs.id)
  })

  it('clones into an independent draft, never someone else’s draft', async () => {
    const source = await insertResource(educator, { title: 'Source' })
    const clone = await api(otherEducator).post(`/resources/${source.id}/clone`)
    expect(clone.status).toBe(201)
    expect(clone.body.resource).toMatchObject({ title: 'Copy of Source', status: 'draft', cloned_from: source.id, owner_id: otherEducator.id })
    await api(otherEducator).patch(`/resources/${clone.body.resource.id}`, { title: 'Changed copy' })
    const { data } = await db.from('resources').select('title').eq('id', source.id).single()
    expect(data?.title).toBe('Source')

    const privateDraft = await insertResource(educator, { status: 'draft' })
    expect((await api(otherEducator).post(`/resources/${privateDraft.id}/clone`)).status).toBe(404)
  })
})

describe('S1-23-T04 access management', () => {
  it('suspends and reactivates immediately', async () => {
    const user = await createUser('student')
    expect((await api(admin).patch(`/admin/users/${admin.id}/status`, { status: 'suspended' })).status).toBe(400)
    expect((await api(student).patch(`/admin/users/${user.id}/status`, { status: 'suspended' })).status).toBe(403)

    await api(admin).patch(`/admin/users/${user.id}/status`, { status: 'suspended' })
    const blocked = await api(user).get('/me')
    expect(blocked.status).toBe(403)
    expect(blocked.body.code).toBe('account_suspended')
    await expect(signIn(user.email)).rejects.toThrow()

    await api(admin).patch(`/admin/users/${user.id}/status`, { status: 'active' })
    expect((await api(user).get('/me')).status).toBe(200)
    await expect(signIn(user.email)).resolves.toBeTruthy()
  })
})

describe('S1-24-T04 / S1-27-T04 collection management and moderation', () => {
  it('removes a reported resource and tells the owner', async () => {
    const r = await insertResource(educator, { title: 'Reported resource' })
    const report = await api(otherStudent).post(`/resources/${r.id}/reports`, { reason: 'inappropriate' })
    const open = await api(admin).get('/admin/reports')
    expect(open.body.reports.some((x: any) => x.id === report.body.report.id)).toBe(true)

    const resolved = await api(admin).post(`/admin/reports/${report.body.report.id}/resolve`, { outcome: 'resolved', note: 'Off topic', removeResource: true })
    expect(resolved.body.resourceRemoved).toBe(true)
    expect((await api(student).get(`/resources/${r.id}`)).status).toBe(410)
    const inbox = (await api(educator).get('/notifications')).body.notifications
    expect(inbox.some((n: any) => n.resource_id === r.id && n.type === 'resource_removed')).toBe(true)

    expect((await api(admin).patch(`/admin/resources/${r.id}`, { status: 'published' })).body.resource.status).toBe('published')
    expect((await api(student).get(`/resources/${r.id}`)).status).toBe(200)
  })
})

describe('S1-28-T04 role changes', () => {
  it('takes effect on the next request', async () => {
    const user = await createUser('student')
    expect((await api(user).get('/library')).status).toBe(403)
    expect((await api(admin).patch(`/admin/users/${user.id}/role`, { role: 'professor' })).status).toBe(200)
    expect((await api(user).get('/library')).status).toBe(200)
    expect((await api(admin).patch(`/admin/users/${admin.id}/role`, { role: 'student' })).status).toBe(400)
    expect((await api(admin).patch(`/admin/users/${user.id}/role`, { role: 'superuser' })).status).toBe(400)
  })
})

describe('S1-29-T04 / S1-32-T04 failure detection, alerts and recovery', () => {
  it('alerts once on outage and once on recovery', async () => {
    resetAlertState()
    resetMonitorState()
    await recordCheck({ ok: false, responseMs: 5000, detail: 'test outage' })
    await recordCheck({ ok: false, responseMs: 5000, detail: 'test outage' })
    await recordCheck({ ok: false, responseMs: 5000, detail: 'test outage' })
    await recordCheck({ ok: true, responseMs: 12, detail: null })

    const monitoring = await api(admin).get('/admin/monitoring')
    expect(monitoring.status).toBe(200)
    const rules = monitoring.body.alerts.slice(0, 2).map((a: any) => a.rule)
    expect(rules).toEqual(['recovery', 'outage'])
    const inbox = (await api(admin).get('/notifications')).body.notifications
    expect(inbox.some((n: any) => n.type === 'alert_outage')).toBe(true)
  })

  it('suppresses duplicate alerts', async () => {
    resetAlertState()
    expect(await raiseAlert('critical_error', 'same thing', 'dup-test')).toBe(true)
    expect(await raiseAlert('critical_error', 'same thing', 'dup-test')).toBe(false)
  })

  it('alerts on critical errors', async () => {
    resetAlertState()
    await logError('critical', 'Test critical failure')
    const { data } = await db.from('alerts').select('rule, message').order('created_at', { ascending: false }).limit(1).single()
    expect(data).toMatchObject({ rule: 'critical_error', message: 'Test critical failure' })
  })
})

describe('S1-30-T04 analytics accuracy', () => {
  it('counts recorded events', async () => {
    const before = (await api(admin).get('/admin/analytics')).body.last30d.questionnaire_submitted
    await api(otherStudent).post('/questionnaire', { topic: 'excel', level: 'beginner', media: [] })
    await wait(300)
    const after = await api(admin).get('/admin/analytics')
    expect(after.body.last30d.questionnaire_submitted).toBe(before + 1)
    expect(after.body.daily).toHaveLength(14)
    expect((await api(student).get('/admin/analytics')).status).toBe(403)
  })
})

describe('S1-31-T04 diagnostic flow', () => {
  it('redacts secrets and shows errors to admins only', async () => {
    expect(redact({ password: 'hunter2', nested: { accessToken: 'abc', ok: 1 } })).toEqual({ password: '[redacted]', nested: { accessToken: '[redacted]', ok: 1 } })
    await logError('error', 'Test diagnostic error', { route: 'GET /test', context: { apiKey: 'secret', id: 7 } })
    const errors = await api(admin).get('/admin/errors')
    const entry = errors.body.errors.find((e: any) => e.message === 'Test diagnostic error')
    expect(entry.context).toEqual({ apiKey: '[redacted]', id: 7 })
    expect((await api(educator).get('/admin/errors')).status).toBe(403)
  })
})
