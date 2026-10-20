import { Router } from 'express'
import { notImplemented } from '../lib/notImplemented'

export const resourcesRouter = Router()

// S1-11 / S1-12 Professor library: every published resource
// TODO(S1-21-T03): drafts never show up here
resourcesRouter.get('/library', notImplemented('S1-12-T01, S1-11-T01'))
// S1-19 View all resources submitted by an educator
resourcesRouter.get('/resources/mine', notImplemented('S1-19-T01'))
// S1-16 Upload, S1-17 tags, S1-21 save as draft
resourcesRouter.post('/resources', notImplemented('S1-16-T03, S1-17-T02, S1-21-T01'))
resourcesRouter.get('/resources/:id', notImplemented('S1-18-T02'))
// S1-18 Edit existing resource details
resourcesRouter.patch('/resources/:id', notImplemented('S1-18-T02, S1-17-T02'))
// S1-21 draft -> pending
resourcesRouter.post('/resources/:id/submit', notImplemented('S1-21-T01'))
// S1-20 Clone an existing resource
resourcesRouter.post('/resources/:id/clone', notImplemented('S1-20-T01'))
// S1-22 Notify educators when content is flagged
resourcesRouter.get('/notifications', notImplemented('S1-22-T03'))
resourcesRouter.patch('/notifications/:id/read', notImplemented('S1-22-T03'))
