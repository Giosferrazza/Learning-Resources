import { Router } from 'express'
import { notImplemented } from '../lib/notImplemented'

export const accountRouter = Router()

// S1-01 Create an account
accountRouter.post('/auth/register', notImplemented('S1-01-T02'))
// S1-03 Change password
accountRouter.post('/account/password', notImplemented('S1-03-T02'))
// S1-04 Update profile information
accountRouter.get('/profile', notImplemented('S1-04-T02'))
accountRouter.patch('/profile', notImplemented('S1-04-T02'))
// S1-05 Password reset is sent by Supabase Auth from the client; S1-05-T02 is the SMTP/redirect setup
// S1-06 Show first-login walkthrough
accountRouter.post('/profile/walkthrough-complete', notImplemented('S1-06-T02'))
