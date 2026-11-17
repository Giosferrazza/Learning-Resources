import { badRequest, maybe } from './http.js'
import { defaultRules, type Rules } from './recommend.js'
import { db } from './supabase.js'

// S2-13-T02 Recommendation rules live in the database, so admin changes apply to the next
// recommendation without a redeploy. No stored row means the defaults in recommend.ts.
export const weightKeys = ['subject', 'level', 'medium', 'goal'] as const
export const MAX_WEIGHT = 10

export async function loadRules(): Promise<Rules> {
  const row = maybe(await db.from('recommendation_settings').select('weights, require_subject').eq('id', 1).maybeSingle())
  if (!row) return defaultRules
  const stored = (row.weights ?? {}) as Record<string, unknown>
  const weights = { ...defaultRules.weights }
  for (const key of weightKeys) if (typeof stored[key] === 'number') weights[key] = stored[key] as number
  return { weights, requireSubject: row.require_subject }
}

// S2-13-T03 Validation: whole numbers from 0 to 10, and at least one weight above zero
export function parseRules(body: unknown): Rules {
  const b = (body ?? {}) as { weights?: Record<string, unknown>; requireSubject?: unknown }
  if (typeof b.weights !== 'object' || b.weights === null) throw badRequest('Send a weight for subject, level, format and goal.')
  const weights = { ...defaultRules.weights }
  for (const key of weightKeys) {
    const value = Number(b.weights[key])
    if (b.weights[key] === '' || b.weights[key] == null || !Number.isInteger(value) || value < 0 || value > MAX_WEIGHT) {
      throw badRequest(`The ${key === 'medium' ? 'format' : key} weight must be a whole number from 0 to ${MAX_WEIGHT}.`)
    }
    weights[key] = value
  }
  if (weights.level + weights.medium + weights.goal + (b.requireSubject === false ? weights.subject : 0) === 0) {
    throw badRequest('At least one weight must be above zero, or every resource would tie.')
  }
  if (typeof b.requireSubject !== 'boolean') throw badRequest('Choose whether the subject must match.')
  return { weights, requireSubject: b.requireSubject }
}
