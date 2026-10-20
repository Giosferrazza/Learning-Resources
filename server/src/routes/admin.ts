import { Router } from 'express'
import { notImplemented } from '../lib/notImplemented'

export const adminRouter = Router()

// TODO(S1-28-T01, S1-23-T03): guard this whole router with an admin-only, active-account middleware

// S1-23 Manage user account access
adminRouter.get('/users', notImplemented('S1-23-T01'))
adminRouter.patch('/users/:id/status', notImplemented('S1-23-T01'))
// S1-28 Assign and change user roles
adminRouter.patch('/users/:id/role', notImplemented('S1-28-T02'))
// S1-24 Manage the resource collection
adminRouter.get('/resources', notImplemented('S1-24-T01'))
adminRouter.patch('/resources/:id', notImplemented('S1-24-T01'))
adminRouter.delete('/resources/:id', notImplemented('S1-24-T01, S1-24-T03'))
// S1-26 View pending submissions, S1-25 approve or reject
// TODO(S1-25-T03): approve sets status published + reviewed_at; reject keeps it out of library and recommendations
adminRouter.get('/submissions', notImplemented('S1-26-T01'))
adminRouter.post('/submissions/:id/approve', notImplemented('S1-25-T01'))
adminRouter.post('/submissions/:id/reject', notImplemented('S1-25-T01'))
// S1-27 Review flagged or reported content
adminRouter.get('/reports', notImplemented('S1-27-T01'))
adminRouter.post('/reports/:id/resolve', notImplemented('S1-27-T01, S1-27-T03'))
// S1-29 monitoring view, S1-30 analytics, S1-31 error logs
adminRouter.get('/monitoring', notImplemented('S1-29-T03'))
adminRouter.get('/analytics', notImplemented('S1-30-T02'))
adminRouter.get('/errors', notImplemented('S1-31-T02'))
