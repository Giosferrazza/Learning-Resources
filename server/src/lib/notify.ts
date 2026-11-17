import { levelOrder, type Level } from '../../../shared/vocabulary.js'
import { logError } from './errorLog.js'
import { check, maybe } from './http.js'
import { db } from './supabase.js'

// S2-05-T02 Tell students when a resource that fits them is published or updated.
//
// Who hears about it (S2-05-T04 "only the right students"): active students, never the owner,
// with at least one questionnaire in the resource's subject at its level or one step away and
// with its format picked (or no format preference). Updates also reach students who favorited
// the resource or saved it in a list. A student gets one "new" notice per resource, and no new
// "updated" notice while an earlier one is still unread.

type Kind = 'new' | 'updated'
const TYPE: Record<Kind, string> = { new: 'new_recommendation', updated: 'resource_updated' }

type Response = { user_id: string; knowledge_level: string; preferred_media: string[] | null }

export function fitsQuestionnaire(resource: { level: string | null; medium: string | null }, response: Response) {
  if (!resource.level || !levelOrder.includes(resource.level as Level) || !levelOrder.includes(response.knowledge_level as Level)) return false
  const distance = Math.abs(levelOrder.indexOf(resource.level as Level) - levelOrder.indexOf(response.knowledge_level as Level))
  const media = response.preferred_media ?? []
  return distance <= 1 && (media.length === 0 || (resource.medium !== null && media.includes(resource.medium)))
}

export async function studentsToNotify(resourceId: string, kind: Kind): Promise<string[]> {
  const resource = maybe(await db.from('resources').select('id, owner_id, subject, level, medium, status').eq('id', resourceId).maybeSingle())
  if (!resource || resource.status !== 'published' || !resource.subject) return []

  const responses = check(await db.from('questionnaire_responses').select('user_id, knowledge_level, preferred_media').eq('topic', resource.subject)) as Response[]
  const candidates = new Set(responses.filter((r) => fitsQuestionnaire(resource, r)).map((r) => r.user_id))

  if (kind === 'updated') {
    const [favorites, items] = await Promise.all([
      db.from('favorites').select('user_id').eq('resource_id', resourceId),
      db.from('list_items').select('list:lists(owner_id)').eq('resource_id', resourceId),
    ])
    check(favorites).forEach((f) => candidates.add(f.user_id))
    check(items).forEach((i) => (i.list as unknown as { owner_id: string } | null)?.owner_id && candidates.add((i.list as unknown as { owner_id: string }).owner_id))
  }
  candidates.delete(resource.owner_id)
  if (!candidates.size) return []

  const students = check(await db.from('profiles').select('id').in('id', [...candidates]).eq('role', 'student').eq('account_status', 'active'))
  let ids = students.map((s) => s.id as string)
  if (!ids.length) return []

  let already = db.from('notifications').select('user_id').eq('resource_id', resourceId).eq('type', TYPE[kind]).in('user_id', ids)
  if (kind === 'updated') already = already.is('read_at', null)
  const skip = new Set(check(await already).map((n) => n.user_id))
  ids = ids.filter((id) => !skip.has(id))
  return ids
}

export async function notifyStudents(resourceId: string, kind: Kind) {
  try {
    const ids = await studentsToNotify(resourceId, kind)
    if (!ids.length) return 0
    const { title } = check(await db.from('resources').select('title').eq('id', resourceId).single())
    const message = kind === 'new' ? `New recommendation for you: "${title}".` : `"${title}" was updated.`
    check(await db.from('notifications').insert(ids.map((user_id) => ({ user_id, type: TYPE[kind], resource_id: resourceId, message }))))
    return ids.length
  } catch (err) {
    // A failed notice must never undo the approval that triggered it
    await logError('error', `Student notifications failed: ${err instanceof Error ? err.message : String(err)}`, { context: { resourceId, kind } }).catch(() => {})
    return 0
  }
}
