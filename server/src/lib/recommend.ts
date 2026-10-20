import { goals, levelOrder, levels, media, subjects, type Goal, type Level, type Medium, type Subject } from '../../../shared/vocabulary.js'

// S1-07 / S1-33 / S1-34 / S1-35 recommendation rules.
//
// Eligible: published resources only (the caller filters, S1-21-T03) whose subject
// equals the chosen topic. A resource with no subject can never match (S1-34-T03).
//
// Exact match (S1-07-T03): same subject, same level, and a format the student picked
// (any format if they picked none). When there is at least one exact match we show
// only exact matches.
//
// Closest matches (S1-35-T01), used only when nothing matches exactly: same subject,
// ranked by score:
//   level   same = 2, one step away = 1, two steps or untagged = 0
//   format  picked (or no preference) = 1, otherwise or untagged = 0
//   goal    resource serves the student's goal = 1
//
// Ties (both lists, S1-33-T03): goal match first, then newest, then title A-Z.
// Untagged level or format never earns points and is called out in the explanation.

export type Answers = { topic: Subject; level: Level; media: Medium[]; goal: Goal | null }

export type Candidate = {
  id: string
  title: string
  subject: string | null
  level: string | null
  medium: string | null
  goals: string[] | null
  created_at: string
}

export type Recommendation<T extends Candidate> = {
  resource: T
  exact: boolean
  score: number
  reasons: string[] // S1-34: why it was recommended
  gaps: string[] // where it differs from what was asked, or is missing metadata
}

export type RecommendationResult<T extends Candidate> = { exact: boolean; items: Recommendation<T>[] }

export function recommend<T extends Candidate>(answers: Answers, resources: T[], limit = 20): RecommendationResult<T> {
  const scored = resources.filter((r) => r.subject === answers.topic).map((r) => score(answers, r))
  const exact = scored.filter((s) => s.exact)
  const pool = exact.length ? exact : scored
  pool.sort(compare(answers))
  return { exact: exact.length > 0, items: pool.slice(0, limit) }
}

function score<T extends Candidate>(answers: Answers, r: T): Recommendation<T> {
  const reasons = [`Subject: ${subjects[answers.topic]}`]
  const gaps: string[] = []
  let points = 0

  const levelMatch = r.level === answers.level
  if (!r.level || !(r.level in levels)) {
    gaps.push('Level not tagged')
  } else {
    const distance = Math.abs(levelOrder.indexOf(r.level as Level) - levelOrder.indexOf(answers.level))
    const label = levels[r.level as Level]
    if (distance === 0) {
      points += 2
      reasons.push(`Level: ${label}, your level`)
    } else if (distance === 1) {
      points += 1
      gaps.push(`Level: ${label}, one step from yours`)
    } else {
      gaps.push(`Level: ${label}`)
    }
  }

  const anyFormat = answers.media.length === 0
  let mediumMatch = false
  if (!r.medium || !(r.medium in media)) {
    gaps.push('Format not tagged')
  } else if (anyFormat || answers.media.includes(r.medium as Medium)) {
    mediumMatch = true
    points += 1
    reasons.push(`Format: ${media[r.medium as Medium]}`)
  } else {
    gaps.push(`Format: ${media[r.medium as Medium]}, not one you picked`)
  }

  if (answers.goal && r.goals?.includes(answers.goal)) {
    points += 1
    reasons.push(`Fits your goal: ${goals[answers.goal]}`)
  }

  return { resource: r, exact: levelMatch && mediumMatch, score: points, reasons, gaps }
}

const goalMatch = (answers: Answers, r: Candidate) => (answers.goal && r.goals?.includes(answers.goal) ? 1 : 0)

const compare =
  (answers: Answers) =>
  <T extends Candidate>(a: Recommendation<T>, b: Recommendation<T>) =>
    b.score - a.score ||
    goalMatch(answers, b.resource) - goalMatch(answers, a.resource) ||
    b.resource.created_at.localeCompare(a.resource.created_at) ||
    a.resource.title.localeCompare(b.resource.title)
