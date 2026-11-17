import { describe, expect, it } from 'vitest'
import { activeFilterCount, matchesFilters, noFilters, parseFilters } from '../../../shared/filters'

describe('S2-03 / S2-06 shared filters', () => {
  it('reads only known values from the URL', () => {
    expect(parseFilters(new URLSearchParams('subject=excel&level=expert&medium=video&x=1'))).toEqual({ subject: 'excel', level: '', medium: 'video' })
    expect(parseFilters({ subject: ['excel'], level: 'beginner' })).toEqual({ subject: '', level: 'beginner', medium: '' })
  })

  it('combines filters, and untagged items fail an active filter', () => {
    const item = { subject: 'excel', level: 'beginner', medium: 'video' }
    expect(matchesFilters(item, noFilters)).toBe(true)
    expect(matchesFilters(item, { subject: 'excel', level: 'beginner', medium: '' })).toBe(true)
    expect(matchesFilters(item, { subject: 'excel', level: 'advanced', medium: '' })).toBe(false)
    expect(matchesFilters({ subject: 'excel', level: null, medium: 'video' }, { subject: '', level: 'beginner', medium: '' })).toBe(false)
    expect(activeFilterCount({ subject: 'excel', level: '', medium: 'video' })).toBe(2)
  })
})
