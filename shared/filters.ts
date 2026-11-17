import { isLevel, isMedium, isSubject, type Level, type Medium, type Subject } from './vocabulary.js'

// S2-03 / S2-06 Subject, level and format filters. One definition for the API and the pages,
// so a filter means the same thing everywhere. Empty means "any".
export type Filters = { subject: Subject | ''; level: Level | ''; medium: Medium | '' }
export const noFilters: Filters = { subject: '', level: '', medium: '' }

type Tagged = { subject?: string | null; level?: string | null; medium?: string | null }

// Unknown values are ignored instead of hiding everything
export function parseFilters(source: { get(key: string): string | null | undefined } | Record<string, unknown>): Filters {
  const read = (key: string) => {
    const v = typeof (source as { get?: unknown }).get === 'function' ? (source as { get(k: string): unknown }).get(key) : (source as Record<string, unknown>)[key]
    return typeof v === 'string' ? v : ''
  }
  const subject = read('subject')
  const level = read('level')
  const medium = read('medium')
  return { subject: isSubject(subject) ? subject : '', level: isLevel(level) ? level : '', medium: isMedium(medium) ? medium : '' }
}

// Items without a value for an active filter (e.g. web results have no level) don't match it
export function matchesFilters(item: Tagged, f: Filters) {
  return (!f.subject || item.subject === f.subject) && (!f.level || item.level === f.level) && (!f.medium || item.medium === f.medium)
}

export const activeFilterCount = (f: Filters) => [f.subject, f.level, f.medium].filter(Boolean).length
