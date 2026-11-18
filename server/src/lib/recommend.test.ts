import { describe, expect, it } from 'vitest'
import { formatFallback, recommend, type Answers, type Candidate } from './recommend.js'

let n = 0
const res = (over: Partial<Candidate>): Candidate => ({
  id: `r${++n}`,
  title: `Resource ${n}`,
  subject: 'python',
  level: 'beginner',
  medium: 'video',
  goals: [],
  created_at: `2026-10-${String(10 + n).padStart(2, '0')}T00:00:00Z`,
  ...over,
})

const answers: Answers = { topic: 'python', level: 'beginner', media: ['video'], goal: 'exam' }

describe('S1-07 exact-match recommendations', () => {
  it('lists exact matches first, then the closest partial matches', () => {
    const exact = res({ title: 'Exact' })
    const wrongLevel = res({ title: 'Wrong level', level: 'intermediate' })
    const result = recommend(answers, [wrongLevel, exact])
    expect(result.exact).toBe(true)
    expect(result.items.map((i) => i.resource.title)).toEqual(['Exact', 'Wrong level'])
    expect(result.items.map((i) => i.exact)).toEqual([true, false])
  })

  it('never recommends another subject', () => {
    const result = recommend(answers, [res({ subject: 'excel' })])
    expect(result.items).toEqual([])
  })

  it('treats no format preference as any format', () => {
    const result = recommend({ ...answers, media: [] }, [res({ medium: 'article' })])
    expect(result.exact).toBe(true)
  })
})

describe('S1-33 goal-sensitive ranking', () => {
  it('ranks resources that serve the goal first', () => {
    const plain = res({ title: 'Plain' })
    const forExam = res({ title: 'For exam', goals: ['exam'] })
    const result = recommend(answers, [plain, forExam])
    expect(result.items.map((i) => i.resource.title)).toEqual(['For exam', 'Plain'])
    expect(result.items[0].reasons).toContain('Fits your goal: Prepare for an exam')
  })

  it('changes order when the goal changes', () => {
    const forExam = res({ title: 'Exam', goals: ['exam'] })
    const forCareer = res({ title: 'Career', goals: ['career'] })
    expect(recommend({ ...answers, goal: 'career' }, [forExam, forCareer]).items[0].resource.title).toBe('Career')
    expect(recommend({ ...answers, goal: 'exam' }, [forExam, forCareer]).items[0].resource.title).toBe('Exam')
  })
})

describe('S1-34 explanations', () => {
  it('explains each matching attribute', () => {
    const [item] = recommend(answers, [res({ goals: ['exam'] })]).items
    expect(item.reasons).toEqual(['Subject: Python', 'Level: Beginner, your level', 'Format: Video', 'Fits your goal: Prepare for an exam'])
    expect(item.gaps).toEqual([])
  })

  it('handles missing metadata the same way every time', () => {
    const result = recommend(answers, [res({ level: null, medium: null })])
    expect(result.exact).toBe(false)
    expect(result.items[0].gaps).toEqual(['Level not tagged', 'Format not tagged'])
    expect(result.items[0].score).toBe(0)
  })
})

describe('S1-35 closest matches', () => {
  it('falls back to closest matches ranked by score', () => {
    const farLevel = res({ title: 'Advanced video', level: 'advanced' })
    const nearLevel = res({ title: 'Intermediate video', level: 'intermediate' })
    const wrongFormat = res({ title: 'Beginner article', medium: 'article' })
    const result = recommend(answers, [farLevel, nearLevel, wrongFormat])
    expect(result.exact).toBe(false)
    expect(result.items.map((i) => i.resource.title)).toEqual(['Beginner article', 'Intermediate video', 'Advanced video'])
  })

  it('breaks ties by newest, then title', () => {
    const older = res({ title: 'B', level: 'intermediate', created_at: '2026-01-01T00:00:00Z' })
    const newer = res({ title: 'C', level: 'intermediate', created_at: '2026-02-01T00:00:00Z' })
    const sameDate = res({ title: 'A', level: 'intermediate', created_at: '2026-02-01T00:00:00Z' })
    expect(recommend(answers, [older, newer, sameDate]).items.map((i) => i.resource.title)).toEqual(['A', 'C', 'B'])
  })

  it('returns nothing for an empty library', () => {
    expect(recommend(answers, [])).toEqual({ exact: false, items: [] })
  })
})

describe('S2-13 configurable rules', () => {
  const base = { id: 'x', title: 'X', subject: 'statistics', level: 'beginner', medium: 'video', goals: [] as string[], created_at: '2026-01-01' }
  const ask = { topic: 'statistics' as const, level: 'beginner' as const, media: ['article' as const], goal: 'exam' as const }

  it('uses the stored weights', () => {
    const levelOnly = { ...base, id: 'level', title: 'Level' }
    const goalOnly = { ...base, id: 'goal', title: 'Goal', level: 'advanced', goals: ['exam'] }
    expect(recommend(ask, [levelOnly, goalOnly]).items[0].resource.id).toBe('level')
    const goalHeavy = { weights: { subject: 3, level: 1, medium: 1, goal: 5 }, requireSubject: true }
    expect(recommend(ask, [levelOnly, goalOnly], 20, goalHeavy).items[0].resource.id).toBe('goal')
  })

  it('lets other subjects in, ranked below, when subject is not required', () => {
    const other = { ...base, id: 'other', title: 'Other', subject: 'excel', level: 'beginner', medium: 'article' }
    const same = { ...base, id: 'same', title: 'Same', medium: 'video' }
    const open = { weights: { subject: 3, level: 2, medium: 1, goal: 1 }, requireSubject: false }
    expect(recommend(ask, [other, same]).items.map((i) => i.resource.id)).toEqual(['same'])
    const result = recommend(ask, [other, same], 20, open)
    expect(result.exact).toBe(false)
    expect(result.items.map((i) => i.resource.id)).toEqual(['same', 'other'])
    expect(result.items[1].gaps).toContain('Subject: Excel, not the one you picked')
  })
})

describe('S2-15 format fallback', () => {
  const published = [
    { subject: 'statistics', medium: 'video' },
    { subject: 'statistics', medium: 'article' },
    { subject: 'excel', medium: 'tool' },
  ]
  it('flags a fallback only when nothing in the subject comes in a picked format', () => {
    expect(formatFallback({ topic: 'statistics', media: ['tool'] }, published)).toBe(true)
    expect(formatFallback({ topic: 'statistics', media: ['tool', 'video'] }, published)).toBe(false)
    expect(formatFallback({ topic: 'statistics', media: [] }, published)).toBe(false)
    expect(formatFallback({ topic: 'python', media: ['tool'] }, published)).toBe(false)
  })
})
