import { Router } from 'express'
import { currentUser, requireRole, requireUser, roles, type Role } from '../lib/auth.js'
import { badRequest, check, notFound, text, maybe } from '../lib/http.js'
import { eventTypes, track } from '../lib/events.js'
import { runHealthCheck, uptimeSeconds } from '../lib/monitor.js'
import { db } from '../lib/supabase.js'

export const adminRouter = Router()

// S1-28-T01 / S1-23-T03: admins only, and requireUser rejects suspended accounts
adminRouter.use(requireUser, requireRole('admin'))

const DAY = 24 * 60 * 60 * 1000
const since = (ms: number) => new Date(Date.now() - ms).toISOString()

// S1-23-T01 Protected user listing
adminRouter.get('/users', async (req, res) => {
  let query = db.from('profiles').select('id, email, display_name, role, account_status, created_at')
  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    const q = req.query.q.trim().replace(/[%_,()]/g, '')
    query = query.or(`email.ilike.%${q}%,display_name.ilike.%${q}%`)
  }
  const users = check(await query.order('created_at', { ascending: false }))
  res.json({ users })
})

// S1-23-T01 Suspend / reactivate. Suspension also bans the auth user so they cannot sign in again.
adminRouter.patch('/users/:id/status', async (req, res) => {
  const admin = currentUser(req)
  const status = req.body?.status
  if (status !== 'active' && status !== 'suspended') throw badRequest('Status must be active or suspended.')
  if (req.params.id === admin.id) throw badRequest("You can't change your own account status.")
  const user = maybe(await db.from('profiles').update({ account_status: status, updated_at: new Date().toISOString() }).eq('id', req.params.id).select('id, account_status').maybeSingle())
  if (!user) throw notFound('That user')
  const { error } = await db.auth.admin.updateUserById(req.params.id, { ban_duration: status === 'suspended' ? '876000h' : 'none' })
  if (error) throw new Error(error.message)
  res.json({ user })
})

// S1-28-T02 Authorized role changes (an admin can't change their own role, so there is always an admin)
adminRouter.patch('/users/:id/role', async (req, res) => {
  const admin = currentUser(req)
  const role = req.body?.role as Role
  if (!roles.includes(role)) throw badRequest('Choose a valid role.')
  if (req.params.id === admin.id) throw badRequest("You can't change your own role.")
  const user = maybe(await db.from('profiles').update({ role, updated_at: new Date().toISOString() }).eq('id', req.params.id).select('id, role').maybeSingle())
  if (!user) throw notFound('That user')
  res.json({ user })
})

// S1-24-T01 Admin resource management
adminRouter.get('/resources', async (req, res) => {
  let query = db.from('resources').select('id, title, subject, level, medium, status, created_at, updated_at, owner:profiles!resources_owner_id_fkey(email, display_name)')
  if (typeof req.query.status === 'string' && req.query.status) query = query.eq('status', req.query.status)
  if (typeof req.query.q === 'string' && req.query.q.trim()) query = query.ilike('title', `%${req.query.q.trim().replace(/[%_]/g, '')}%`)
  const resources = check(await query.order('updated_at', { ascending: false }))
  res.json({ resources })
})

// Unpublish (removed) or restore (published). Removed resources stay in lists and favorites as "no longer available".
adminRouter.patch('/resources/:id', async (req, res) => {
  const status = req.body?.status
  if (status !== 'removed' && status !== 'published') throw badRequest('Status must be removed or published.')
  const resource = maybe(await db.from('resources').update({ status, updated_at: new Date().toISOString() }).eq('id', req.params.id).select('id, status').maybeSingle())
  if (!resource) throw notFound('That resource')
  res.json({ resource })
})

adminRouter.delete('/resources/:id', async (req, res) => {
  const deleted = check(await db.from('resources').delete().eq('id', req.params.id).select('id'))
  if (!deleted.length) throw notFound('That resource')
  res.json({ ok: true })
})

// S1-26-T01 Pending queue, oldest first
adminRouter.get('/submissions', async (_req, res) => {
  const submissions = check(
    await db
      .from('resources')
      .select('id, title, description, url, file_path, subject, level, medium, goals, submitted_at, owner:profiles!resources_owner_id_fkey(email, display_name)')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true }),
  )
  res.json({ submissions })
})

// S1-25-T01 / S1-25-T03 Approve publishes immediately; reject keeps it out of the library and recommendations
async function decide(id: string, adminId: string, approve: boolean, note: string | null) {
  const resource = maybe(
    await db
      .from('resources')
      .update({ status: approve ? 'published' : 'rejected', review_note: note, reviewed_by: adminId, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id, owner_id, title, status')
      .maybeSingle(),
  )
  if (!resource) throw notFound('That pending submission')
  check(
    await db.from('notifications').insert({
      user_id: resource.owner_id,
      type: approve ? 'submission_approved' : 'submission_rejected',
      resource_id: resource.id,
      message: approve ? `"${resource.title}" was approved and is now published.` : `"${resource.title}" was not approved: ${note}`,
    }),
  )
  if (approve) track('resource_approved', adminId, { resourceId: resource.id })
  return resource
}

adminRouter.post('/submissions/:id/approve', async (req, res) => {
  res.json({ resource: await decide(req.params.id, currentUser(req).id, true, null) })
})

adminRouter.post('/submissions/:id/reject', async (req, res) => {
  const note = text(req.body?.note, 'A reason', { max: 1000 })
  res.json({ resource: await decide(req.params.id, currentUser(req).id, false, note) })
})

// S1-27-T01 Report retrieval and resolution
adminRouter.get('/reports', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : 'open'
  const reports = check(
    await db
      .from('reports')
      .select('id, reason, details, status, resolution_note, resolved_at, created_at, resource:resources(id, title, status, url), reporter:profiles!reports_reporter_id_fkey(email, display_name)')
      .eq('status', status)
      .order('created_at', { ascending: status === 'open' }),
  )
  res.json({ reports })
})

// S1-27-T03 Close a report, optionally removing the resource (owner is told either way it was removed)
adminRouter.post('/reports/:id/resolve', async (req, res) => {
  const admin = currentUser(req)
  const outcome = req.body?.outcome
  if (outcome !== 'resolved' && outcome !== 'dismissed') throw badRequest('Outcome must be resolved or dismissed.')
  const note = text(req.body?.note, 'Note', { max: 1000, required: false }) || null
  const removeResource = req.body?.removeResource === true && outcome === 'resolved'

  const report = maybe(
    await db
      .from('reports')
      .update({ status: outcome, resolution_note: note, resolved_by: admin.id, resolved_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('status', 'open')
      .select('id, status, resource_id')
      .maybeSingle(),
  )
  if (!report) throw notFound('That open report')

  if (removeResource) {
    const resource = check(await db.from('resources').update({ status: 'removed', updated_at: new Date().toISOString() }).eq('id', report.resource_id).select('id, owner_id, title').single())
    check(
      await db.from('notifications').insert({
        user_id: resource.owner_id,
        type: 'resource_removed',
        resource_id: resource.id,
        report_id: report.id,
        message: `"${resource.title}" was removed after review${note ? `: ${note}` : '.'}`,
      }),
    )
  }
  res.json({ report, resourceRemoved: removeResource })
})

// S1-29-T03 Admin-only monitoring view
adminRouter.get('/monitoring', async (_req, res) => {
  const [current, checks, alerts] = await Promise.all([
    runHealthCheck(),
    db.from('uptime_checks').select('ok, response_ms, detail, created_at').gte('created_at', since(DAY)).order('created_at', { ascending: false }).limit(1440),
    db.from('alerts').select('id, rule, message, delivery_status, delivered_at, created_at').order('created_at', { ascending: false }).limit(20),
  ])
  const rows = check(checks)
  const passed = rows.filter((c) => c.ok)
  res.json({
    current: { ...current, uptimeSeconds: uptimeSeconds() },
    last24h: {
      checks: rows.length,
      uptimePercent: rows.length ? Math.round((passed.length / rows.length) * 1000) / 10 : null,
      avgResponseMs: passed.length ? Math.round(passed.reduce((s, c) => s + c.response_ms, 0) / passed.length) : null,
    },
    recentChecks: rows.slice(0, 30),
    alerts: check(alerts),
  })
})

// S1-30-T02 Usage analytics
adminRouter.get('/analytics', async (_req, res) => {
  const [profiles, events] = await Promise.all([
    db.from('profiles').select('role, created_at'),
    db.from('usage_events').select('event_type, user_id, created_at').gte('created_at', since(30 * DAY)).limit(50000),
  ])
  const people = check(profiles)
  const recent = check(events)

  const usersByRole = Object.fromEntries(roles.map((r) => [r, people.filter((p) => p.role === r).length]))
  const totals = Object.fromEntries(eventTypes.map((t) => [t, recent.filter((e) => e.event_type === t).length]))
  const activeUsers7d = new Set(recent.filter((e) => e.user_id && e.created_at >= since(7 * DAY)).map((e) => e.user_id)).size

  const days = Array.from({ length: 14 }, (_, i) => new Date(Date.now() - (13 - i) * DAY).toISOString().slice(0, 10))
  const daily = days.map((day) => ({
    day,
    signups: people.filter((p) => p.created_at.slice(0, 10) === day).length,
    questionnaires: recent.filter((e) => e.event_type === 'questionnaire_submitted' && e.created_at.slice(0, 10) === day).length,
    favorites: recent.filter((e) => e.event_type === 'favorite_added' && e.created_at.slice(0, 10) === day).length,
  }))

  res.json({
    users: { total: people.length, byRole: usersByRole, new7d: people.filter((p) => p.created_at >= since(7 * DAY)).length, active7d: activeUsers7d },
    last30d: totals,
    daily,
  })
})

// S1-31-T02 Protected error-log retrieval
adminRouter.get('/errors', async (req, res) => {
  let query = db.from('error_logs').select('id, level, message, route, user_id, context, created_at')
  if (req.query.level === 'error' || req.query.level === 'critical') query = query.eq('level', req.query.level)
  const errors = check(await query.order('created_at', { ascending: false }).limit(100))
  res.json({ errors })
})
