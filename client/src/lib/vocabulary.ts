// S1-17 Tag resources by subject, level and medium
// Level, medium and goal options match David's questionnaire mockup.
// TODO(S1-17-T01): agree on the real vocabulary; the server and questionnaire must use the same values
export const subjects = ['programming', 'data', 'design', 'business'] as const
export const levels = ['beginner', 'intermediate', 'advanced'] as const
export const media = ['video', 'article', 'tool'] as const

// TODO(S1-33-T01): define how each goal affects matching
export const goals = ['class', 'exam', 'career', 'curiosity'] as const
export const goalLabels: Record<(typeof goals)[number], string> = {
  class: 'Do well in a class',
  exam: 'Prepare for an exam',
  career: 'Build a career skill',
  curiosity: 'Learn for fun',
}
