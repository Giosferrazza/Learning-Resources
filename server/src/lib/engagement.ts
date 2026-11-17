import { check } from './http.js'
import { db } from './supabase.js'

// S2-12-T02 Engagement events. A view is opening the resource page; an open is following its
// link or file. The same person viewing or opening the same resource again within the window
// (refreshes, back-and-forth) counts once.
export const DEDUPE_WINDOW_MS = 30 * 60 * 1000
export type EngagementKind = 'view' | 'open'

export async function recordEngagement(resourceId: string, userId: string, kind: EngagementKind, now = Date.now()) {
  const recent = check(
    await db
      .from('resource_views')
      .select('id')
      .eq('resource_id', resourceId)
      .eq('user_id', userId)
      .eq('kind', kind)
      .gte('created_at', new Date(now - DEDUPE_WINDOW_MS).toISOString())
      .limit(1),
  )
  if (recent.length) return false
  check(await db.from('resource_views').insert({ resource_id: resourceId, user_id: userId, kind }))
  return true
}
