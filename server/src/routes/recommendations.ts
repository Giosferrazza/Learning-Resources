import { Router } from 'express'
import { matchesFilters, parseFilters } from '../../../shared/filters.js'
import { isGoal, isLevel, isMedium, isSubject, learningRequestMaxLength, type Goal, type Level, type Medium, type Subject } from '../../../shared/vocabulary.js'
import { currentUser, requireUser } from '../lib/auth.js'
import { badRequest, check, HttpError, notFound, text, maybe, uuidParam } from '../lib/http.js'
import { track } from '../lib/events.js'
import { ratingsFor } from '../lib/ratings.js'
import { formatFallback, recommend, type Answers, type Candidate, type RecommendationResult } from '../lib/recommend.js'
import { loadRules } from '../lib/rules.js'
import { db } from '../lib/supabase.js'

export const recommendationsRouter = Router()
recommendationsRouter.use(['/questionnaire', '/questionnaires', '/history', '/recommendations', '/resources/:id/feedback', '/resources/:id/reports'], requireUser)

const RESOURCE_SUMMARY = 'id, title, description, url, file_path, subject, level, medium, goals, created_at'

type ResponseRow = { id: string; user_id: string; topic: Subject; knowledge_level: Level; preferred_media: Medium[] | null; goal: Goal | null; learning_request: string | null; created_at: string; updated_at?: string }
const RESPONSE_FIELDS = 'id, user_id, topic, knowledge_level, preferred_media, goal, learning_request, created_at, updated_at'

const answersOf = (r: ResponseRow): Answers => ({ topic: r.topic, level: r.knowledge_level, media: r.preferred_media ?? [], goal: r.goal, learningRequest: r.learning_request ?? null })

// S1-07-T02 / S1-33-T02 validation, shared by new submissions and edits (S2-16)
function parseAnswers(body: Record<string, unknown> | undefined) {
  const { topic, level, media, goal, learningRequest } = body ?? {}
  if (learningRequest != null && typeof learningRequest !== 'string') throw badRequest('Learning request must be text.')
  const requestText = text(learningRequest, 'Learning request', { max: learningRequestMaxLength, required: false })
  if (!isSubject(topic)) throw badRequest('Choose a subject.')
  if (!isLevel(level)) throw badRequest('Choose your knowledge level.')
  if (!Array.isArray(media) || !media.every(isMedium)) throw badRequest('Choose formats from the list.')
  if (goal != null && goal !== '' && !isGoal(goal)) throw badRequest('Choose a goal from the list.')
  return { topic, knowledge_level: level, preferred_media: [...new Set(media)], goal: goal || null, learning_request: requestText || null }
}

async function ownResponse(userId: string, id: unknown) {
  const response = maybe(await db.from('questionnaire_responses').select(RESPONSE_FIELDS).eq('id', uuidParam(id, 'That questionnaire')).eq('user_id', userId).maybeSingle())
  if (!response) throw notFound('That questionnaire')
  return response as ResponseRow
}

// S1-21-T03 / S1-25-T03: only published resources are ever eligible. S2-13: rules come from the database.
async function computeRecommendations(answers: Answers) {
  const [resources, rules] = await Promise.all([db.from('resources').select(RESOURCE_SUMMARY).eq('status', 'published'), loadRules()])
  const published = check(resources)
  return { result: recommend(answers, published, 20, rules), published, rules }
}

// S2-17-T02 Snapshot the recommendations and the answers behind them
async function saveSnapshot(response: ResponseRow, reason: 'submitted' | 'edited' | 'before_edit', answers: Answers, result: RecommendationResult<Candidate>) {
  const items = result.items.map(({ resource: r, exact, reasons, gaps }) => ({ id: r.id, title: r.title, subject: r.subject, level: r.level, medium: r.medium, exact, reasons, gaps }))
  check(await db.from('questionnaire_snapshots').insert({ response_id: response.id, user_id: response.user_id, reason, answers, items, exact: result.exact }))
}

// S1-07-T02 / S1-33-T02 / S2-04-T02 Every submission is its own row with a topic, goal and timestamp
recommendationsRouter.post('/questionnaire', async (req, res) => {
  const user = currentUser(req)
  const fields = parseAnswers(req.body)
  const row = check(await db.from('questionnaire_responses').insert({ user_id: user.id, ...fields }).select(RESPONSE_FIELDS).single()) as ResponseRow
  const answers = answersOf(row)
  await saveSnapshot(row, 'submitted', answers, (await computeRecommendations(answers)).result)
  track('questionnaire_submitted', user.id, { topic: fields.topic, level: fields.knowledge_level, goal: fields.goal })
  res.status(201).json({ id: row.id })
})

recommendationsRouter.get('/questionnaire/latest', async (req, res) => {
  const user = currentUser(req)
  const latest = maybe(
    await db.from('questionnaire_responses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  )
  res.json({ response: latest })
})

// S2-04-T01 All of my questionnaires, newest first
recommendationsRouter.get('/questionnaires', async (req, res) => {
  const user = currentUser(req)
  const responses = check(await db.from('questionnaire_responses').select(RESPONSE_FIELDS).eq('user_id', user.id).order('created_at', { ascending: false }))
  res.json({ responses })
})

// S2-16-T01 Prefill the edit form
recommendationsRouter.get('/questionnaire/:id', async (req, res) => {
  const user = currentUser(req)
  res.json({ response: await ownResponse(user.id, req.params.id) })
})

// S2-16-T02 Edit one questionnaire in place. Other questionnaires are untouched (S2-04-T02-S3).
// The result before the edit stays in history (S2-17), then recommendations are regenerated.
recommendationsRouter.patch('/questionnaire/:id', async (req, res) => {
  const user = currentUser(req)
  const existing = await ownResponse(user.id, req.params.id)
  const fields = parseAnswers(req.body)

  const { count } = await db.from('questionnaire_snapshots').select('id', { count: 'exact', head: true }).eq('response_id', existing.id)
  if (!count) {
    const before = answersOf(existing)
    await saveSnapshot(existing, 'before_edit', before, (await computeRecommendations(before)).result)
  }

  const row = check(
    await db.from('questionnaire_responses').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', existing.id).eq('user_id', user.id).select(RESPONSE_FIELDS).single(),
  ) as ResponseRow
  const answers = answersOf(row)
  await saveSnapshot(row, 'edited', answers, (await computeRecommendations(answers)).result)
  track('questionnaire_submitted', user.id, { topic: fields.topic, level: fields.knowledge_level, goal: fields.goal, edited: true })
  res.json({ id: row.id })
})

// S1-07-T03 / S1-33-T03 / S1-34-T01 / S1-35-T02 Recommendations for a questionnaire (latest by default).
// S2-03-T02 Optional subject, level and format filters. S2-04-T03 each questionnaire has its own results.
recommendationsRouter.get('/recommendations', async (req, res) => {
  const user = currentUser(req)
  let response: ResponseRow | null
  if (typeof req.query.responseId === 'string') response = await ownResponse(user.id, req.query.responseId)
  else response = maybe(await db.from('questionnaire_responses').select(RESPONSE_FIELDS).eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()) as ResponseRow | null
  if (!response) throw new HttpError(404, 'Answer the questionnaire first.', 'no_questionnaire')

  const answers = answersOf(response)
  const { result, published } = await computeRecommendations(answers)
  const filters = parseFilters(req.query as Record<string, unknown>)
  const filtered = result.items.filter((i) => matchesFilters(i.resource, filters))
  const ratings = await ratingsFor(filtered.map((i) => i.resource.id))

  const mediumFallback = formatFallback(answers, published)

  track('recommendations_viewed', user.id, { responseId: response.id, exact: result.exact, count: result.items.length })
  res.json({
    responseId: response.id,
    answers,
    submittedAt: response.created_at,
    updatedAt: response.updated_at ?? response.created_at,
    libraryEmpty: published.length === 0,
    exact: result.exact,
    mediumFallback,
    filters,
    unfilteredCount: result.items.length,
    items: filtered.map((i) => ({ ...i, resource: { ...i.resource, rating: ratings.get(i.resource.id) } })),
  })
})

// S2-17-T01 Past results, newest first
recommendationsRouter.get('/history', async (req, res) => {
  const user = currentUser(req)
  const rows = check(
    await db.from('questionnaire_snapshots').select('id, response_id, reason, answers, items, exact, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
  )
  res.json({ snapshots: rows.map(({ items, ...s }) => ({ ...s, count: (items as unknown[]).length })) })
})

// S2-17-T03 One past result. Resources removed since then show as unavailable.
recommendationsRouter.get('/history/:id', async (req, res) => {
  const user = currentUser(req)
  const snapshot = maybe(
    await db.from('questionnaire_snapshots').select('id, response_id, reason, answers, items, exact, created_at').eq('id', uuidParam(req.params.id, 'That result')).eq('user_id', user.id).maybeSingle(),
  )
  if (!snapshot) throw notFound('That result')
  const items = snapshot.items as Array<{ id: string; title: string }>
  const current = items.length ? check(await db.from('resources').select('id, status').in('id', items.map((i) => i.id))) : []
  const live = new Set(current.filter((r) => r.status === 'published').map((r) => r.id))
  const responseExists = Boolean(maybe(await db.from('questionnaire_responses').select('id').eq('id', snapshot.response_id).maybeSingle()))
  res.json({ snapshot: { ...snapshot, responseExists, items: items.map((i) => ({ ...i, available: live.has(i.id) })) } })
})

async function publishedResource(id: string) {
  const resource = maybe(await db.from('resources').select('id, owner_id, title, status').eq('id', id).maybeSingle())
  if (!resource || resource.status !== 'published') throw notFound('That resource')
  return resource
}

// S1-09-T02 Store resource feedback (one per person per resource; resubmitting updates it)
recommendationsRouter.get('/resources/:id/feedback/mine', async (req, res) => {
  const user = currentUser(req)
  const feedback = maybe(await db.from('resource_feedback').select('rating, comment, created_at').eq('user_id', user.id).eq('resource_id', req.params.id).maybeSingle())
  res.json({ feedback })
})

recommendationsRouter.post('/resources/:id/feedback', async (req, res) => {
  const user = currentUser(req)
  await publishedResource(req.params.id)
  const rawRating = req.body?.rating
  const rating = rawRating === null || rawRating === undefined || rawRating === '' ? null : Number(rawRating)
  if (rating !== null && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) throw badRequest('Rating must be a whole number from 1 to 5.')
  const comment = text(req.body?.comment, 'Comment', { max: 1000, required: false })
  if (rating === null && !comment) throw badRequest('Add a rating or a comment.')

  const feedback = check(
    await db
      .from('resource_feedback')
      .upsert({ user_id: user.id, resource_id: req.params.id, rating, comment, created_at: new Date().toISOString() }, { onConflict: 'user_id,resource_id' })
      .select('rating, comment, created_at')
      .single(),
  )
  track('feedback_submitted', user.id, { resourceId: req.params.id, rating })
  res.status(201).json({ feedback })
})

// S1-10-T02 Store reports with review status; S1-22-T01 notify the resource owner
export const reportReasons = { broken_link: 'Broken link or file', inaccurate: 'Inaccurate or outdated', inappropriate: 'Inappropriate content', other: 'Something else' } as const

recommendationsRouter.post('/resources/:id/reports', async (req, res) => {
  const user = currentUser(req)
  const resource = await publishedResource(req.params.id)
  const reason = req.body?.reason
  if (typeof reason !== 'string' || !(reason in reportReasons)) throw badRequest('Choose what is wrong.')
  const details = text(req.body?.details, 'Details', { max: 1000, required: reason === 'other' })

  const open = check(await db.from('reports').select('id').eq('reporter_id', user.id).eq('resource_id', resource.id).eq('status', 'open').limit(1))
  if (open.length) throw new HttpError(409, "You've already reported this resource. An admin will review it.", 'already_reported')

  const report = check(await db.from('reports').insert({ reporter_id: user.id, resource_id: resource.id, reason, details }).select('id, status, created_at').single())
  if (resource.owner_id !== user.id) {
    check(
      await db.from('notifications').insert({
        user_id: resource.owner_id,
        type: 'content_flagged',
        resource_id: resource.id,
        report_id: report.id,
        message: `"${resource.title}" was reported: ${reportReasons[reason as keyof typeof reportReasons]}.`,
      }),
    )
  }
  track('report_filed', user.id, { resourceId: resource.id, reason })
  res.status(201).json({ report })
})
