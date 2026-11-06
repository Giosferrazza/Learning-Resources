import { Router } from 'express'
import { currentUser, requireUser } from '../lib/auth.js'
import { badRequest, HttpError, maybe } from '../lib/http.js'
import { db } from '../lib/supabase.js'
import { discoverResources, discoveryPrompt, type WebResults } from '../lib/webDiscovery.js'
import { createDiscoveryCache } from '../lib/discoveryCache.js'
import type { Answers } from '../lib/recommend.js'

export const discoveryRouter = Router()
const cachedSearch = createDiscoveryCache<WebResults>()
discoveryRouter.use('/discovery/recommendations', requireUser)

// Live web discovery by Claude. Unlike curated resources, results are not review-approved.
discoveryRouter.get('/discovery/recommendations', async (req, res) => {
  const user = currentUser(req)
  const responseId = req.query.responseId
  if (responseId != null && (typeof responseId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(responseId))) {
    throw badRequest('Invalid questionnaire response ID.')
  }

  let query = db.from('questionnaire_responses').select('*').eq('user_id', user.id)
  query = typeof responseId === 'string' ? query.eq('id', responseId) : query.order('created_at', { ascending: false }).limit(1)
  const response = maybe(await query.maybeSingle())
  if (!response) throw new HttpError(404, 'Answer the questionnaire first.', 'no_questionnaire')

  if (!process.env.ANTHROPIC_API_KEY) throw new HttpError(503, 'Web resource search is not configured yet.', 'discovery_not_configured')
  const answers: Answers = { topic: response.topic, level: response.knowledge_level, media: response.preferred_media ?? [], goal: response.goal, learningRequest: response.learning_request ?? null }
  try {
    const results = await cachedSearch(user.id, discoveryPrompt(answers), () => discoverResources(answers))
    res.json(results)
  } catch (err) {
    if (err instanceof HttpError) throw err
    console.error('Web discovery failed:', err instanceof Error ? err.message : err)
    throw new HttpError(502, 'Web resource search is temporarily unavailable.', 'discovery_unavailable')
  }
})
