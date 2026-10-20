import { Router } from 'express'
import { currentUser, requireUser } from '../lib/auth'
import { badRequest, check, HttpError, text } from '../lib/http'
import { db, freshClient } from '../lib/supabase'

export const accountRouter = Router()
accountRouter.use('/me', requireUser)
accountRouter.use('/profile', requireUser)
accountRouter.use('/account', requireUser)

// S1-01 / S1-02: sign-up and sign-in happen through Supabase Auth in the client; the
// sign-up trigger (0002_roles.sql) creates the profile. This returns who is signed in.
accountRouter.get('/me', async (req, res) => {
  const user = currentUser(req)
  const profile = check(
    await db.from('profiles').select('id, email, display_name, role, account_status, walkthrough_completed_at, created_at').eq('id', user.id).single(),
  )
  res.json({ profile })
})

// S1-04 Update profile information. Email changes go through Supabase Auth (confirmation email).
accountRouter.patch('/profile', async (req, res) => {
  const user = currentUser(req)
  const displayName = text(req.body?.displayName, 'Name', { max: 80 })
  const profile = check(
    await db.from('profiles').update({ display_name: displayName, updated_at: new Date().toISOString() }).eq('id', user.id).select('id, email, display_name, role').single(),
  )
  res.json({ profile })
})

// S1-06 Show first-login walkthrough: finishing or skipping it marks it done.
accountRouter.post('/profile/walkthrough-complete', async (req, res) => {
  const user = currentUser(req)
  check(await db.from('profiles').update({ walkthrough_completed_at: new Date().toISOString() }).eq('id', user.id).is('walkthrough_completed_at', null))
  res.json({ ok: true })
})

// S1-03 Change password: confirm the current password, set the new one, end other sessions.
accountRouter.post('/account/password', async (req, res) => {
  const user = currentUser(req)
  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : ''
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : ''
  if (!currentPassword) throw badRequest('Enter your current password.')
  if (newPassword.length < 8) throw badRequest('Your new password must be at least 8 characters.')
  if (newPassword === currentPassword) throw badRequest('Your new password must be different from your current one.')

  const { error: signInError } = await freshClient().auth.signInWithPassword({ email: user.email, password: currentPassword })
  if (signInError) throw new HttpError(400, 'Your current password is incorrect.', 'wrong_password')

  const { error } = await db.auth.admin.updateUserById(user.id, { password: newPassword })
  if (error) throw new Error(error.message)
  await db.auth.admin.signOut(user.token, 'others')
  res.json({ ok: true })
})
