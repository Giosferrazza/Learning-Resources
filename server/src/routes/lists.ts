import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { currentUser, requireUser } from '../lib/auth'
import { badRequest, check, notFound, text, maybe } from '../lib/http'
import { track } from '../lib/events'
import { db } from '../lib/supabase'

export const listsRouter = Router()
listsRouter.use(['/favorites', '/lists'], requireUser)

const SUMMARY = 'id, title, subject, level, medium, status, owner_id'
type Summary = { id: string; title: string; subject: string | null; level: string | null; medium: string | null; status: string; owner_id: string }

// S1-24-T03 / S1-36-T03: anything no longer published shows as unavailable instead of disappearing
const present = (r: Summary | null, viewerId?: string) =>
  r && (r.status === 'published' || r.owner_id === viewerId)
    ? { id: r.id, title: r.title, subject: r.subject, level: r.level, medium: r.medium, available: true }
    : { id: r?.id ?? null, title: r?.title ?? 'Removed resource', subject: null, level: null, medium: null, available: false }

async function ownedList(listId: string, userId: string) {
  const list = maybe(await db.from('lists').select('id, owner_id, name, share_token, created_at, updated_at').eq('id', listId).maybeSingle())
  if (!list || list.owner_id !== userId) throw notFound('That list')
  return list
}

async function publishedIds(ids: string[]) {
  if (!ids.length) return []
  const rows = check(await db.from('resources').select('id').in('id', ids).eq('status', 'published'))
  return rows.map((r) => r.id as string)
}

// S1-36-T01 Current-user favorites (resources and saved lists)
listsRouter.get('/favorites', async (req, res) => {
  const user = currentUser(req)
  const rows = check(
    await db
      .from('favorites')
      .select(`id, created_at, resource:resources(${SUMMARY}), list:lists(id, name, owner_id, list_items(count))`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  )
  const favorites = rows.map((f) => ({
    id: f.id,
    created_at: f.created_at,
    resource: f.resource ? present(f.resource as unknown as Summary, user.id) : null,
    list: f.list ? { id: (f.list as any).id, name: (f.list as any).name, itemCount: (f.list as any).list_items?.[0]?.count ?? 0 } : null,
  }))
  res.json({ favorites })
})

// S1-08-T02 Save and unsave
listsRouter.post('/favorites', async (req, res) => {
  const user = currentUser(req)
  const { resourceId, listId } = req.body ?? {}
  if (Boolean(resourceId) === Boolean(listId)) throw badRequest('Favorite either a resource or a list.')
  if (resourceId && !(await publishedIds([resourceId])).length) throw notFound('That resource')
  if (listId) await ownedList(listId, user.id)

  const column = resourceId ? 'resource_id' : 'list_id'
  const value = resourceId ?? listId
  const existing = maybe(await db.from('favorites').select('id').eq('user_id', user.id).eq(column, value).maybeSingle())
  const favorite = existing ?? check(await db.from('favorites').insert({ user_id: user.id, [column]: value }).select('id').single())
  if (!existing) track('favorite_added', user.id, { [column]: value })
  res.status(existing ? 200 : 201).json({ favorite })
})

listsRouter.delete('/favorites/:id', async (req, res) => {
  const user = currentUser(req)
  const deleted = check(await db.from('favorites').delete().eq('id', req.params.id).eq('user_id', user.id).select('id'))
  if (!deleted.length) throw notFound('That favorite')
  res.json({ ok: true })
})

// S1-13 Saved lists (students save recommendation lists; professors curate)
listsRouter.get('/lists', async (req, res) => {
  const user = currentUser(req)
  const rows = check(await db.from('lists').select('id, name, share_token, created_at, updated_at, list_items(count)').eq('owner_id', user.id).order('updated_at', { ascending: false }))
  res.json({ lists: rows.map(({ list_items, ...l }) => ({ ...l, itemCount: (list_items as any)?.[0]?.count ?? 0 })) })
})

listsRouter.post('/lists', async (req, res) => {
  const user = currentUser(req)
  const name = text(req.body?.name, 'List name', { max: 120 })
  const requested: string[] = Array.isArray(req.body?.resourceIds) ? req.body.resourceIds.filter((v: unknown) => typeof v === 'string') : []
  const list = check(await db.from('lists').insert({ owner_id: user.id, name }).select('id, name, share_token, created_at, updated_at').single())
  const ids = await publishedIds([...new Set(requested)])
  if (ids.length) check(await db.from('list_items').insert(ids.map((resource_id) => ({ list_id: list.id, resource_id }))))
  track('list_created', user.id, { listId: list.id, items: ids.length })
  res.status(201).json({ list: { ...list, itemCount: ids.length } })
})

listsRouter.get('/lists/:id', async (req, res) => {
  const user = currentUser(req)
  const list = await ownedList(req.params.id, user.id)
  const items = check(await db.from('list_items').select(`added_at, resource:resources(${SUMMARY})`).eq('list_id', list.id).order('added_at'))
  res.json({ list: { ...list, items: items.map((i) => ({ added_at: i.added_at, resource: present(i.resource as unknown as Summary, user.id) })) } })
})

// S1-13-T02 Rename and add resources
listsRouter.patch('/lists/:id', async (req, res) => {
  const user = currentUser(req)
  await ownedList(req.params.id, user.id)
  const name = text(req.body?.name, 'List name', { max: 120 })
  const list = check(await db.from('lists').update({ name, updated_at: new Date().toISOString() }).eq('id', req.params.id).select('id, name').single())
  res.json({ list })
})

listsRouter.delete('/lists/:id', async (req, res) => {
  const user = currentUser(req)
  await ownedList(req.params.id, user.id)
  check(await db.from('lists').delete().eq('id', req.params.id))
  res.json({ ok: true })
})

const touch = (listId: string) => db.from('lists').update({ updated_at: new Date().toISOString() }).eq('id', listId)

listsRouter.post('/lists/:id/items', async (req, res) => {
  const user = currentUser(req)
  await ownedList(req.params.id, user.id)
  const resourceId = req.body?.resourceId
  if (typeof resourceId !== 'string' || !(await publishedIds([resourceId])).length) throw notFound('That resource')
  check(await db.from('list_items').upsert({ list_id: req.params.id, resource_id: resourceId }, { onConflict: 'list_id,resource_id', ignoreDuplicates: true }))
  await touch(req.params.id)
  res.status(201).json({ ok: true })
})

// S1-14-T01 Remove a resource from an owned list
listsRouter.delete('/lists/:id/items/:resourceId', async (req, res) => {
  const user = currentUser(req)
  await ownedList(req.params.id, user.id)
  const removed = check(await db.from('list_items').delete().eq('list_id', req.params.id).eq('resource_id', req.params.resourceId).select('resource_id'))
  if (!removed.length) throw notFound('That resource in this list')
  await touch(req.params.id)
  const { count } = await db.from('list_items').select('resource_id', { count: 'exact', head: true }).eq('list_id', req.params.id)
  res.json({ ok: true, remaining: count ?? 0 })
})

// S1-15-T01 Read-only share links. Revoking makes old links stop working.
listsRouter.post('/lists/:id/share', async (req, res) => {
  const user = currentUser(req)
  const list = await ownedList(req.params.id, user.id)
  const token = list.share_token ?? randomUUID()
  if (!list.share_token) {
    check(await db.from('lists').update({ share_token: token }).eq('id', list.id))
    track('list_shared', user.id, { listId: list.id })
  }
  res.json({ shareToken: token })
})

listsRouter.delete('/lists/:id/share', async (req, res) => {
  const user = currentUser(req)
  await ownedList(req.params.id, user.id)
  check(await db.from('lists').update({ share_token: null }).eq('id', req.params.id))
  res.json({ ok: true })
})

// Public: anyone with the link can view, no sign-in needed. Only published resources show.
listsRouter.get('/shared/:token', async (req, res) => {
  const token = req.params.token
  if (!/^[0-9a-f-]{36}$/i.test(token)) throw notFound('That shared list')
  const list = maybe(await db.from('lists').select('id, name, updated_at, owner:profiles(display_name)').eq('share_token', token).maybeSingle())
  if (!list) throw notFound('That shared list')
  const items = check(await db.from('list_items').select(`resource:resources(${SUMMARY}, description, url)`).eq('list_id', list.id).order('added_at'))
  const resources = items
    .map((i) => i.resource as unknown as (Summary & { description: string; url: string | null }) | null)
    .filter((r) => r?.status === 'published')
    .map((r) => ({ id: r!.id, title: r!.title, description: r!.description, url: r!.url, subject: r!.subject, level: r!.level, medium: r!.medium }))
  res.json({ list: { name: list.name, updated_at: list.updated_at, owner: (list.owner as any)?.display_name || 'A professor', resources } })
})
