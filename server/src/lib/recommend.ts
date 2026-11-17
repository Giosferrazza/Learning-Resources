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
//
// S2-13: the points above are the defaults. Admins can change the weights (and whether the
// subject must match) in Admin > Recommendation rules; `rules` carries the stored values.
// A level one step away earns half the level weight. When subject is not required, every
// published resource is eligible and a matching subject earns the subject weight.

export type Rules = { weights: { subject: number; level: number; medium: number; goal: number }; requireSubject: boolean }
export const defaultRules: Rules = { weights: { subject: 3, level: 2, medium: 1, goal: 1 }, requireSubject: true }

export type Answers = { topic: Subject; level: Level; media: Medium[]; goal: Goal | null; learningRequest?: string | null }

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

export function recommend<T extends Candidate>(answers: Answers, resources: T[], limit = 20, rules: Rules = defaultRules): RecommendationResult<T> {
  const eligible = rules.requireSubject ? resources.filter((r) => r.subject === answers.topic) : resources
  const scored = eligible.map((r) => score(answers, r, rules))
  const exact = scored.filter((s) => s.exact)
  const pool = exact.length ? exact : scored
  pool.sort(compare(answers))
  return { exact: exact.length > 0, items: pool.slice(0, limit) }
}

function score<T extends Candidate>(answers: Answers, r: T, { weights, requireSubject }: Rules): Recommendation<T> {
  const reasons: string[] = []
  const gaps: string[] = []
  let points = 0

  const subjectMatch = r.subject === answers.topic
  if (subjectMatch) {
    reasons.push(`Subject: ${subjects[answers.topic]}`)
    // With a required subject every candidate matches, so the weight would only shift all scores equally
    if (!requireSubject) points += weights.subject
  } else {
    gaps.push(r.subject && r.subject in subjects ? `Subject: ${subjects[r.subject as Subject]}, not the one you picked` : 'Subject not tagged')
  }

  const levelMatch = r.level === answers.level
  if (!r.level || !(r.level in levels)) {
    gaps.push('Level not tagged')
  } else {
    const distance = Math.abs(levelOrder.indexOf(r.level as Level) - levelOrder.indexOf(answers.level))
    const label = levels[r.level as Level]
    if (distance === 0) {
      points += weights.level
      reasons.push(`Level: ${label}, your level`)
    } else if (distance === 1) {
      points += weights.level / 2
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
    points += weights.medium
    reasons.push(`Format: ${media[r.medium as Medium]}`)
  } else {
    gaps.push(`Format: ${media[r.medium as Medium]}, not one you picked`)
  }

  if (answers.goal && r.goals?.includes(answers.goal)) {
    points += weights.goal
    reasons.push(`Fits your goal: ${goals[answers.goal]}`)
  }

  return { resource: r, exact: subjectMatch && levelMatch && mediumMatch, score: points, reasons, gaps }
}

const goalMatch = (answers: Answers, r: Candidate) => (answers.goal && r.goals?.includes(answers.goal) ? 1 : 0)

const compare =
  (answers: Answers) =>
  <T extends Candidate>(a: Recommendation<T>, b: Recommendation<T>) =>
    b.score - a.score ||
    goalMatch(answers, b.resource) - goalMatch(answers, a.resource) ||
    b.resource.created_at.localeCompare(a.resource.created_at) ||
    a.resource.title.localeCompare(b.resource.title)

// S2-15-T03 The student picked formats and nothing published in their subject comes in any of
// them, so every result is a fallback in another format
export function formatFallback(answers: Pick<Answers, 'topic' | 'media'>, published: Pick<Candidate, 'subject' | 'medium'>[]) {
  const inSubject = published.filter((r) => r.subject === answers.topic)
  return answers.media.length > 0 && inSubject.length > 0 && !inSubject.some((r) => r.medium && (answers.media as string[]).includes(r.medium))
}
