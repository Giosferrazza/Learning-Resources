import { Router } from 'express'
import { isSupportCategory, supportCategories } from '../../../shared/vocabulary.js'
import { currentUser, optionalUser, requireRole, requireUser } from '../lib/auth.js'
import { badRequest, check, maybe, notFound, text, uuidParam } from '../lib/http.js'
import { db } from '../lib/supabase.js'

export const supportRouter = Router()

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FIELDS = 'id, name, email, category, subject, message, status, resolution_note, resolved_at, created_at'

// S2-02-T02 Store a support request and deliver it to every admin's notifications.
// Anyone can write in; signed-in people are linked to their account and can follow it up.
supportRouter.post('/support', optionalUser, async (req, res) => {
  const b = req.body ?? {}
  // Bots fill every field, people never see this one
  if (typeof b.website === 'string' && b.website) {
    res.status(201).json({ request: null })
    return
  }
  const user = req.user
  const name = text(b.name ?? user?.displayName, 'Name', { max: 120, required: false })
  const email = user?.email ?? text(b.email, 'Email', { max: 254 })
  if (!EMAIL.test(email)) throw badRequest('Enter a valid email address so we can reply.')
  if (!isSupportCategory(b.category)) throw badRequest('Choose what your request is about.')
  const subject = text(b.subject, 'Subject', { max: 150 })
  const message = text(b.message, 'Message', { max: 4000 })
  if (message.length < 10) throw badRequest('Describe the problem in at least 10 characters.')

  const request = check(
    await db.from('support_requests').insert({ user_id: user?.id ?? null, name, email, category: b.category, subject, message }).select(FIELDS).single(),
  )
  const admins = check(await db.from('profiles').select('id').eq('role', 'admin').eq('account_status', 'active'))
  if (admins.length) {
    check(
      await db.from('notifications').insert(
        admins.map((a) => ({ user_id: a.id, type: 'support_request', message: `New support request (${supportCategories[b.category as keyof typeof supportCategories]}): ${subject}` })),
      ),
    )
  }
  res.status(201).json({ request })
})

// My own requests and their status
supportRouter.get('/support/mine', requireUser, async (req, res) => {
  const user = currentUser(req)
  const requests = check(await db.from('support_requests').select(FIELDS).eq('user_id', user.id).order('created_at', { ascending: false }).limit(50))
  res.json({ requests })
})

// S2-02-T03 Admin request list and resolution. Resolving tells the person (if they have an account).
supportRouter.get('/admin/support', requireUser, requireRole('admin'), async (req, res) => {
  let query = db.from('support_requests').select(FIELDS + ', user_id')
  if (req.query.status === 'open' || req.query.status === 'resolved') query = query.eq('status', req.query.status)
  const requests = check(await query.order('created_at', { ascending: false }).limit(200))
  const { count } = await db.from('support_requests').select('id', { count: 'exact', head: true }).eq('status', 'open')
  res.json({ requests, open: count ?? 0 })
})

supportRouter.post('/admin/support/:id/resolve', requireUser, requireRole('admin'), async (req, res) => {
  const admin = currentUser(req)
  const note = text(req.body?.note, 'A reply', { max: 2000 })
  const request = maybe(
    await db
      .from('support_requests')
      .update({ status: 'resolved', resolution_note: note, resolved_by: admin.id, resolved_at: new Date().toISOString() })
      .eq('id', uuidParam(req.params.id, 'That support request'))
      .eq('status', 'open')
      .select(FIELDS + ', user_id')
      .maybeSingle(),
  ) as ({ user_id: string | null; subject: string } & Record<string, unknown>) | null
  if (!request) throw notFound('That open support request')
  if (request.user_id) {
    check(await db.from('notifications').insert({ user_id: request.user_id, type: 'support_resolved', message: `Your support request "${request.subject}" was resolved: ${note}` }))
  }
  res.json({ request })
})
