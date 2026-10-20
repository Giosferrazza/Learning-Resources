import type { Request, RequestHandler } from 'express'
import { db } from './supabase.js'
import { HttpError, forbidden } from './http.js'

export type Role = 'student' | 'professor' | 'educator' | 'admin'
export const roles: Role[] = ['student', 'professor', 'educator', 'admin']

export type CurrentUser = { id: string; email: string; displayName: string; role: Role; token: string }

declare global {
  namespace Express {
    interface Request {
      user?: CurrentUser
    }
  }
}

const suspended = () => new HttpError(403, 'This account has been suspended. Contact an administrator.', 'account_suspended')

// S1-02-T02: every protected route checks the Supabase access token, then reloads the
// profile so role changes (S1-28) and suspensions (S1-23-T03) apply on the very next request.
export const requireUser: RequestHandler = async (req, _res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) throw new HttpError(401, 'Please sign in.', 'signed_out')

  const { data, error } = await db.auth.getUser(token)
  if ((error as { code?: string } | null)?.code === 'user_banned') throw suspended()
  if (error || !data.user) throw new HttpError(401, 'Your session has expired. Please sign in again.', 'signed_out')

  const { data: profile } = await db
    .from('profiles')
    .select('email, display_name, role, account_status')
    .eq('id', data.user.id)
    .maybeSingle()
  if (!profile) throw new HttpError(401, 'Your account could not be found.', 'signed_out')
  if (profile.account_status === 'suspended') throw suspended()

  req.user = { id: data.user.id, email: profile.email, displayName: profile.display_name, role: profile.role, token }
  next()
}

// S1-28-T01: role permissions. Admins can do everything a role-gated route allows.
export const requireRole =
  (...allowed: Role[]): RequestHandler =>
  (req, _res, next) => {
    const role = req.user?.role
    if (!role || (role !== 'admin' && !allowed.includes(role))) throw forbidden()
    next()
  }

export function currentUser(req: Request): CurrentUser {
  if (!req.user) throw new HttpError(401, 'Please sign in.', 'signed_out')
  return req.user
}
