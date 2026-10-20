import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { createApp } from '../app.js'
import type { Role } from '../lib/auth.js'
import { db, freshClient } from '../lib/supabase.js'

export const app = createApp()
export const PASSWORD = 'test-password-1'

export type TestUser = { id: string; email: string; token: string; role: Role }
const created: string[] = []

export async function createUser(role: Role = 'student', name = `${role} tester`): Promise<TestUser> {
  const email = `${role}-${randomUUID().slice(0, 8)}@sprint1.test`
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: name, role: role === 'admin' ? 'student' : role },
  })
  if (error) throw error
  created.push(data.user.id)
  if (role === 'admin') await db.from('profiles').update({ role: 'admin' }).eq('id', data.user.id)
  return { id: data.user.id, email, token: await signIn(email), role }
}

export async function signIn(email: string, password = PASSWORD) {
  const { data, error } = await freshClient().auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session.access_token
}

export async function cleanupUsers() {
  await Promise.all(created.splice(0).map((id) => db.auth.admin.deleteUser(id)))
}

type Method = 'get' | 'post' | 'patch' | 'delete'
export const api = (user?: TestUser) => {
  const call = (method: Method, path: string, body?: object) => {
    let req = request(app)[method](`/api${path}`)
    if (user) req = req.set('Authorization', `Bearer ${user.token}`)
    return body ? req.send(body) : req
  }
  return {
    get: (path: string) => call('get', path),
    post: (path: string, body: object = {}) => call('post', path, body),
    patch: (path: string, body: object = {}) => call('patch', path, body),
    delete: (path: string) => call('delete', path),
  }
}

type ResourceFields = { title?: string; subject?: string; level?: string; medium?: string; goals?: string[]; status?: string; url?: string }

export async function insertResource(owner: TestUser, fields: ResourceFields = {}) {
  const { data, error } = await db
    .from('resources')
    .insert({
      owner_id: owner.id,
      title: fields.title ?? `Resource ${randomUUID().slice(0, 6)}`,
      subject: fields.subject ?? 'statistics',
      level: fields.level ?? 'beginner',
      medium: fields.medium ?? 'video',
      goals: fields.goals ?? [],
      status: fields.status ?? 'published',
      url: fields.url ?? 'https://example.com',
    })
    .select('id, title')
    .single()
  if (error) throw error
  return data as { id: string; title: string }
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
