import { waitUntil } from '@vercel/functions'
import { db } from './supabase.js'

// S1-30-T01: the usage events we record. Sign-ups come from profiles.created_at.
export const eventTypes = [
  'questionnaire_submitted',
  'recommendations_viewed',
  'favorite_added',
  'list_created',
  'list_shared',
  'feedback_submitted',
  'report_filed',
  'resource_submitted',
  'resource_approved',
] as const

export type EventType = (typeof eventTypes)[number]

// Fire and forget: analytics must never break the request that triggered it.
// waitUntil keeps a Vercel function alive until the write finishes (no-op elsewhere).
export function track(type: EventType, userId: string | null, metadata: Record<string, unknown> = {}) {
  const write = Promise.resolve(db.from('usage_events').insert({ event_type: type, user_id: userId, metadata })).then(
    ({ error }) => error && console.error('track failed:', error.message),
    (err: unknown) => console.error('track failed:', err),
  )
  waitUntil(write)
}
