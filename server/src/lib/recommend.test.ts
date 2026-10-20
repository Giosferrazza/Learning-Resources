import { describe, expect, it } from 'vitest'
import { recommend, type Answers, type Candidate } from './recommend.js'

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
  it('returns only exact matches when any exist', () => {
    const exact = res({ title: 'Exact' })
    const wrongLevel = res({ level: 'intermediate' })
    const result = recommend(answers, [wrongLevel, exact])
    expect(result.exact).toBe(true)
    expect(result.items.map((i) => i.resource.title)).toEqual(['Exact'])
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
