import { Router, type Request } from 'express'
import { isGoal, isLevel, isMedium, isSubject } from '../../../shared/vocabulary.js'
import { currentUser, requireRole, requireUser, type CurrentUser } from '../lib/auth.js'
import { badRequest, check, forbidden, HttpError, notFound, text, maybe } from '../lib/http.js'
import { track } from '../lib/events.js'
import { db, RESOURCE_BUCKET } from '../lib/supabase.js'

export const resourcesRouter = Router()
resourcesRouter.use(['/library', '/resources', '/notifications'], requireUser)

const FIELDS = 'id, owner_id, title, description, url, file_path, subject, level, medium, goals, status, cloned_from, review_note, submitted_at, reviewed_at, created_at, updated_at'
const LIST_FIELDS = 'id, title, description, url, subject, level, medium, goals, status, review_note, submitted_at, created_at, updated_at'

type Resource = { id: string; owner_id: string; title: string; status: string; file_path: string | null; [k: string]: unknown }

export async function signedFileUrl(path: string | null) {
  if (!path) return null
  const { data } = await db.storage.from(RESOURCE_BUCKET).createSignedUrl(path, 60 * 60)
  return data?.signedUrl ?? null
}

async function loadResource(id: string) {
  const resource = maybe(await db.from('resources').select(FIELDS).eq('id', id).maybeSingle()) as Resource | null
  if (!resource) throw notFound('That resource')
  return resource
}

function assertOwner(resource: Resource, user: CurrentUser) {
  if (resource.owner_id !== user.id) throw notFound('That resource')
}

// S1-16 / S1-17 / S1-18 / S1-21: parse and validate the resource form.
// Drafts only need a title. Submitting for review needs a link or file and all three tags (S1-17-T04).
function parseResource(req: Request, user: CurrentUser, submitting: boolean) {
  const b = req.body ?? {}
  const title = text(b.title, 'Title', { max: 200 })
  const description = text(b.description, 'Description', { max: 4000, required: false })
  const url = text(b.url, 'Link', { max: 2000, required: false }) || null
  if (url && !/^https?:\/\//i.test(url)) throw badRequest('Links must start with http:// or https://')
  const filePath = typeof b.filePath === 'string' && b.filePath ? b.filePath : null
  if (filePath && !filePath.startsWith(`${user.id}/`)) throw badRequest('That file upload is not yours.')

  const subject = b.subject || null
  const level = b.level || null
  const medium = b.medium || null
  if (subject && !isSubject(subject)) throw badRequest('Choose a subject from the list.')
  if (level && !isLevel(level)) throw badRequest('Choose a level from the list.')
  if (medium && !isMedium(medium)) throw badRequest('Choose a format from the list.')
  const goals: string[] = Array.isArray(b.goals) ? [...new Set(b.goals as unknown[])].filter(isGoal) : []

  if (submitting) {
    if (!url && !filePath) throw badRequest('Add a link or upload a file before submitting.')
    if (!subject || !level || !medium) throw badRequest('Tag the subject, level and format before submitting.')
  }
  return { title, description, url, file_path: filePath, subject, level, medium, goals }
}

// S1-12-T01 Published library (professors; educators and admins can browse too)
resourcesRouter.get('/library', requireRole('professor', 'educator'), async (req, res) => {
  let query = db.from('resources').select(LIST_FIELDS).eq('status', 'published')
  for (const key of ['subject', 'level', 'medium'] as const) {
    if (typeof req.query[key] === 'string' && req.query[key]) query = query.eq(key, req.query[key])
  }
  if (typeof req.query.q === 'string' && req.query.q.trim()) query = query.ilike('title', `%${req.query.q.trim().replace(/[%_]/g, '')}%`)
  const resources = check(await query.order('title'))
  res.json({ resources })
})

// S1-19-T01 Everything this educator has created, any status
resourcesRouter.get('/resources/mine', requireRole('educator'), async (req, res) => {
  const user = currentUser(req)
  const resources = check(await db.from('resources').select(LIST_FIELDS + ', cloned_from').eq('owner_id', user.id).order('updated_at', { ascending: false }))
  res.json({ resources })
})

// S1-16-T03 / S1-21-T01 Create as a draft, or submit straight for review
resourcesRouter.post('/resources', requireRole('educator'), async (req, res) => {
  const user = currentUser(req)
  const submit = req.body?.submit === true
  const fields = parseResource(req, user, submit)
  const resource = check(
    await db
      .from('resources')
      .insert({ ...fields, owner_id: user.id, status: submit ? 'pending' : 'draft', submitted_at: submit ? new Date().toISOString() : null })
      .select(FIELDS)
      .single(),
  )
  if (submit) track('resource_submitted', user.id, { resourceId: resource.id })
  res.status(201).json({ resource })
})

// Resource detail: published resources for anyone signed in; drafts only for their owner or admins.
// Removed resources answer 410 so pages can say "no longer available" (S1-24-T03).
resourcesRouter.get('/resources/:id', async (req, res) => {
  const user = currentUser(req)
  const resource = await loadResource(String(req.params.id))
  const isOwner = resource.owner_id === user.id
  if (resource.status !== 'published' && !isOwner && user.role !== 'admin') {
    if (resource.status === 'removed') throw new HttpError(410, 'This resource is no longer available.', 'unavailable')
    throw notFound('That resource')
  }
  const ratings = check(await db.from('resource_feedback').select('rating').eq('resource_id', resource.id).not('rating', 'is', null))
  const average = ratings.length ? ratings.reduce((sum, r) => sum + (r.rating as number), 0) / ratings.length : null
  res.json({
    resource: { ...resource, file_url: await signedFileUrl(resource.file_path) },
    rating: { average, count: ratings.length },
    canEdit: isOwner && (user.role === 'educator' || user.role === 'admin'),
  })
})

// S1-18-T02 Ownership-checked updates.
// Editing a published resource sends it back to review so unreviewed changes never reach students;
// editing a rejected one turns it back into a draft.
resourcesRouter.patch('/resources/:id', requireRole('educator'), async (req, res) => {
  const user = currentUser(req)
  const existing = await loadResource(String(req.params.id))
  assertOwner(existing, user)
  if (existing.status === 'removed') throw forbidden('An admin removed this resource, so it can no longer be edited.')

  const submit = req.body?.submit === true
  const fields = parseResource(req, user, submit || existing.status === 'pending' || existing.status === 'published')
  const now = new Date().toISOString()
  let status = existing.status
  if (submit || existing.status === 'published') status = 'pending'
  else if (existing.status === 'rejected') status = 'draft'

  const resource = check(
    await db
      .from('resources')
      .update({ ...fields, status, updated_at: now, ...(status === 'pending' && existing.status !== 'pending' ? { submitted_at: now } : {}) })
      .eq('id', existing.id)
      .select(FIELDS)
      .single(),
  )
  if (status === 'pending' && existing.status !== 'pending') track('resource_submitted', user.id, { resourceId: existing.id })
  res.json({ resource })
})

// S1-21-T01 Draft (or rejected) -> pending review
resourcesRouter.post('/resources/:id/submit', requireRole('educator'), async (req, res) => {
  const user = currentUser(req)
  const existing = await loadResource(String(req.params.id))
  assertOwner(existing, user)
  if (existing.status !== 'draft' && existing.status !== 'rejected') throw badRequest('Only drafts can be submitted for review.')
  req.body = { ...existing, filePath: existing.file_path }
  parseResource(req, user, true)
  const resource = check(
    await db.from('resources').update({ status: 'pending', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', existing.id).select(FIELDS).single(),
  )
  track('resource_submitted', user.id, { resourceId: existing.id })
  res.json({ resource })
})

// S1-20-T01 Clone your own resource, or any published one, into a new independent draft
resourcesRouter.post('/resources/:id/clone', requireRole('educator'), async (req, res) => {
  const user = currentUser(req)
  const source = await loadResource(String(req.params.id))
  if (source.owner_id !== user.id && source.status !== 'published') throw notFound('That resource')
  const { title, description, url, file_path, subject, level, medium, goals } = source as Record<string, any>
  const resource = check(
    await db
      .from('resources')
      .insert({ title: `Copy of ${title}`.slice(0, 200), description, url, file_path, subject, level, medium, goals, owner_id: user.id, status: 'draft', cloned_from: source.id })
      .select(FIELDS)
      .single(),
  )
  res.status(201).json({ resource })
})

resourcesRouter.delete('/resources/:id', requireRole('educator'), async (req, res) => {
  const user = currentUser(req)
  const existing = await loadResource(String(req.params.id))
  assertOwner(existing, user)
  if (existing.status !== 'draft') throw badRequest('Only drafts can be deleted. Ask an admin to remove published resources.')
  check(await db.from('resources').delete().eq('id', existing.id))
  res.json({ ok: true })
})

// S1-22-T03 Notifications: only your own, and only read state can change
resourcesRouter.get('/notifications', async (req, res) => {
  const user = currentUser(req)
  const notifications = check(
    await db.from('notifications').select('id, type, message, resource_id, report_id, read_at, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
  )
  res.json({ notifications, unread: notifications.filter((n) => !n.read_at).length })
})

resourcesRouter.patch('/notifications/:id/read', async (req, res) => {
  const user = currentUser(req)
  const updated = check(await db.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', req.params.id).eq('user_id', user.id).select('id'))
  if (!updated.length) throw notFound('That notification')
  res.json({ ok: true })
})

resourcesRouter.post('/notifications/read-all', async (req, res) => {
  const user = currentUser(req)
  check(await db.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null))
  res.json({ ok: true })
})
