import { Router } from 'express'
import { notImplemented } from '../lib/notImplemented'

export const recommendationsRouter = Router()

// S1-07 Questionnaire (+ S1-33 learning goal)
recommendationsRouter.post('/questionnaire', notImplemented('S1-07-T02, S1-33-T02'))
// S1-07 exact matches, S1-33 goal ranking, S1-34 match evidence, S1-35 closest-match fallback
// TODO(S1-35-T01, S1-33-T01): document ranking and tie rules here before implementing
// TODO(S1-21-T03): only status = 'published' resources are eligible (never drafts or pending)
// TODO(S1-34-T03): resources missing subject/level/medium are handled the same way every time
recommendationsRouter.get('/recommendations', notImplemented('S1-07-T03, S1-33-T03, S1-34-T01, S1-35-T02'))
// S1-09 Rate or give feedback on a recommended resource
recommendationsRouter.post('/resources/:id/feedback', notImplemented('S1-09-T02'))
// S1-10 Report a broken link or resource
recommendationsRouter.post('/resources/:id/reports', notImplemented('S1-10-T02'))
