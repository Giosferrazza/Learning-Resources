import { Router } from 'express'
import { isGoal, isLevel, isMedium, isSubject } from '../../../shared/vocabulary'
import { currentUser, requireUser } from '../lib/auth'
import { badRequest, check, HttpError, notFound, text, maybe } from '../lib/http'
import { track } from '../lib/events'
import { recommend } from '../lib/recommend'
import { db } from '../lib/supabase'

export const recommendationsRouter = Router()
recommendationsRouter.use(['/questionnaire', '/recommendations', '/resources/:id/feedback', '/resources/:id/reports'], requireUser)

const RESOURCE_SUMMARY = 'id, title, description, url, file_path, subject, level, medium, goals, created_at'

// S1-07-T02 / S1-33-T02 Store questionnaire answers (students and professors, S1-11-T01)
recommendationsRouter.post('/questionnaire', async (req, res) => {
  const user = currentUser(req)
  const { topic, level, media, goal } = req.body ?? {}
  if (!isSubject(topic)) throw badRequest('Choose a subject.')
  if (!isLevel(level)) throw badRequest('Choose your knowledge level.')
  if (!Array.isArray(media) || !media.every(isMedium)) throw badRequest('Choose formats from the list.')
  if (goal != null && goal !== '' && !isGoal(goal)) throw badRequest('Choose a goal from the list.')

  const row = check(
    await db
      .from('questionnaire_responses')
      .insert({ user_id: user.id, topic, knowledge_level: level, preferred_media: [...new Set(media)], goal: goal || null })
      .select('id')
      .single(),
  )
  track('questionnaire_submitted', user.id, { topic, level, goal: goal || null })
  res.status(201).json({ id: row.id })
})

recommendationsRouter.get('/questionnaire/latest', async (req, res) => {
  const user = currentUser(req)
  const latest = maybe(
    await db.from('questionnaire_responses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  )
  res.json({ response: latest })
})

// S1-07-T03 / S1-33-T03 / S1-34-T01 / S1-35-T02 Recommendations for a questionnaire (latest by default)
recommendationsRouter.get('/recommendations', async (req, res) => {
  const user = currentUser(req)
  let query = db.from('questionnaire_responses').select('*').eq('user_id', user.id)
  query = typeof req.query.responseId === 'string' ? query.eq('id', req.query.responseId) : query.order('created_at', { ascending: false }).limit(1)
  const response = maybe(await query.maybeSingle())
  if (!response) throw new HttpError(404, 'Answer the questionnaire first.', 'no_questionnaire')

  const answers = { topic: response.topic, level: response.knowledge_level, media: response.preferred_media ?? [], goal: response.goal }
  // S1-21-T03 / S1-25-T03: only published resources are ever eligible
  const resources = check(await db.from('resources').select(RESOURCE_SUMMARY).eq('status', 'published'))
  const result = recommend(answers, resources)
  const libraryEmpty = resources.length === 0

  track('recommendations_viewed', user.id, { responseId: response.id, exact: result.exact, count: result.items.length })
  res.json({ responseId: response.id, answers, libraryEmpty, ...result })
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
