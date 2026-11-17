import { Router } from 'express'
import { media, subjects } from '../../../shared/vocabulary.js'
import { currentUser, requireRole, requireUser } from '../lib/auth.js'
import { check, maybe, notFound, uuidParam } from '../lib/http.js'
import { db } from '../lib/supabase.js'

// S2-11 / S2-12 Reporting for educators (and admins). S2-11-T03 / S2-11-T02-S3: educator-only
// access, and only anonymous totals ever leave the server: no names, emails or user IDs.
export const insightsRouter = Router()
insightsRouter.use('/insights', requireUser, requireRole('educator'))

const DAY = 24 * 60 * 60 * 1000
type Res = { id: string; title: string; subject: string | null; medium: string | null; owner_id?: string; status?: string }

const tally = <K extends string>(keys: readonly K[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>

// S2-11-T02 Favorites per resource, subject and format; preferred formats from questionnaires
insightsRouter.get('/insights/preferences', async (_req, res) => {
  const [favRows, responses] = await Promise.all([
    db.from('favorites').select('resource:resources(id, title, subject, medium, status)').not('resource_id', 'is', null),
    db.from('questionnaire_responses').select('preferred_media'),
  ])
  const favorites = check(favRows).map((f) => f.resource as unknown as Res | null).filter((r): r is Res => Boolean(r))

  const perResource = new Map<string, { id: string; title: string; subject: string | null; medium: string | null; favorites: number }>()
  const bySubject = tally(Object.keys(subjects) as (keyof typeof subjects)[]) as Record<string, number>
  const byMedium = tally(Object.keys(media) as (keyof typeof media)[]) as Record<string, number>
  for (const r of favorites) {
    const row = perResource.get(r.id) ?? { id: r.id, title: r.title, subject: r.subject, medium: r.medium, favorites: 0 }
    row.favorites += 1
    perResource.set(r.id, row)
    if (r.subject && r.subject in bySubject) bySubject[r.subject] += 1
    if (r.medium && r.medium in byMedium) byMedium[r.medium] += 1
  }

  const rows = check(responses)
  const preferred = tally(Object.keys(media) as (keyof typeof media)[]) as Record<string, number>
  let noPreference = 0
  for (const r of rows) {
    const picks = (r.preferred_media ?? []) as string[]
    if (!picks.length) noPreference += 1
    for (const m of new Set(picks)) if (m in preferred) preferred[m] += 1
  }

  res.json({
    favorites: {
      total: favorites.length,
      topResources: [...perResource.values()].sort((a, b) => b.favorites - a.favorites || a.title.localeCompare(b.title)).slice(0, 20),
      bySubject,
      byMedium,
    },
    preferredMedia: { questionnaires: rows.length, counts: preferred, noPreference },
  })
})

const PERIODS = [7, 30, 90] as const
const periodDays = (raw: unknown) => (PERIODS.includes(Number(raw) as (typeof PERIODS)[number]) ? Number(raw) : 30)

// S2-12-T01 / S2-12-T02-S2 / S2-12-T03 Views and opens per resource for a period, sortable.
// `mine=1` narrows an educator to their own resources.
insightsRouter.get('/insights/engagement', async (req, res) => {
  const user = currentUser(req)
  const days = periodDays(req.query.period)
  const from = new Date(Date.now() - days * DAY).toISOString()
  let resourcesQuery = db.from('resources').select('id, title, subject, medium, owner_id').eq('status', 'published')
  if (req.query.mine === '1') resourcesQuery = resourcesQuery.eq('owner_id', user.id)
  const [resourceRows, eventRows] = await Promise.all([resourcesQuery, db.from('resource_views').select('resource_id, user_id, kind').gte('created_at', from).limit(100000)])
  const resources = check(resourceRows) as Res[]
  const events = check(eventRows)

  const stats = new Map(resources.map((r) => [r.id, { views: 0, opens: 0, people: new Set<string>() }]))
  for (const e of events) {
    const s = stats.get(e.resource_id)
    if (!s) continue
    if (e.kind === 'view') s.views += 1
    else s.opens += 1
    if (e.user_id) s.people.add(e.user_id)
  }
  const rows = resources.map((r) => {
    const s = stats.get(r.id)!
    return { id: r.id, title: r.title, subject: r.subject, medium: r.medium, mine: r.owner_id === user.id, views: s.views, opens: s.opens, people: s.people.size }
  })
  const sort = req.query.sort === 'opens' || req.query.sort === 'people' || req.query.sort === 'title' ? req.query.sort : 'views'
  rows.sort((a, b) => (sort === 'title' ? a.title.localeCompare(b.title) : b[sort] - a[sort] || b.views - a.views || a.title.localeCompare(b.title)))

  res.json({
    period: days,
    sort,
    totals: { views: rows.reduce((n, r) => n + r.views, 0), opens: rows.reduce((n, r) => n + r.opens, 0) },
    resources: rows,
  })
})

// S2-12-T03 Per-resource detail: daily views and opens for the period
insightsRouter.get('/insights/engagement/:id', async (req, res) => {
  const days = periodDays(req.query.period)
  const resource = maybe(await db.from('resources').select('id, title, subject, medium, status').eq('id', uuidParam(req.params.id, 'That resource')).maybeSingle())
  if (!resource || resource.status !== 'published') throw notFound('That resource')
  const from = new Date(Date.now() - days * DAY)
  const events = check(await db.from('resource_views').select('kind, user_id, created_at').eq('resource_id', resource.id).gte('created_at', from.toISOString()))

  const daily = Array.from({ length: days }, (_, i) => ({ day: new Date(Date.now() - (days - 1 - i) * DAY).toISOString().slice(0, 10), views: 0, opens: 0 }))
  const index = new Map(daily.map((d, i) => [d.day, i]))
  for (const e of events) {
    const i = index.get(e.created_at.slice(0, 10))
    if (i === undefined) continue
    if (e.kind === 'view') daily[i].views += 1
    else daily[i].opens += 1
  }
  res.json({
    resource: { id: resource.id, title: resource.title, subject: resource.subject, medium: resource.medium },
    period: days,
    totals: { views: daily.reduce((n, d) => n + d.views, 0), opens: daily.reduce((n, d) => n + d.opens, 0), people: new Set(events.map((e) => e.user_id).filter(Boolean)).size },
    daily,
  })
})
