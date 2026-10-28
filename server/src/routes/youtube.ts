import { Router } from 'express'
import { currentUser, requireUser } from '../lib/auth.js'
import { badRequest, HttpError, maybe } from '../lib/http.js'
import { db } from '../lib/supabase.js'
import { searchYouTube } from '../lib/youtube.js'
import type { Answers } from '../lib/recommend.js'

export const youtubeRouter = Router()
youtubeRouter.use('/youtube/recommendations', requireUser)

// Optional live YouTube discovery. Unlike curated resources, results are not yet review-approved.
youtubeRouter.get('/youtube/recommendations', async (req, res) => {
  const user = currentUser(req)
  const responseId = req.query.responseId
  if (responseId != null && (typeof responseId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(responseId))) {
    throw badRequest('Invalid questionnaire response ID.')
  }
  const focus = req.query.focus ?? ''
  if (typeof focus !== 'string' || focus.length > 120) throw badRequest('Specific learning topic must be at most 120 characters.')

  let query = db.from('questionnaire_responses').select('*').eq('user_id', user.id)
  query = typeof responseId === 'string' ? query.eq('id', responseId) : query.order('created_at', { ascending: false }).limit(1)
  const response = maybe(await query.maybeSingle())
  if (!response) throw new HttpError(404, 'Answer the questionnaire first.', 'no_questionnaire')

  const youtubeKey = process.env.YOUTUBE_API_KEY
  if (!youtubeKey) throw new HttpError(503, 'Live YouTube search is not configured yet.', 'youtube_not_configured')
  const answers: Answers = { topic: response.topic, level: response.knowledge_level, media: response.preferred_media ?? [], goal: response.goal }
  try {
    const results = await searchYouTube(answers, focus.trim(), youtubeKey, process.env.OPENAI_API_KEY)
    res.json(results)
  } catch {
    throw new HttpError(502, 'YouTube search is temporarily unavailable.', 'youtube_unavailable')
  }
})
