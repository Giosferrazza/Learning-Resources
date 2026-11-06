// S1-17-T01 Shared tagging vocabulary.
// Used by the questionnaire, the resource forms and the server's validation and matching,
// so a value only ever means one thing. Add values here, never inline.

export const subjects = {
  excel: 'Excel',
  statistics: 'Statistics',
  python: 'Python',
  'web-development': 'Web development',
  databases: 'Databases',
  'data-analysis': 'Data analysis',
  business: 'Business',
  design: 'Design',
} as const

export const levels = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
} as const

export const media = {
  video: 'Video',
  article: 'Article',
  tool: 'Tool',
} as const

// S1-33-T01 Learning goals. Each resource lists the goals it serves; a matching goal
// moves it up the ranking but never makes a resource eligible on its own.
export const goals = {
  class: 'Do well in a class',
  exam: 'Prepare for an exam',
  career: 'Build a career skill',
  curiosity: 'Learn for fun',
} as const

export type Subject = keyof typeof subjects
export type Level = keyof typeof levels
export type Medium = keyof typeof media
export type Goal = keyof typeof goals

export const learningRequestMaxLength = 500

// Kinds of external resource that web discovery can return. Each one also carries a
// medium from `media` above, so the format filter covers curated and discovered items alike.
export const discoveryTypes = {
  course: 'Course',
  tutorial: 'Tutorial',
  documentation: 'Documentation',
  practice: 'Practice',
  reference: 'Reference',
  interactive: 'Interactive',
  book: 'Book',
} as const
export type DiscoveryType = keyof typeof discoveryTypes

export const levelOrder: Level[] = ['beginner', 'intermediate', 'advanced']

export const isSubject = (v: unknown): v is Subject => typeof v === 'string' && v in subjects
export const isLevel = (v: unknown): v is Level => typeof v === 'string' && v in levels
export const isMedium = (v: unknown): v is Medium => typeof v === 'string' && v in media
export const isGoal = (v: unknown): v is Goal => typeof v === 'string' && v in goals
